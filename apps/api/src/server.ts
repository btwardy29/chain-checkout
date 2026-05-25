import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { paymentQueue, redisConnection } from "./lib/queue.js";
import { optionalAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { parseTextJson } from "./middleware/text-json.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { ordersRouter } from "./routes/orders.js";
import { productsRouter } from "./routes/products.js";
import { purchasesRouter } from "./routes/purchases.js";
import { sseService } from "./services/sse-service.js";

const app = express();

app.set("json replacer", (_key: string, value: unknown) => {
  if (typeof value === "bigint") return value.toString();
  return value;
});

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.text({ type: ["text/plain", "text/*"] }));
app.use(parseTextJson);
app.use(cookieParser());
app.use(optionalAuth);

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/me/purchases", purchasesRouter);
app.use("/api/admin", adminRouter);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(`ChainCheckout API listening on http://localhost:${env.PORT}`);
});

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, shutting down API`);

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    await Promise.allSettled([
      sseService.close(),
      paymentQueue.close(),
      redisConnection.quit(),
      prisma.$disconnect()
    ]);
    process.exit(0);
  } catch (error) {
    console.error("API shutdown failed", error);
    process.exit(1);
  }
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
