import { describe, expect, it } from "vitest";
import { ResumeVersion } from "../src/server/resume-models.js";

describe("resume versions", () => {
  it("uses a private resume version model with checkpoint reasons", () => {
    const version = new ResumeVersion({
      userId: "507f1f77bcf86cd799439011",
      resumeId: "507f1f77bcf86cd799439012",
      versionNumber: 1,
      reason: "checkpoint",
      snapshot: { professionalSummary: "Saved" },
      title: "Resume",
      targetRole: "Engineer",
    });
    expect(version.validateSync()).toBeUndefined();
  });
});
