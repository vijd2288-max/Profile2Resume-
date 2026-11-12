import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError, toApiFailure, validate, success } from "../src/server/api.js";
import { User } from "../src/server/models.js";

describe("API infrastructure", () => {
  it("creates a consistent success envelope", () => {
    expect(success({ status: "ready" }, { requestId: "req-1" })).toEqual({
      ok: true,
      data: { status: "ready" },
      meta: { requestId: "req-1" },
    });
  });

  it("returns safe messages for unknown failures", () => {
    expect(toApiFailure(new Error("database password"))).toEqual({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });
  });

  it("turns schema failures into validation errors", () => {
    expect(() => validate(z.object({ name: z.string() }), { name: 42 })).toThrow(ApiError);
  });

  it("normalizes database validation and duplicate-key failures", async () => {
    const invalidUser = new User({ email: "not-an-email", authProvider: "github" });
    const validationError = invalidUser.validateSync();

    expect(toApiFailure(validationError)).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "The request could not be validated",
        details: { fields: ["email"] },
      },
    });
    expect(toApiFailure({ code: 11000, keyValue: { email: "private@example.test" } })).toEqual({
      ok: false,
      error: {
        code: "RESOURCE_CONFLICT",
        message: "A record with the same unique value already exists",
      },
    });
  });
});
