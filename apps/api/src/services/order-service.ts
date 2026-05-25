import type { OrderStatus } from "@chain-checkout/shared";
import { canTransitionOrder } from "@chain-checkout/shared";
import { Prisma } from "@prisma/client";
import { encodePacked, keccak256 } from "viem";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { paymentQueue } from "../lib/queue.js";
import { auditOrderEvent } from "./audit-log-service.js";
import { sseService } from "./sse-service.js";

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

function formatDisplayAmount(amount: string, decimals: number) {
  const value = BigInt(amount);
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}

function onChainOrderId(orderId: string, walletAddress: string) {
  return keccak256(encodePacked(["string", "address"], [orderId, walletAddress as `0x${string}`]));
}

export async function createOrder(input: {
  productId: string;
  walletAddress: string;
  userId: string;
  idempotencyKey?: string;
}) {
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product || !product.isActive) throw notFound("Product not found");

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw forbidden("User session is invalid");
  if (normalizeAddress(user.walletAddress) !== normalizeAddress(input.walletAddress)) {
    throw forbidden("Order wallet must match authenticated wallet");
  }

  if (input.idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { userId_idempotencyKey: { userId: user.id, idempotencyKey: input.idempotencyKey } },
      include: { product: true }
    });
    if (existing) return serializeOrderDetails(existing);
  }

  const expiresAt = new Date(Date.now() + env.ORDER_EXPIRATION_MINUTES * 60_000);
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      productId: product.id,
      status: "awaiting_payment",
      expectedAmount: product.priceAmount,
      expectedTokenAddress: normalizeAddress(product.tokenAddress),
      expectedChainId: product.chainId,
      expectedPayerAddress: normalizeAddress(input.walletAddress),
      paymentContractAddress: normalizeAddress(env.PAYMENT_CONTRACT_ADDRESS),
      onChainOrderId: "0x0000000000000000000000000000000000000000000000000000000000000000",
      idempotencyKey: input.idempotencyKey,
      expiresAt
    },
    include: { product: true }
  });

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { onChainOrderId: onChainOrderId(order.id, input.walletAddress) },
    include: { product: true }
  });

  await auditOrderEvent(updated.id, "ORDER_CREATED", { status: updated.status });
  sseService.publish({ type: "order_created", orderId: updated.id, status: updated.status });
  return serializeOrderDetails(updated);
}

export async function getOrderForUser(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true, payment: true, entitlement: true }
  });
  if (!order) throw notFound("Order not found");
  if (order.userId !== userId) throw forbidden("You do not own this order");
  return serializeOrderDetails(order);
}

export async function submitTransaction(orderId: string, userId: string, txHash: string) {
  const normalizedTxHash = txHash.toLowerCase();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order not found");
  if (order.userId !== userId) throw forbidden("You do not own this order");

  if (order.txHash?.toLowerCase() === normalizedTxHash) {
    const queued = await enqueuePaymentVerification(order.id, normalizedTxHash);
    return { orderId: order.id, status: order.status, queued };
  }

  if (order.txHash && order.txHash.toLowerCase() !== normalizedTxHash) {
    throw badRequest("Order already has a different transaction hash", "transaction_already_submitted");
  }

  if (order.expiresAt < new Date()) {
    if (canTransitionOrder(order.status as OrderStatus, "expired")) {
      await transitionOrder(order.id, order.status as OrderStatus, "expired", { reason: "ORDER_EXPIRED" });
    }
    throw badRequest("Order has expired", "order_expired");
  }
  if (!canTransitionOrder(order.status as OrderStatus, "transaction_submitted")) {
    throw badRequest(
      `Cannot submit a transaction while order is ${order.status}`,
      "invalid_order_state"
    );
  }

  try {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        txHash: normalizedTxHash,
        status: "transaction_submitted"
      }
    });
    await auditOrderEvent(order.id, "TX_SUBMITTED", { txHash });
    const queued = await enqueuePaymentVerification(order.id, normalizedTxHash);
    sseService.publish({ type: "transaction_submitted", orderId: order.id, status: updated.status });
    return { orderId: updated.id, status: updated.status, queued };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      await transitionOrder(order.id, order.status as OrderStatus, "duplicate_transaction", { txHash });
      throw badRequest("Transaction hash is already used", "duplicate_transaction");
    }
    throw error;
  }
}

export async function transitionOrder(
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  payload: Prisma.InputJsonObject = {}
) {
  if (!canTransitionOrder(from, to)) {
    throw badRequest(`Invalid order transition: ${from} -> ${to}`, "invalid_order_transition");
  }
  const result = await prisma.order.updateMany({
    where: { id: orderId, status: from },
    data: { status: to }
  });
  if (result.count !== 1) throw badRequest(`Order is no longer in ${from}`, "invalid_order_state");
  await auditOrderEvent(orderId, `ORDER_${to.toUpperCase()}`, payload);
  sseService.publish({ type: statusToEvent(to), orderId, status: to });
  return prisma.order.findUniqueOrThrow({ where: { id: orderId } });
}

async function enqueuePaymentVerification(orderId: string, txHash: string) {
  try {
    await paymentQueue.add("verify-payment", { orderId, txHash }, { jobId: `verify-${txHash}` });
    return true;
  } catch (error) {
    console.error("Failed to enqueue payment verification job", error);
    await auditOrderEvent(orderId, "TX_VERIFICATION_QUEUE_FAILED", {
      txHash,
      message: error instanceof Error ? error.message : "Unknown queue error"
    });
    return false;
  }
}

function statusToEvent(status: OrderStatus) {
  if (status === "paid") return "payment_confirmed";
  if (status === "expired") return "order_expired";
  if (status === "confirming") return "confirmation_updated";
  if (status === "transaction_submitted") return "transaction_submitted";
  return "payment_failed";
}

export function serializeOrderDetails(order: {
  id: string;
  onChainOrderId: string;
  productId: string;
  status: string;
  expectedAmount: string;
  expectedTokenAddress: string;
  expectedChainId: number;
  paymentContractAddress: string;
  expiresAt: Date;
  txHash?: string | null;
  product: { priceDecimals: number; tokenSymbol: string; slug?: string; name?: string };
  payment?: unknown;
  entitlement?: unknown;
}) {
  return {
    orderId: order.id,
    onChainOrderId: order.onChainOrderId,
    productId: order.productId,
    status: order.status,
    amount: order.expectedAmount,
    displayAmount: formatDisplayAmount(order.expectedAmount, order.product.priceDecimals),
    tokenAddress: order.expectedTokenAddress,
    tokenSymbol: order.product.tokenSymbol,
    chainId: order.expectedChainId,
    paymentContractAddress: order.paymentContractAddress,
    expiresAt: order.expiresAt.toISOString(),
    txHash: order.txHash,
    product: order.product,
    payment: order.payment,
    entitlement: order.entitlement
  };
}
