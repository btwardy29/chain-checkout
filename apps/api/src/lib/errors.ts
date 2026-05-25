export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = "api_error"
  ) {
    super(message);
  }
}

export function notFound(message = "Not found") {
  return new ApiError(404, message, "not_found");
}

export function forbidden(message = "Forbidden") {
  return new ApiError(403, message, "forbidden");
}

export function badRequest(message: string, code = "bad_request") {
  return new ApiError(400, message, code);
}
