import { describe, expect, it } from "vitest";
import { Resume, ResumeVersion, emptyResumeSections } from "../src/server/resume-models.js";

describe("resume models", () => {
  it("supports multiple owned resume documents", () => {
    const first = new Resume({
      userId: "507f1f77bcf86cd799439011",
      title: "Frontend resume",
      targetRole: "Frontend Engineer",
      sections: emptyResumeSections(),
    });
    const second = new Resume({
      userId: "507f1f77bcf86cd799439011",
      title: "Backend resume",
      targetRole: "Backend Engineer",
      sections: emptyResumeSections(),
    });
    expect(first.validateSync()).toBeUndefined();
    expect(second.validateSync()).toBeUndefined();
    expect(first.userId.toString()).toBe(second.userId.toString());
  });

  it("requires ownership and version metadata", () => {
    const version = new ResumeVersion({
      resumeId: "507f1f77bcf86cd799439011",
      versionNumber: 1,
      reason: "created",
      snapshot: emptyResumeSections(),
      title: "Resume",
      targetRole: "Engineer",
    });
    expect(version.validateSync()).toBeTruthy();
  });

  it("validates known fields in resume section records", () => {
    const resume = new Resume({
      userId: "507f1f77bcf86cd799439011",
      title: "Resume",
      targetRole: "Engineer",
      sections: {
        ...emptyResumeSections(),
        education: [{ institutionName: "x".repeat(201) }],
      },
    });

    expect(resume.validateSync()?.errors["sections.education.0.institutionName"]).toBeDefined();
  });
});
