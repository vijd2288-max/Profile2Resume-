import { Types } from "mongoose";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { ApiError, success } from "./api.js";
import { GithubApiError } from "./github-types.js";
import { GithubImport } from "./github-models.js";
import { importGithubRepositories } from "./github-import.js";

type ReadJson = (request: IncomingMessage) => Promise<unknown>;
type SendJson = (response: ServerResponse, status: number, body: unknown) => void;
const emptyBody = z.object({}).passthrough();
const runningSyncs = new Set<string>();

function safeImport(document: {
  profile?: unknown;
  repositories: Array<{ recommended?: boolean }>;
  synchronizationStatus: string;
  lastSynchronizedAt?: Date;
  lastError?: string;
}) {
  return {
    profile: document.profile ?? null,
    repositories: document.repositories,
    recommended: document.repositories.filter((repository) => repository.recommended),
    synchronizationStatus: document.synchronizationStatus,
    lastSynchronizedAt: document.lastSynchronizedAt ?? null,
    lastError: document.lastError ?? null,
  };
}

export async function handleGithubRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
  source: NodeJS.ProcessEnv,
  _readJson: ReadJson,
  sendJson: SendJson,
): Promise<boolean> {
  if (!pathname.startsWith("/api/github/")) return false;
  const objectId = new Types.ObjectId(userId);
  if (pathname === "/api/github/status" && request.method === "GET") {
    const document = await GithubImport.findOne({ userId: objectId }).lean().exec();
    sendJson(
      response,
      200,
      success(
        document
          ? safeImport(document)
          : {
              profile: null,
              repositories: [],
              synchronizationStatus: "idle",
              lastSynchronizedAt: null,
              lastError: null,
            },
      ),
    );
    return true;
  }
  if (pathname === "/api/github/profile" && request.method === "GET") {
    const document = await GithubImport.findOne({ userId: objectId }).lean().exec();
    if (!document?.profile)
      throw new ApiError(
        404,
        "GITHUB_PROFILE_NOT_IMPORTED",
        "GitHub profile has not been imported",
      );
    sendJson(response, 200, success(document.profile));
    return true;
  }
  if (pathname === "/api/github/repositories" && request.method === "GET") {
    const document = await GithubImport.findOne({ userId: objectId }).lean().exec();
    sendJson(
      response,
      200,
      success(
        document
          ? {
              repositories: document.repositories,
              recommended: document.repositories.filter((repository) => repository.recommended),
              lastSynchronizedAt: document.lastSynchronizedAt ?? null,
            }
          : { repositories: [], recommended: [], lastSynchronizedAt: null },
      ),
    );
    return true;
  }
  if (pathname === "/api/github/import" || pathname === "/api/github/sync") {
    if (request.method !== "POST") return false;
    emptyBody.parse(await _readJson(request));
    if (runningSyncs.has(userId))
      throw new ApiError(
        409,
        "GITHUB_SYNC_IN_PROGRESS",
        "GitHub synchronization is already running",
      );
    runningSyncs.add(userId);
    try {
      const document = await importGithubRepositories(userId, source);
      sendJson(response, 200, success(safeImport(document)));
    } catch (error) {
      if (error instanceof GithubApiError && error.rateLimit) {
        throw new ApiError(429, "GITHUB_RATE_LIMITED", "GitHub API rate limit reached", {
          resetAt: error.rateLimit.resetAt?.toISOString() ?? null,
        });
      }
      throw error;
    } finally {
      runningSyncs.delete(userId);
    }
    return true;
  }
  const repositoryMatch = pathname.match(/^\/api\/github\/repositories\/([^/]+)$/);
  if (repositoryMatch && request.method === "GET") {
    const githubId = Number(repositoryMatch[1]);
    if (!Number.isSafeInteger(githubId) || githubId <= 0)
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid GitHub repository ID");
    const document = await GithubImport.findOne({
      userId: objectId,
      "repositories.githubId": githubId,
    })
      .lean()
      .exec();
    const repository = document?.repositories.find((item) => item.githubId === githubId);
    if (!repository)
      throw new ApiError(404, "GITHUB_REPOSITORY_NOT_FOUND", "GitHub repository was not imported");
    sendJson(response, 200, success(repository));
    return true;
  }
  return false;
}
