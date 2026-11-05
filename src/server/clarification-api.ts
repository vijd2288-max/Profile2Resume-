import type { IncomingMessage, ServerResponse } from "node:http";
import { Types } from "mongoose";
import { ApiError, success } from "./api.js";
import { ClarificationQuestion } from "./clarification-models.js";
import { answerClarification, createClarificationQuestions } from "./clarification-service.js";

type ReadJson = (request: IncomingMessage) => Promise<unknown>;
type SendJson = (response: ServerResponse, status: number, body: unknown) => void;

export async function handleClarificationRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
  readJson: ReadJson,
  sendJson: SendJson,
): Promise<boolean> {
  const collection = pathname.match(/^\/api\/ai\/clarifications\/([^/]+)$/);
  if (collection && request.method === "GET") {
    const analysisId = collection[1];
    if (!analysisId || !Types.ObjectId.isValid(analysisId))
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid analysis ID");
    const generated = await createClarificationQuestions(userId, analysisId);
    sendJson(response, 200, success(generated));
    return true;
  }
  const answer = pathname.match(/^\/api\/ai\/clarifications\/questions\/([^/]+)$/);
  if (answer && request.method === "PATCH") {
    const questionId = answer[1];
    if (!questionId || !Types.ObjectId.isValid(questionId))
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid question ID");
    const body = await readJson(request);
    if (!body || typeof body !== "object")
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid clarification response");
    const value = body as { response?: unknown; skipped?: unknown };
    const responseText = typeof value.response === "string" ? value.response.trim() : null;
    const skipped = value.skipped === true;
    if (!responseText && !skipped)
      throw new ApiError(400, "VALIDATION_ERROR", "Provide a response or skip the question");
    const question = await answerClarification(userId, questionId, responseText, skipped);
    if (!question)
      throw new ApiError(404, "QUESTION_NOT_FOUND", "Clarification question was not found");
    sendJson(response, 200, success(question));
    return true;
  }
  if (pathname === "/api/ai/clarifications" && request.method === "GET") {
    const questions = await ClarificationQuestion.find({ userId })
      .sort({ priority: -1 })
      .limit(100)
      .lean()
      .exec();
    sendJson(response, 200, success(questions));
    return true;
  }
  return false;
}
