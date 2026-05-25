import { Router } from "express";
import { z } from "zod";
import { verifyAuthSchema } from "@chain-checkout/shared";
import { createNonce, verifySiweMessage } from "../services/auth-service.js";
import { signSession } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.get("/nonce", async (request, response, next) => {
  try {
    const { address } = z.object({ address: z.string() }).parse(request.query);
    const nonce = await createNonce(address);
    response.json({ nonce });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/verify", async (request, response, next) => {
  try {
    const input = verifyAuthSchema.parse(request.body);
    const user = await verifySiweMessage(input);
    const token = signSession({ id: user.id, walletAddress: user.walletAddress });
    response.cookie("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    response.json({ token, user: { id: user.id, walletAddress: user.walletAddress } });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", (_request, response) => {
  response.clearCookie("session");
  response.status(204).send();
});

authRouter.get("/me", (request, response) => {
  response.json({ user: request.user ?? null });
});
