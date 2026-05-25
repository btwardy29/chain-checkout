import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config/env.js";

export type VerifyPaymentJob = {
  orderId: string;
  txHash: string;
};

const redisRetryLimit = 5;
let didLogRedisError = false;
let didLogQueueError = false;

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > redisRetryLimit) return null;
    return Math.min(times * 500, 2_000);
  }
});

redisConnection.on("error", (error) => {
  if (didLogRedisError) return;
  didLogRedisError = true;
  console.error(
    `Redis queue connection error at ${env.REDIS_URL}. Payment verification jobs will not be queued until Redis is available.`,
    error
  );
});

export const paymentQueue = new Queue<VerifyPaymentJob>("payments", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 8,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: 100,
    removeOnFail: 200
  }
});

paymentQueue.on("error", (error) => {
  if (didLogQueueError) return;
  didLogQueueError = true;
  console.error(
    "Payment queue is unavailable. Jobs will fail to enqueue until Redis is available.",
    error
  );
});
