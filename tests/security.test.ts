import { describe, expect, it, beforeEach } from "vitest";
import type { ApiError } from "../src/server/api.js";
import { clearRateLimitBuckets, rateLimit } from "../src/server/security.js";

describe("HTTP security controls", () => {
  beforeEach(() => clearRateLimitBuckets());

  it("limits sensitive operations separately", () => {
    const source = { RATE_LIMIT_WINDOW_MS: "60000", RATE_LIMIT_SENSITIVE_MAX_REQUESTS: "2" };
    const request = { headers: {}, socket: { remoteAddress: "test-client" } } as never;
    rateLimit(request, "/api/resumes/id/export/pdf", source);
    rateLimit(request, "/api/resumes/id/export/pdf", source);
    expect(() => rateLimit(request, "/api/resumes/id/export/pdf", source)).toThrowError(
      expect.objectContaining({ code: "RATE_LIMITED" } satisfies Partial<ApiError>),
    );
  });
});
