import type { IncomingMessage, ServerResponse } from "node:http";
import { Types } from "mongoose";
import { ApiError, success } from "./api.js";
import { Resume } from "./resume-models.js";
import { buildResumePreview } from "./resume-preview.js";

type SendJson = (response: ServerResponse, status: number, body: unknown) => void;

export async function handleResumePreviewRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
  sendJson: SendJson,
): Promise<boolean> {
  const match = pathname.match(/^\/api\/resumes\/([^/]+)\/preview$/);
  if (!match || request.method !== "GET") return false;
  const id = match[1];
  if (!id || !Types.ObjectId.isValid(id))
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid resume ID");
  const resume = await Resume.findOne({ _id: id, userId }).lean().exec();
  if (!resume) throw new ApiError(404, "RESUME_NOT_FOUND", "Resume was not found");
  sendJson(response, 200, success(buildResumePreview(resume)));
  return true;
}
