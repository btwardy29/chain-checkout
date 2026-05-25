import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const purchasesRouter = Router();

purchasesRouter.get("/", requireAuth, async (request, response, next) => {
  try {
    const purchases = await prisma.entitlement.findMany({
      where: { userId: request.user!.id, revokedAt: null },
      include: { product: true, order: true },
      orderBy: { grantedAt: "desc" }
    });
    response.json(
      purchases.map((purchase) => ({
        productId: purchase.productId,
        productName: purchase.product.name,
        productSlug: purchase.product.slug,
        accessUrl: purchase.product.accessUrl,
        purchasedAt: purchase.grantedAt.toISOString(),
        orderId: purchase.orderId
      }))
    );
  } catch (error) {
    next(error);
  }
});
