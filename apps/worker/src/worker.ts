import { paymentProcessorAbi, type OrderStatus } from "@chain-checkout/shared";
import { Prisma, PrismaClient } from "@prisma/client";
import { Job, Worker } from "bullmq";
import { Redis } from "ioredis";
import {
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  type Hex
} from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { env } from "./env.js";

type VerifyPaymentJob = {
  orderId: string;
  txHash: string;
};

const redisRetryLimit = 5;
let didLogWorkerConnectionError = false;
let didLogWorkerPublisherError = false;
let didLogWorkerError = false;

const prisma = new PrismaClient();
const redisOptions = {
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    if (times > redisRetryLimit) return null;
    return Math.min(times * 500, 2_000);
  }
};
const connection = new Redis(env.REDIS_URL, redisOptions);
const publisher = new Redis(env.REDIS_URL, {
  retryStrategy(times) {
    if (times > redisRetryLimit) return null;
    return Math.min(times * 500, 2_000);
  }
});

connection.on("error", (error) => {
  if (didLogWorkerConnectionError) return;
  didLogWorkerConnectionError = true;
  console.error(
    `Redis worker connection error at ${env.REDIS_URL}. Payment worker is waiting for Redis to become available.`,
    error
  );
});
publisher.on("error", (error) => {
  if (didLogWorkerPublisherError) return;
  didLogWorkerPublisherError = true;
  console.error(
    `Redis worker publisher error at ${env.REDIS_URL}. Realtime payment updates may be unavailable.`,
    error
  );
});

const chain = env.CHAIN_ID === baseSepolia.id ? baseSepolia : sepolia;
const client = createPublicClient({ chain, transport: http(env.RPC_URL) });

const terminalStatuses = new Set([
  "paid",
  "failed",
  "expired",
  "underpaid",
  "wrong_network",
  "wrong_token",
  "duplicate_transaction",
  "cancelled"
]);

const worker = new Worker<VerifyPaymentJob>(
  "payments",
  async (job) => verifyPayment(job),
  { connection, concurrency: 4 }
);

worker.on("error", (error) => {
  if (didLogWorkerError) return;
  didLogWorkerError = true;
  console.error(
    "Payment worker is unavailable until Redis is available.",
    error
  );
});

console.log("ChainCheckout worker listening for payment jobs");

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, shutting down worker`);

  try {
    await Promise.allSettled([
      worker.close(),
      publisher.quit(),
      connection.quit(),
      prisma.$disconnect()
    ]);
    process.exit(0);
  } catch (error) {
    console.error("Worker shutdown failed", error);
    process.exit(1);
  }
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

async function verifyPayment(job: Job<VerifyPaymentJob>) {
  const { orderId, txHash } = job.data;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true, user: true }
  });
  if (!order) return;
  if (terminalStatuses.has(order.status)) return;

  await audit(order.id, "PAYMENT_VERIFICATION_STARTED", { txHash, attempt: job.attemptsMade + 1 });

  const receipt = await client.getTransactionReceipt({ hash: txHash as Hex }).catch(() => null);
  if (!receipt) throw new Error(`Transaction receipt not available yet: ${txHash}`);

  if (receipt.status !== "success") {
    await reject(order.id, order.status as OrderStatus, "failed", { reason: "TX_REVERTED", txHash });
    return;
  }

  if (order.expectedChainId !== env.CHAIN_ID) {
    await reject(order.id, order.status as OrderStatus, "wrong_network", { expected: order.expectedChainId, actual: env.CHAIN_ID });
    return;
  }

  const latestBlock = await client.getBlockNumber();
  const confirmations = Number(latestBlock - receipt.blockNumber + 1n);
  if (confirmations < env.REQUIRED_CONFIRMATIONS) {
    await markConfirming(order.id, order.status as OrderStatus, confirmations);
    throw new Error(`Waiting for confirmations: ${confirmations}/${env.REQUIRED_CONFIRMATIONS}`);
  }

  const event = receipt.logs
    .filter((log) => log.address.toLowerCase() === env.PAYMENT_CONTRACT_ADDRESS.toLowerCase())
    .map((log) => {
      try {
        return decodeEventLog({
          abi: paymentProcessorAbi,
          data: log.data,
          topics: log.topics
        });
      } catch {
        return null;
      }
    })
    .find((decoded) => decoded?.eventName === "PaymentReceived");

  if (!event || event.eventName !== "PaymentReceived") {
    await reject(order.id, order.status as OrderStatus, "failed", { reason: "PAYMENT_EVENT_NOT_FOUND", txHash });
    return;
  }

  const args = event.args;
  if (args.orderId.toLowerCase() !== order.onChainOrderId.toLowerCase()) {
    await reject(order.id, order.status as OrderStatus, "failed", { reason: "ORDER_ID_MISMATCH", txHash });
    return;
  }
  if (getAddress(args.payer).toLowerCase() !== order.expectedPayerAddress.toLowerCase()) {
    await reject(order.id, order.status as OrderStatus, "failed", { reason: "PAYER_MISMATCH", txHash });
    return;
  }
  if (getAddress(args.token).toLowerCase() !== order.expectedTokenAddress.toLowerCase()) {
    await reject(order.id, order.status as OrderStatus, "wrong_token", { txHash });
    return;
  }
  if (args.amount < BigInt(order.expectedAmount)) {
    await reject(order.id, order.status as OrderStatus, "underpaid", { paid: args.amount.toString(), expected: order.expectedAmount });
    return;
  }

  const payment = await prisma.payment.upsert({
    where: { txHash: txHash.toLowerCase() },
    create: {
      orderId: order.id,
      txHash: txHash.toLowerCase(),
      payerAddress: getAddress(args.payer).toLowerCase(),
      tokenAddress: getAddress(args.token).toLowerCase(),
      amount: args.amount.toString(),
      chainId: env.CHAIN_ID,
      blockNumber: receipt.blockNumber,
      confirmations,
      status: "confirmed"
    },
    update: {
      confirmations,
      status: "confirmed"
    }
  });

  await prisma.entitlement.upsert({
    where: { userId_productId: { userId: order.userId, productId: order.productId } },
    create: { userId: order.userId, productId: order.productId, orderId: order.id },
    update: { revokedAt: null }
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "paid" }
  });
  await audit(order.id, "PAYMENT_VERIFIED", { txHash, paymentId: payment.id, confirmations }, payment.id);
  await publish({ type: "payment_confirmed", orderId: order.id, status: "paid", confirmations, requiredConfirmations: env.REQUIRED_CONFIRMATIONS });
}

async function markConfirming(orderId: string, from: OrderStatus, confirmations: number) {
  if (from !== "confirming") {
    await prisma.order.update({ where: { id: orderId }, data: { status: "confirming" } });
  }
  await audit(orderId, "CONFIRMATION_UPDATED", { confirmations, requiredConfirmations: env.REQUIRED_CONFIRMATIONS });
  await publish({ type: "confirmation_updated", orderId, status: "confirming", confirmations, requiredConfirmations: env.REQUIRED_CONFIRMATIONS });
}

async function reject(orderId: string, _from: OrderStatus, to: OrderStatus, payload: Prisma.InputJsonObject) {
  await prisma.order.update({ where: { id: orderId }, data: { status: to } });
  await audit(orderId, "PAYMENT_FAILED", { status: to, ...payload });
  await publish({ type: "payment_failed", orderId, status: to, message: String(payload.reason ?? to) });
}

async function audit(orderId: string, type: string, payloadJson: Prisma.InputJsonObject, paymentId?: string) {
  await prisma.paymentEvent.create({ data: { orderId, type, payloadJson, paymentId } });
}

async function publish(payload: Record<string, unknown>) {
  await publisher.publish("order-events", JSON.stringify(payload));
}
