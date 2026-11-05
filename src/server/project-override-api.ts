import type { IncomingMessage, ServerResponse } from "node:http";
import { Types } from "mongoose";
import { z } from "zod";
import { ApiError, success } from "./api.js";
import { ProjectOverride } from "./project-overrides.js";

type ReadJson = (request: IncomingMessage) => Promise<unknown>;
type SendJson = (response: ServerResponse, status: number, body: unknown) => void;
const patchSchema = z
  .object({
    include: z.boolean().optional(),
    exclude: z.boolean().optional(),
    pinned: z.boolean().optional(),
    priority: z.number().int().min(-100).max(100).optional(),
    automaticRanking: z.boolean().optional(),
  })
  .strict();

export async function handleProjectOverrideRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
  readJson: ReadJson,
  sendJson: SendJson,
): Promise<boolean> {
  const match = pathname.match(/^\/api\/github\/projects\/(\d+)\/override$/);
  if (!match) return false;
  const githubId = Number(match[1]);
  if (!Number.isSafeInteger(githubId) || githubId <= 0)
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid GitHub repository ID");
  const filter = { userId: new Types.ObjectId(userId), githubId };
  if (request.method === "GET") {
    const record = await ProjectOverride.findOne(filter).lean().exec();
    sendJson(response, 200, success(record ?? null));
    return true;
  }
  if (request.method !== "PATCH") return false;
  const patch = patchSchema.parse(await readJson(request));
  const record = await ProjectOverride.findOneAndUpdate(
    filter,
    { $set: patch },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
    .lean()
    .exec();
  sendJson(response, 200, success(record));
  return true;
}
