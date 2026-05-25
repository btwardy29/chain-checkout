import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../lib/errors.js";

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
) {
  if (error instanceof ZodError) {
    return response.status(400).json({
      error: "validation_error",
      issues: error.flatten()
    });
  }

  if (error instanceof ApiError) {
    return response.status(error.statusCode).json({
      error: error.code,
      message: error.message
    });
  }

  console.error(error);
  return response.status(500).json({
    error: "internal_server_error",
    message: "Unexpected server error"
  });
}
