export type GithubUser = {
  id: number;
  login: string;
  name: string | null;
  html_url: string;
  avatar_url: string;
  public_repos: number;
};

export type GithubRepository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  fork: boolean;
  archived: boolean;
  created_at: string;
  pushed_at: string | null;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  size: number;
  visibility?: string;
};

export type GithubLanguages = Record<string, number>;

export type GithubReadme = {
  content: string;
  html_url: string;
  encoding: string;
};

export type GithubCommit = {
  sha: string;
  html_url: string;
  commit: { message: string; author: { date: string | null } | null };
};

export type GithubPage<T> = {
  items: T[];
  nextPage: number | null;
};

export type GithubRateLimit = {
  limit: number;
  remaining: number;
  resetAt?: Date;
};

export class GithubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly rateLimit?: GithubRateLimit,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "GithubApiError";
  }
}
