import type { IncomingMessage, ServerResponse } from "node:http";
import { Types } from "mongoose";
import { ApiError, success } from "./api.js";
import { createAiProvider } from "./ai-provider.js";
import { ResumeBullet } from "./bullet-models.js";
import { generateResumeBullets } from "./bullet-generation.js";

type ReadJson = (request: IncomingMessage) => Promise<unknown>;
type SendJson = (response: ServerResponse, status: number, body: unknown) => void;

export async function handleBulletRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
  source: NodeJS.ProcessEnv,
  readJson: ReadJson,
  sendJson: SendJson,
): Promise<boolean> {
  if (pathname === "/api/ai/bullets" && request.method === "POST") {
    const bullets = await generateResumeBullets(
      userId,
      await readJson(request),
      createAiProvider(source),
    );
    sendJson(response, 201, success(bullets));
    return true;
  }
  if (pathname === "/api/ai/bullets" && request.method === "GET") {
    const bullets = await ResumeBullet.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
    sendJson(response, 200, success(bullets));
    return true;
  }
  const match = pathname.match(/^\/api\/ai\/bullets\/([^/]+)$/);
  if (!match || !match[1]) return false;
  if (!Types.ObjectId.isValid(match[1]))
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid bullet ID");
  const filter = { _id: match[1], userId };
  if (request.method === "PATCH") {
    const body = await readJson(request);
    if (!body || typeof body !== "object")
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid bullet update");
    const update = body as { text?: unknown; approvalStatus?: unknown };
    const $set: Record<string, string> = {};
    if (typeof update.text === "string" && update.text.trim()) $set.text = update.text.trim();
    if (update.approvalStatus === "approved" || update.approvalStatus === "rejected")
      $set.approvalStatus = update.approvalStatus;
    if (!Object.keys($set).length)
      throw new ApiError(400, "VALIDATION_ERROR", "No valid bullet changes");
    const bullet = await ResumeBullet.findOneAndUpdate(filter, { $set }, { new: true })
      .lean()
      .exec();
    if (!bullet) throw new ApiError(404, "BULLET_NOT_FOUND", "Resume bullet was not found");
    sendJson(response, 200, success(bullet));
    return true;
  }
  return false;
}
