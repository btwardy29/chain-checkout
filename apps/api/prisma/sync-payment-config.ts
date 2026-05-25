import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const chainId = Number(process.env.CHAIN_ID ?? 84532);
const tokenAddress = process.env.ACCEPTED_TOKEN_ADDRESS;
const paymentContractAddress = process.env.PAYMENT_CONTRACT_ADDRESS;

if (!tokenAddress || !paymentContractAddress) {
  throw new Error("ACCEPTED_TOKEN_ADDRESS and PAYMENT_CONTRACT_ADDRESS must be set");
}

const products = await prisma.product.updateMany({
  data: {
    tokenAddress,
    chainId
  }
});

const orders = await prisma.order.updateMany({
  where: {
    txHash: null,
    status: {
      in: ["created", "awaiting_payment"]
    }
  },
  data: {
    expectedTokenAddress: tokenAddress.toLowerCase(),
    expectedChainId: chainId,
    paymentContractAddress: paymentContractAddress.toLowerCase()
  }
});

console.log(`Updated ${products.count} products`);
console.log(`Updated ${orders.count} open orders`);

await prisma.$disconnect();
