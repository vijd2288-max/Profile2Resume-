import { describe, expect, it } from "vitest";
import { supportStatusForEvidence } from "../src/server/claim-service.js";

describe("claim support mapping", () => {
  it("distinguishes unsupported, partial, direct, and confirmed claims", () => {
    expect(supportStatusForEvidence(0, false)).toBe("unsupported");
    expect(supportStatusForEvidence(1, false)).toBe("partially_supported");
    expect(supportStatusForEvidence(2, false)).toBe("directly_supported");
    expect(supportStatusForEvidence(1, true)).toBe("user_confirmed");
  });
});
