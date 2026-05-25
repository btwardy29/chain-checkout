import type { Response } from "express";
import { Redis } from "ioredis";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";

export type OrderEventPayload = {
  type: string;
  orderId: string;
  status?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  message?: string;
};

const redisRetryLimit = 5;

function redisRetryStrategy(times: number) {
  if (times > redisRetryLimit) return null;
  return Math.min(times * 500, 2_000);
}

class SseService {
  private clients = new Map<string, Set<Response>>();
  private publisher = new Redis(env.REDIS_URL, { retryStrategy: redisRetryStrategy });
  private subscriber = new Redis(env.REDIS_URL, { retryStrategy: redisRetryStrategy });
  private instanceId = nanoid();
  private didLogPublisherError = false;
  private didLogSubscriberError = false;
  private didLogSubscribeError = false;

  constructor() {
    this.publisher.on("error", (error) => {
      if (this.didLogPublisherError) return;
      this.didLogPublisherError = true;
      console.error(
        `Redis SSE publisher error at ${env.REDIS_URL}. Local SSE updates still work, cross-process updates are unavailable.`,
        error
      );
    });
    this.subscriber.on("error", (error) => {
      if (this.didLogSubscriberError) return;
      this.didLogSubscriberError = true;
      console.error(
        `Redis SSE subscriber error at ${env.REDIS_URL}. Cross-process SSE updates are unavailable.`,
        error
      );
    });
    this.subscriber.subscribe("order-events").catch((error) => {
      if (this.didLogSubscribeError) return;
      this.didLogSubscribeError = true;
      console.error("Redis SSE subscription failed", error);
    });
    this.subscriber.on("message", (_channel: string, raw: string) => {
      const payload = JSON.parse(raw) as OrderEventPayload & { source?: string };
      if (payload.source === this.instanceId) return;
      this.emitLocal(payload);
    });
  }

  subscribe(orderId: string, response: Response) {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    response.write(`event: connected\ndata: ${JSON.stringify({ orderId })}\n\n`);

    const clients = this.clients.get(orderId) ?? new Set<Response>();
    clients.add(response);
    this.clients.set(orderId, clients);

    response.on("close", () => {
      clients.delete(response);
      if (clients.size === 0) this.clients.delete(orderId);
    });
  }

  publish(payload: OrderEventPayload) {
    this.emitLocal(payload);
    this.publisher
      .publish("order-events", JSON.stringify({ ...payload, source: this.instanceId }))
      .catch(console.error);
  }

  private emitLocal(payload: OrderEventPayload) {
    const clients = this.clients.get(payload.orderId);
    if (!clients) return;
    const eventName = payload.type;
    const event = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of clients) client.write(event);
  }

  async close() {
    for (const clients of this.clients.values()) {
      for (const client of clients) client.end();
    }
    this.clients.clear();
    await Promise.allSettled([this.publisher.quit(), this.subscriber.quit()]);
  }
}

export const sseService = new SseService();
