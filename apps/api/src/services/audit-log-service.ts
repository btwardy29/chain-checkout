import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export async function auditOrderEvent(
  orderId: string,
  type: string,
  payloadJson: Prisma.InputJsonObject,
  paymentId?: string
) {
  await prisma.paymentEvent.create({
    data: { orderId, type, payloadJson, paymentId }
  });
}
