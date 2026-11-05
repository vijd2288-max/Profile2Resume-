import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import { ApiError, failure, success, toApiFailure } from "./api.js";
import { handleAuthRequest } from "./auth-http.js";
import { connectToDatabase } from "./db.js";
import { assertUserOwnership, requireAuthenticatedUser } from "./access.js";
import { User } from "./models.js";
import { handleProfileRequest } from "./profile-api.js";
import { handleGithubRequest } from "./github-api.js";
import { handleLinkedInRequest } from "./linkedin-api.js";
import { handleLeetcodeRequest } from "./leetcode.js";
import { handleEvidenceRequest } from "./evidence-api.js";
import { handleProjectOverrideRequest } from "./project-override-api.js";
import { handleJobAnalysisRequest } from "./job-analysis-api.js";
import { handleBulletRequest } from "./bullet-api.js";
import { handleClarificationRequest } from "./clarification-api.js";
import { handleResumeRequest } from "./resume-api.js";
import { handleResumeVersionRequest } from "./resume-version-api.js";
import { handleResumePreviewRequest } from "./resume-preview-api.js";

const profilePatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  profileImage: z.string().url().max(2_048).optional(),
});

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

function safeUser(user: {
  id: string;
  name?: string;
  email: string;
  profileImage?: string;
  emailVerified: boolean;
  authProvider: string;
}) {
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email,
    profileImage: user.profileImage ?? null,
    emailVerified: user.emailVerified,
    authProvider: user.authProvider,
  };
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 10_000) {
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
    }
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
}

export async function handleApplicationRequest(
  request: IncomingMessage,
  response: ServerResponse,
  source: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (await handleAuthRequest(request, response, source)) return;

  const url = new URL(request.url ?? "/", "http://localhost");
  if (!url.pathname.startsWith("/api/")) {
    sendJson(response, 404, failure(new ApiError(404, "NOT_FOUND", "Route not found")));
    return;
  }

  try {
    const secret = source.API_SECRET_KEY;
    if (!secret)
      throw new ApiError(500, "SERVER_MISCONFIGURED", "Server authentication is unavailable");
    const userId = requireAuthenticatedUser(request.headers.cookie, secret);
    await connectToDatabase(source);

    if (await handleProfileRequest(request, response, userId, url.pathname, readJson, sendJson)) {
      return;
    }
    if (
      await handleGithubRequest(request, response, userId, url.pathname, source, readJson, sendJson)
    ) {
      return;
    }
    if (await handleLinkedInRequest(request, response, userId, url.pathname, readJson, sendJson)) {
      return;
    }
    if (await handleLeetcodeRequest(request, response, userId, url.pathname, readJson, sendJson)) {
      return;
    }
    if (await handleEvidenceRequest(request, response, userId, url.pathname, readJson, sendJson)) {
      return;
    }
    if (
      await handleProjectOverrideRequest(
        request,
        response,
        userId,
        url.pathname,
        readJson,
        sendJson,
      )
    ) {
      return;
    }
    if (
      await handleJobAnalysisRequest(
        request,
        response,
        userId,
        url.pathname,
        source,
        readJson,
        sendJson,
      )
    ) {
      return;
    }
    if (
      await handleBulletRequest(request, response, userId, url.pathname, source, readJson, sendJson)
    ) {
      return;
    }
    if (
      await handleClarificationRequest(request, response, userId, url.pathname, readJson, sendJson)
    ) {
      return;
    }
    if (await handleResumeRequest(request, response, userId, url.pathname, readJson, sendJson)) {
      return;
    }
    if (
      await handleResumeVersionRequest(request, response, userId, url.pathname, readJson, sendJson)
    ) {
      return;
    }
    if (await handleResumePreviewRequest(request, response, userId, url.pathname, sendJson)) {
      return;
    }

    if (url.pathname === "/api/me" && request.method === "GET") {
      const user = await User.findById(userId).exec();
      if (!user) throw new ApiError(404, "USER_NOT_FOUND", "User profile was not found");
      sendJson(response, 200, success(safeUser(user)));
      return;
    }

    const profileMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/profile$/);
    if (profileMatch) {
      const requestedUserId = profileMatch[1];
      if (!requestedUserId) throw new ApiError(400, "VALIDATION_ERROR", "User ID is required");
      assertUserOwnership(userId, requestedUserId);
      if (request.method === "GET") {
        const user = await User.findById(requestedUserId).exec();
        if (!user) throw new ApiError(404, "USER_NOT_FOUND", "User profile was not found");
        sendJson(response, 200, success(safeUser(user)));
        return;
      }
      if (request.method === "PATCH") {
        const patch = profilePatchSchema.parse(await readJson(request));
        const user = await User.findByIdAndUpdate(
          requestedUserId,
          { $set: patch },
          { new: true },
        ).exec();
        if (!user) throw new ApiError(404, "USER_NOT_FOUND", "User profile was not found");
        sendJson(response, 200, success(safeUser(user)));
        return;
      }
      if (request.method === "DELETE") {
        const deleted = await User.findByIdAndDelete(requestedUserId).exec();
        if (!deleted) throw new ApiError(404, "USER_NOT_FOUND", "User profile was not found");
        sendJson(response, 200, success({ deleted: true }));
        return;
      }
    }

    sendJson(response, 404, failure(new ApiError(404, "NOT_FOUND", "Route not found")));
  } catch (error) {
    const apiError =
      error instanceof z.ZodError
        ? new ApiError(
            400,
            "VALIDATION_ERROR",
            "The request could not be validated",
            error.flatten(),
          )
        : error;
    const responseError = toApiFailure(apiError);
    sendJson(response, apiError instanceof ApiError ? apiError.status : 500, responseError);
  }
}

export function createApplicationServer(source: NodeJS.ProcessEnv = process.env) {
  return createServer((request, response) => {
    void handleApplicationRequest(request, response, source);
  });
}
