import { describe, expect, it } from "vitest";
import { Evidence } from "../src/server/evidence-models.js";

describe("evidence registry", () => {
  it("requires ownership, source, and preserves pending verification", () => {
    const invalid = new Evidence({
      evidenceType: "github_repository",
      sourcePlatform: "github",
      sourceReference: "repo:1",
      description: "Repository metadata",
      collectedAt: new Date(),
    });
    expect(invalid.validateSync()?.errors.userId).toBeDefined();
    const valid = new Evidence({
      userId: "507f1f77bcf86cd799439011",
      evidenceType: "github_repository",
      sourcePlatform: "github",
      sourceReference: "repo:1",
      description: "Repository metadata",
      collectedAt: new Date(),
    });
    expect(valid.validateSync()).toBeUndefined();
    expect(valid.verificationStatus).toBe("pending_review");
  });

  it("prevents duplicate registry keys with a unique compound index", () => {
    expect(Evidence.schema.indexes()).toContainEqual([
      { userId: 1, sourcePlatform: 1, evidenceType: 1, sourceReference: 1 },
      { unique: true },
    ]);
  });
});
