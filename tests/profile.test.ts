import { describe, expect, it } from "vitest";
import { DeveloperProfile } from "../src/server/profile-models.js";
import { calculateProfileCompleteness } from "../src/server/profile-completeness.js";
import {
  deduplicateSkills,
  normalizePersonalInformation,
  normalizeSkillName,
} from "../src/server/profile-normalization.js";
import { preserveProvenance } from "../src/server/provenance.js";
import { educationSchema } from "../src/server/profile-validation.js";

describe("profile normalization and completeness", () => {
  it("normalizes URLs, whitespace, and common skill aliases", () => {
    expect(
      normalizePersonalInformation({
        fullName: "  Ada   Lovelace ",
        githubURL: "https://github.com/ada/",
      }),
    ).toEqual({
      fullName: "Ada Lovelace",
      githubURL: "https://github.com/ada",
    });
    expect(normalizeSkillName(" React.js ")).toBe("react");
    const skills = [
      {
        name: "React.js",
        normalizedName: "react.js",
        category: "frontend",
        sourceProvider: "manual",
        verificationStatus: "pending_review",
      },
      {
        name: "ReactJS",
        normalizedName: "reactjs",
        category: "frontend",
        sourceProvider: "github",
        verificationStatus: "imported",
      },
    ] as const;
    expect(deduplicateSkills([...skills])).toHaveLength(1);
  });

  it("preserves imported source metadata while editing a record", () => {
    const original = {
      sourceProvider: "github" as const,
      sourceRecordId: "repo-1",
      sourceURL: "https://github.com/example/repo",
      importedAt: new Date("2026-01-01"),
      verificationStatus: "imported" as const,
    };
    const result = preserveProvenance(original, { verificationStatus: "user_confirmed" });
    expect(result.sourceProvider).toBe("github");
    expect(result.sourceRecordId).toBe("repo-1");
    expect(result.verificationStatus).toBe("user_confirmed");
  });

  it("rejects inverted date ranges and calculates weighted completeness", () => {
    expect(() =>
      educationSchema.parse({
        institutionName: "Example",
        startDate: "2026-02-01",
        endDate: "2026-01-01",
      }),
    ).toThrow();
    const profile = new DeveloperProfile({
      userId: "507f1f77bcf86cd799439011",
      basicInformation: { fullName: "Ada Lovelace", email: "ada@example.com" },
      projects: [
        {
          projectName: "Analytical Engine",
          sourceProvider: "manual",
          verificationStatus: "pending_review",
        },
      ],
    });
    const result = calculateProfileCompleteness(profile);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
    expect(result.suggestions).toContain("Add technical skills.");
  });
});
