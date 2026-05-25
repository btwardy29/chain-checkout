import { prisma } from "../db/prisma.js";
import { notFound } from "../lib/errors.js";

export async function listProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" }
  });
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product || !product.isActive) throw notFound("Product not found");
  return product;
}
