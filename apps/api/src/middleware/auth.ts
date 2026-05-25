import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { forbidden } from "../lib/errors.js";

export type AuthUser = {
  id: string;
  walletAddress: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signSession(user: AuthUser) {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: "7d" });
}

export function optionalAuth(request: Request, _response: Response, next: NextFunction) {
  const token = request.cookies.session ?? request.header("authorization")?.replace(/^Bearer /i, "");
  if (!token) return next();

  try {
    request.user = jwt.verify(token, env.JWT_SECRET) as AuthUser;
  } catch {
    request.user = undefined;
  }
  return next();
}

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  if (!request.user) return next(forbidden("Authentication required"));
  return next();
}
