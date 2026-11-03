import { describe, expect, it } from "vitest";
import { assertUserOwnership, requireAuthenticatedUser } from "../src/server/access.js";
import { createSessionCookie } from "../src/server/auth.js";

describe("access control", () => {
  const secret = "a".repeat(32);

  it("rejects missing and invalid sessions", () => {
    expect(() => requireAuthenticatedUser(undefined, secret)).toThrowError(
      expect.objectContaining({ status: 401, code: "AUTHENTICATION_REQUIRED" }),
    );
    expect(() => requireAuthenticatedUser("session=invalid", secret)).toThrowError(
      expect.objectContaining({ status: 401 }),
    );
  });

  it("accepts a valid session and enforces ownership", () => {
    const cookie = createSessionCookie("user-1", secret);
    expect(requireAuthenticatedUser(cookie, secret)).toBe("user-1");
    expect(() => assertUserOwnership("user-1", "user-2")).toThrowError(
      expect.objectContaining({ status: 403, code: "FORBIDDEN" }),
    );
    expect(() => assertUserOwnership("user-1", "user-1")).not.toThrow();
  });
});
