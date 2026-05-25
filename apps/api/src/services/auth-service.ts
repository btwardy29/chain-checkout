import { generateNonce, SiweMessage } from "siwe";
import { prisma } from "../db/prisma.js";
import { badRequest } from "../lib/errors.js";

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

export async function createNonce(address: string) {
  const walletAddress = normalizeAddress(address);
  await prisma.user.upsert({
    where: { walletAddress },
    create: { walletAddress },
    update: {}
  });

  const nonce = generateNonce();
  await prisma.authNonce.create({
    data: {
      walletAddress,
      nonce,
      expiresAt: new Date(Date.now() + 10 * 60_000)
    }
  });
  return nonce;
}

export async function verifySiweMessage(input: {
  address: string;
  message: string;
  signature: string;
}) {
  const siwe = new SiweMessage(input.message);
  const nonceRecord = await prisma.authNonce.findUnique({ where: { nonce: siwe.nonce } });
  if (!nonceRecord || nonceRecord.usedAt || nonceRecord.expiresAt < new Date()) {
    throw badRequest("Nonce is invalid or expired", "invalid_nonce");
  }

  const result = await siwe.verify({ signature: input.signature });
  if (!result.success || normalizeAddress(result.data.address) !== normalizeAddress(input.address)) {
    throw badRequest("Signature verification failed", "invalid_signature");
  }

  await prisma.authNonce.update({
    where: { nonce: siwe.nonce },
    data: { usedAt: new Date() }
  });

  return prisma.user.upsert({
    where: { walletAddress: normalizeAddress(input.address) },
    create: { walletAddress: normalizeAddress(input.address) },
    update: {}
  });
}
