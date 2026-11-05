import { describe, expect, it, vi } from "vitest";
import { clearGithubCache, GithubClient } from "../src/server/github-client.js";
import { GithubApiError } from "../src/server/github-types.js";

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
});
