import type { NextFunction, Request, Response } from "express";

export function parseTextJson(request: Request, _response: Response, next: NextFunction) {
  if (typeof request.body !== "string") return next();

  const body = request.body.trim();
  if (!body) {
    request.body = {};
    return next();
  }

  try {
    request.body = JSON.parse(body);
    return next();
  } catch {
    return next();
  }
}
