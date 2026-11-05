import { describe, expect, it, vi } from "vitest";
import { clearGithubCache, GithubClient } from "../src/server/github-client.js";
import { GithubApiError } from "../src/server/github-types.js";
import { normalizeGithubRepository } from "../src/server/github-import.js";

function response(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("GithubClient", () => {
  it("requests typed profile data and caches repeated calls", async () => {
    clearGithubCache();
    const fetcher = vi.fn(async () =>
      response({
        id: 1,
        login: "ada",
        name: "Ada",
        html_url: "u",
        avatar_url: "a",
        public_repos: 2,
      }),
    );
    const client = new GithubClient({ fetcher });
    await client.getUser();
    await client.getUser();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("paginates repositories and excludes private responses", async () => {
    clearGithubCache();
    const fetcher = vi.fn(async (url: URL | RequestInfo) => {
      const page = new URL(String(url)).searchParams.get("page");
      if (page === "1")
        return response(Array.from({ length: 100 }, (_, id) => ({ id, visibility: "public" })));
      return response([
        { id: 101, visibility: "private" },
        { id: 102, visibility: "public" },
      ]);
    });
    const repositories = await new GithubClient({ fetcher }).listRepositories("ada");
    expect(repositories).toHaveLength(101);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("handles missing readmes and rate limits", async () => {
    clearGithubCache();
    const client = new GithubClient({ fetcher: vi.fn(async () => response({}, { status: 404 })) });
    expect(await client.getReadme("ada", "missing")).toBeNull();
    const rateLimited = new GithubClient({
      fetcher: vi.fn(async () =>
        response(
          {},
          {
            status: 429,
            headers: {
              "x-ratelimit-limit": "60",
              "x-ratelimit-remaining": "0",
              "x-ratelimit-reset": "1",
            },
          },
        ),
      ),
    });
    await expect(rateLimited.getUser()).rejects.toMatchObject({ status: 429 });
    await expect(rateLimited.getUser()).rejects.toBeInstanceOf(GithubApiError);
  });

  it("normalizes public repository metadata without inventing contributions", () => {
    const result = normalizeGithubRepository({
      id: 7,
      name: "demo",
      full_name: "ada/demo",
      description: " Demo ",
      html_url: "https://github.com/ada/demo",
      homepage: null,
      language: "TypeScript",
      topics: ["api"],
      fork: false,
      archived: false,
      created_at: "2025-01-01T00:00:00Z",
      pushed_at: "2025-02-01T00:00:00Z",
      stargazers_count: 2,
      forks_count: 1,
      default_branch: "main",
      size: 12,
      visibility: "public",
    });
    expect(result.fullName).toBe("ada/demo");
    expect(result.description).toBe("Demo");
    expect(result).not.toHaveProperty("personalContribution");
  });

  it("decodes bounded base64 README content", async () => {
    clearGithubCache();
    const fetcher = vi.fn(async () =>
      response({
        content: Buffer.from("# Demo").toString("base64"),
        encoding: "base64",
        html_url: "https://github.com/ada/demo/blob/main/README.md",
      }),
    );
    const readme = await new GithubClient({ fetcher }).getReadme("ada", "demo");
    expect(readme?.content).toBe("# Demo");
    expect(readme?.htmlUrl).toContain("README.md");
  });
});
