import { describe, expect, it } from "vitest";
import { applyProjectOverrides } from "../src/server/project-overrides.js";

describe("project overrides", () => {
  it("keeps ranking deterministic while honoring pins and exclusions", () => {
    const ranked = [
      {
        repository: {
          githubId: 2,
          name: "second",
          topics: [],
          isFork: false,
          isArchived: false,
          size: 1,
        },
        score: 90,
        explanation: "automatic",
        positiveSignals: [],
        missingInformation: [],
      },
      {
        repository: {
          githubId: 1,
          name: "first",
          topics: [],
          isFork: false,
          isArchived: false,
          size: 1,
        },
        score: 90,
        explanation: "automatic",
        positiveSignals: [],
        missingInformation: [],
      },
      {
        repository: {
          githubId: 3,
          name: "third",
          topics: [],
          isFork: false,
          isArchived: false,
          size: 1,
        },
        score: 80,
        explanation: "automatic",
        positiveSignals: [],
        missingInformation: [],
      },
    ];
    const result = applyProjectOverrides(
      ranked,
      new Map([
        [3, { include: false, exclude: false, pinned: true, priority: 0, automaticRanking: true }],
        [2, { include: false, exclude: true, pinned: false, priority: 0, automaticRanking: true }],
      ]),
    );
    expect(result.map((item) => item.repository.githubId)).toEqual([3, 1]);
    expect(result[0]?.explanation).toContain("Pinned");
  });
});
