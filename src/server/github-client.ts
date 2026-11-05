import type {
  GithubCommit,
  GithubLanguages,
  GithubPage,
  GithubReadme,
  GithubRepository,
  GithubUser,
  GithubRateLimit,
} from "./github-types.js";
import { GithubApiError } from "./github-types.js";

type FetchLike = typeof fetch;
type CacheEntry = { expiresAt: number; etag?: string; value: unknown };

const cache = new Map<string, CacheEntry>();
const defaultBaseUrl = "https://api.github.com";
const defaultTtlMs = 60_000;

export type GithubClientOptions = {
  token?: string;
  baseUrl?: string;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
  now?: () => number;
};

function rateLimit(headers: Headers): GithubRateLimit | undefined {
  const limit = Number(headers.get("x-ratelimit-limit"));
  const remaining = Number(headers.get("x-ratelimit-remaining"));
  const reset = Number(headers.get("x-ratelimit-reset"));
  if (!Number.isFinite(limit) || !Number.isFinite(remaining)) return undefined;
  return {
    limit,
    remaining,
    ...(Number.isFinite(reset) ? { resetAt: new Date(reset * 1000) } : {}),
  };
}

function decodeReadme(value: GithubReadme): string {
  if (value.encoding !== "base64") return value.content.slice(0, 50_000);
  return Buffer.from(value.content.replace(/\s/g, ""), "base64").toString("utf8").slice(0, 50_000);
}

export class GithubClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private readonly fetcher: FetchLike;
  private readonly now: () => number;

  constructor(options: GithubClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? process.env.GITHUB_API_BASE_URL ?? defaultBaseUrl).replace(
      /\/+$/,
      "",
    );
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.cacheTtlMs = options.cacheTtlMs ?? defaultTtlMs;
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? Date.now;
    this.token = options.token;
  }

  private readonly token: string | undefined;

  private async request<T>(path: string, search: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    Object.entries(search).forEach(([key, value]) => url.searchParams.set(key, value));
    const key = url.toString();
    const existing = cache.get(key);
    if (existing && existing.expiresAt > this.now()) return existing.value as T;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": process.env.GITHUB_API_VERSION ?? "2022-11-28",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (existing?.etag) headers["If-None-Match"] = existing.etag;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetcher(url, { headers, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new GithubApiError("GitHub request timed out", 408, undefined, true);
      }
      throw new GithubApiError("GitHub request failed", 503, undefined, true);
    } finally {
      clearTimeout(timeout);
    }
    const limits = rateLimit(response.headers);
    if (response.status === 304 && existing) return existing.value as T;
    if (!response.ok) {
      throw new GithubApiError(
        response.status === 404
          ? "GitHub resource was not found"
          : `GitHub API request failed (${response.status})`,
        response.status,
        limits,
        response.status === 429 || response.status >= 500,
      );
    }
    const value = (await response.json()) as T;
    cache.set(key, {
      value,
      expiresAt: this.now() + this.cacheTtlMs,
      ...(response.headers.get("etag") ? { etag: response.headers.get("etag")! } : {}),
    });
    return value;
  }

  async getUser(username = "user"): Promise<GithubUser> {
    return this.request<GithubUser>(
      username === "user" ? "/user" : `/users/${encodeURIComponent(username)}`,
    );
  }

  async listRepositories(username = "user"): Promise<GithubRepository[]> {
    const repositories: GithubRepository[] = [];
    for (let page = 1; ; page += 1) {
      const current = await this.request<GithubRepository[]>(
        username === "user" ? "/user/repos" : `/users/${encodeURIComponent(username)}/repos`,
        { per_page: "100", page: String(page), type: "public", sort: "updated", direction: "desc" },
      );
      repositories.push(...current.filter((repository) => repository.visibility !== "private"));
      if (current.length < 100) return repositories;
    }
  }

  async getLanguages(owner: string, repository: string): Promise<GithubLanguages> {
    return this.request<GithubLanguages>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/languages`,
    );
  }

  async getReadme(
    owner: string,
    repository: string,
  ): Promise<{ content: string; htmlUrl: string } | null> {
    try {
      const readme = await this.request<GithubReadme>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/readme`,
      );
      return { content: decodeReadme(readme), htmlUrl: readme.html_url };
    } catch (error) {
      if (error instanceof GithubApiError && error.status === 404) return null;
      throw error;
    }
  }

  async getRecentCommits(
    owner: string,
    repository: string,
    branch: string,
  ): Promise<GithubCommit[]> {
    return this.request<GithubCommit[]>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/commits`,
      { sha: branch, per_page: "5" },
    );
  }
}

export function clearGithubCache(): void {
  cache.clear();
}
