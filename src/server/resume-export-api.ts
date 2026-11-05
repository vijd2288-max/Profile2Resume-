import type { IncomingMessage, ServerResponse } from "node:http";
import { Types } from "mongoose";
import { ApiError } from "./api.js";
import { Resume } from "./resume-models.js";
import { createResumePdf, resumePdfFilename } from "./resume-pdf.js";

export async function handleResumeExportRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
): Promise<boolean> {
  const match = pathname.match(/^\/api\/resumes\/([^/]+)\/export\/pdf$/);
  if (!match) return false;
  if (request.method !== "GET") return false;
  const resumeId = match[1];
  if (!resumeId || !Types.ObjectId.isValid(resumeId))
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid resume ID");
  const resume = await Resume.findOne({ _id: resumeId, userId }).exec();
  if (!resume) throw new ApiError(404, "RESUME_NOT_FOUND", "Resume was not found");
  const pdf = await createResumePdf(resume);
  response.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Length": pdf.length,
    "Content-Disposition": `attachment; filename="${resumePdfFilename(resume.title)}"`,
    "Cache-Control": "no-store",
  });
  response.end(pdf);
  return true;
}
