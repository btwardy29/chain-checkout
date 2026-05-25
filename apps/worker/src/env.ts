import "dotenv/config";
import { z } from "zod";

export const env = z
  .object({
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().default("redis://localhost:6379"),
    RPC_URL: z.string().url(),
    CHAIN_ID: z.coerce.number().int().default(84532),
    PAYMENT_CONTRACT_ADDRESS: z.string(),
    ACCEPTED_TOKEN_ADDRESS: z.string(),
    REQUIRED_CONFIRMATIONS: z.coerce.number().int().positive().default(1)
  })
  .parse(process.env);
