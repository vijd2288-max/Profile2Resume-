import type { IncomingMessage, ServerResponse } from "node:http";
import { Types } from "mongoose";
import { ApiError, success } from "./api.js";
import { createAiProvider } from "./ai-provider.js";
import { JobDescriptionAnalysis } from "./job-analysis-models.js";
import { analyzeJobDescription } from "./job-analysis.js";

type ReadJson = (request: IncomingMessage) => Promise<unknown>;
type SendJson = (response: ServerResponse, status: number, body: unknown) => void;

export async function handleJobAnalysisRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
  source: NodeJS.ProcessEnv,
  readJson: ReadJson,
  sendJson: SendJson,
): Promise<boolean> {
  if (pathname === "/api/ai/job-analysis" && request.method === "POST") {
    const record = await analyzeJobDescription(
      userId,
      await readJson(request),
      createAiProvider(source),
    );
    sendJson(response, 201, success(record));
    return true;
  }
  if (pathname === "/api/ai/job-analysis" && request.method === "GET") {
    const records = await JobDescriptionAnalysis.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .exec();
    sendJson(response, 200, success(records));
    return true;
  }
  const match = pathname.match(/^\/api\/ai\/job-analysis\/([^/]+)$/);
  if (match && request.method === "GET") {
    const id = match[1];
    if (!id || !Types.ObjectId.isValid(id))
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid analysis ID");
    const record = await JobDescriptionAnalysis.findOne({ _id: id, userId }).lean().exec();
    if (!record) throw new ApiError(404, "ANALYSIS_NOT_FOUND", "Job analysis was not found");
    sendJson(response, 200, success(record));
    return true;
  }
  return false;
}
