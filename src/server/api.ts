import mongoose from "mongoose";
import { z, type ZodType } from "zod";

export type ApiMeta = {
  requestId?: string;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: ApiMeta;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: ApiMeta;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends ApiError {
  constructor(message = "The request could not be validated", details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
    this.name = "ValidationError";
  }
}

export function success<T>(data: T, meta?: ApiMeta): ApiSuccess<T> {
  return meta ? { ok: true, data, meta } : { ok: true, data };
}

export function failure(error: ApiError, meta?: ApiMeta): ApiFailure {
  const response: ApiFailure = {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
    },
  };

  if (error.details !== undefined) {
    response.error.details = error.details;
  }
  if (meta) {
    response.meta = meta;
  }

  return response;
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof z.ZodError) {
    return new ValidationError("The request could not be validated", error.flatten());
  }
  if (error instanceof mongoose.Error.ValidationError) {
    return new ValidationError("The request could not be validated", {
      fields: Object.keys(error.errors),
    });
  }
  if (error instanceof mongoose.Error.CastError) {
    return new ValidationError("The request could not be validated", { fields: [error.path] });
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
    return new ApiError(
      409,
      "RESOURCE_CONFLICT",
      "A record with the same unique value already exists",
    );
  }

  return new ApiError(500, "INTERNAL_ERROR", "An unexpected error occurred");
}

export function toApiFailure(error: unknown, meta?: ApiMeta): ApiFailure {
  return failure(normalizeApiError(error), meta);
}

export function validate<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("The request could not be validated", result.error.flatten());
  }
  return result.data;
}
