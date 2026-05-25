import { createOrderSchema, submitTransactionSchema } from "@chain-checkout/shared";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createOrder, getOrderForUser, submitTransaction } from "../services/order-service.js";
import { sseService } from "../services/sse-service.js";

export const ordersRouter = Router();

ordersRouter.post("/", requireAuth, async (request, response, next) => {
  try {
    const input = createOrderSchema.parse(request.body);
    const order = await createOrder({
      ...input,
      userId: request.user!.id,
      idempotencyKey: request.header("idempotency-key") ?? undefined
    });
    response.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

ordersRouter.get("/:orderId", requireAuth, async (request, response, next) => {
  try {
    response.json(await getOrderForUser(String(request.params.orderId), request.user!.id));
  } catch (error) {
    next(error);
  }
});

ordersRouter.post("/:orderId/submit-transaction", requireAuth, async (request, response, next) => {
  try {
    const input = submitTransactionSchema.parse(request.body);
    response.json(await submitTransaction(String(request.params.orderId), request.user!.id, input.txHash));
  } catch (error) {
    next(error);
  }
});

ordersRouter.get("/:orderId/events", requireAuth, async (request, response) => {
  sseService.subscribe(String(request.params.orderId), response);
});
