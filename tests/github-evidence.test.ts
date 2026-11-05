import { describe, expect, it } from "vitest";
import { recordsForRepository } from "../src/server/github-evidence.js";

describe("GitHub evidence collection", () => {
  it("collects only available metadata and preserves source references", () => {
    const records = recordsForRepository({
      githubId: 7,
      fullName: "ada/demo",
      repositoryURL: "https://github.com/ada/demo",
      description: "Demo",
      languages: new Map([["TypeScript", 100]]),
      readmeContent: "# Demo",
      readmeURL: "https://github.com/ada/demo/blob/main/README.md",
      lastCommitURL: "https://github.com/ada/demo/commit/abc",
      lastCommitDate: new Date("2026-01-01"),
    });
    expect(records.map((record) => record.evidenceType)).toEqual([
      "github_repository",
      "github_readme",
      "github_languages",
      "github_commit",
    ]);
    expect(records.every((record) => record.sourceReference.includes("7"))).toBe(true);
    expect(records[3]?.description).toContain("does not prove");
  });
});
