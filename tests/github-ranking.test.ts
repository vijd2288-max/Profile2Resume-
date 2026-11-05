import { describe, expect, it } from "vitest";
import { filterGithubRepositories, rankGithubRepositories } from "../src/server/github-ranking.js";

const repository = (overrides = {}) => ({
  githubId: 1,
  name: "project",
  description: "A useful project",
  topics: ["api"],
  isFork: false,
  isArchived: false,
  size: 20,
  primaryLanguage: "TypeScript",
  languages: new Map([["TypeScript", 100]]),
  readmeContent: "# Project\n".repeat(30),
  homepageURL: "https://example.com",
  stars: 2,
  forks: 0,
  lastPushedAt: new Date(),
  ...overrides,
});

describe("GitHub repository ranking", () => {
  it("is deterministic and applies fork penalties", () => {
    const original = repository({ githubId: 2 });
    const fork = repository({ githubId: 3, isFork: true, stars: 1_000 });
    const first = rankGithubRepositories([fork, original]);
    const second = rankGithubRepositories([original, fork]);
    expect(first.map((item) => item.repository.githubId)).toEqual(
      second.map((item) => item.repository.githubId),
    );
    expect(first[0]?.repository.githubId).toBe(2);
    expect(first[1]?.score).toBeLessThan(first[0]?.score ?? 0);
  });

  it("does not discard older completed projects or rank empty projects", () => {
    const old = repository({ githubId: 4, lastPushedAt: new Date("2020-01-01") });
    const empty = repository({
      githubId: 5,
      description: undefined,
      topics: [],
      size: 0,
      primaryLanguage: undefined,
      readmeContent: undefined,
    });
    expect(filterGithubRepositories([old, empty])).toEqual([old]);
    expect(rankGithubRepositories([old])[0]?.missingInformation).not.toContain(
      "current maintenance",
    );
  });
});
