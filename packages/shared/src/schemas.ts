import { z } from "zod";

export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Expected EVM address");

export const txHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Expected transaction hash");

export const createOrderSchema = z.object({
  productId: z.string().min(1),
  walletAddress: addressSchema
});

export const submitTransactionSchema = z.object({
  txHash: txHashSchema
});

export const verifyAuthSchema = z.object({
  address: addressSchema,
  message: z.string().min(1),
  signature: z.string().min(1)
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type SubmitTransactionInput = z.infer<typeof submitTransactionSchema>;
export type VerifyAuthInput = z.infer<typeof verifyAuthSchema>;
