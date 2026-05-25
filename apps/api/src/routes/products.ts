import { Router } from "express";
import { getProductBySlug, listProducts } from "../services/product-service.js";

export const productsRouter = Router();

productsRouter.get("/", async (_request, response, next) => {
  try {
    response.json(await listProducts());
  } catch (error) {
    next(error);
  }
});

productsRouter.get("/:slug", async (request, response, next) => {
  try {
    response.json(await getProductBySlug(request.params.slug));
  } catch (error) {
    next(error);
  }
});
