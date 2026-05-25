import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { paymentQueue } from "../lib/queue.js";
import { requireAuth } from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);

adminRouter.get("/orders", async (request, response, next) => {
  try {
    const status = typeof request.query.status === "string" ? request.query.status : undefined;
    const orders = await prisma.order.findMany({
      where: status ? { status: status as never } : undefined,
      include: { product: true, user: true, payment: true, entitlement: true },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    response.json(orders);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/products", async (_request, response, next) => {
  try {
    response.json(await prisma.product.findMany({ orderBy: { createdAt: "asc" } }));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/orders/:orderId/resync", async (request, response, next) => {
  try {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: request.params.orderId } });
    if (order.txHash) {
      await paymentQueue.add("verify-payment", { orderId: order.id, txHash: order.txHash });
    }
    response.json({ queued: Boolean(order.txHash) });
  } catch (error) {
    next(error);
  }
});
