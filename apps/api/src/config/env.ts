import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(12).default("development-secret-change-me"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  RPC_URL: z.string().url().default("https://sepolia.base.org"),
  CHAIN_ID: z.coerce.number().int().default(84532),
  PAYMENT_CONTRACT_ADDRESS: z.string().default("0x0000000000000000000000000000000000000000"),
  ACCEPTED_TOKEN_ADDRESS: z.string().default("0x0000000000000000000000000000000000000000"),
  REQUIRED_CONFIRMATIONS: z.coerce.number().int().positive().default(1),
  ORDER_EXPIRATION_MINUTES: z.coerce.number().int().positive().default(15),
  PORT: z.coerce.number().int().default(4000)
});

export const env = envSchema.parse(process.env);
