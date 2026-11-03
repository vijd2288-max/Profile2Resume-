import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError, toApiFailure, validate, success } from "../src/server/api.js";

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
});
