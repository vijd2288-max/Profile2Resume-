import type { IncomingMessage } from "node:http";
import { ApiError } from "./api.js";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientKey(request: IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return address?.trim() || request.socket.remoteAddress || "unknown";
}

export function rateLimit(
  request: IncomingMessage,
  pathname: string,
  source: NodeJS.ProcessEnv = process.env,
): void {
  const windowMs = Number(source.RATE_LIMIT_WINDOW_MS ?? 60_000);
  const defaultLimit = Number(source.RATE_LIMIT_MAX_REQUESTS ?? 120);
  const sensitiveLimit = Number(source.RATE_LIMIT_SENSITIVE_MAX_REQUESTS ?? 20);
  const sensitive =
    pathname.startsWith("/auth/") ||
    pathname.includes("/export/") ||
    pathname.startsWith("/api/linkedin/import") ||
    pathname.includes("/generate");
  const limit = sensitive ? sensitiveLimit : defaultLimit;
  const now = Date.now();
  const key = `${clientKey(request)}:${sensitive ? "sensitive" : "default"}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= limit) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests; please try again later");
  }
  bucket.count += 1;
}

export function clearRateLimitBuckets(): void {
  buckets.clear();
}
