import type { IncomingMessage, ServerResponse } from "node:http";
import { Types } from "mongoose";
import { ApiError, success } from "./api.js";
import { Resume, ResumeVersion } from "./resume-models.js";

type ReadJson = (request: IncomingMessage) => Promise<unknown>;
type SendJson = (response: ServerResponse, status: number, body: unknown) => void;

function id(value: string) {
  if (!Types.ObjectId.isValid(value))
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid resume ID");
  return new Types.ObjectId(value);
}

async function ownedResume(userId: string, resumeId: string) {
  const resume = await Resume.findOne({ _id: id(resumeId), userId }).exec();
  if (!resume) throw new ApiError(404, "RESUME_NOT_FOUND", "Resume was not found");
  return resume;
}

export async function handleResumeVersionRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
  readJson: ReadJson,
  sendJson: SendJson,
): Promise<boolean> {
  const list = pathname.match(/^\/api\/resumes\/([^/]+)\/versions$/);
  if (list && request.method === "GET") {
    const resumeId = list[1] ?? "";
    await ownedResume(userId, resumeId);
    const versions = await ResumeVersion.find({ resumeId: id(resumeId), userId })
      .sort({ versionNumber: -1 })
      .limit(50)
      .lean()
      .exec();
    sendJson(response, 200, success(versions));
    return true;
  }
  if (list && request.method === "POST") {
    const resumeId = list[1] ?? "";
    const resume = await ownedResume(userId, resumeId);
    const latest = await ResumeVersion.findOne({ resumeId: resume._id, userId })
      .sort({ versionNumber: -1 })
      .lean()
      .exec();
    const version = await ResumeVersion.create({
      userId,
      resumeId: resume._id,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      reason: "checkpoint",
      snapshot: resume.sections,
      title: resume.title,
      targetRole: resume.targetRole,
    });
    sendJson(response, 201, success(version));
    return true;
  }
  const restore = pathname.match(/^\/api\/resumes\/([^/]+)\/versions\/(\d+)\/restore$/);
  if (restore && request.method === "POST") {
    const resumeId = restore[1] ?? "";
    const versionNumber = Number(restore[2]);
    if (!Number.isSafeInteger(versionNumber) || versionNumber < 1)
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid version number");
    const resume = await ownedResume(userId, resumeId);
    const version = await ResumeVersion.findOne({
      resumeId: resume._id,
      userId,
      versionNumber,
    }).exec();
    if (!version) throw new ApiError(404, "VERSION_NOT_FOUND", "Resume version was not found");
    resume.sections = version.snapshot;
    resume.revision += 1;
    await resume.save();
    const latest = await ResumeVersion.findOne({ resumeId: resume._id, userId })
      .sort({ versionNumber: -1 })
      .lean()
      .exec();
    await ResumeVersion.create({
      userId,
      resumeId: resume._id,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      reason: "restored",
      snapshot: resume.sections,
      title: resume.title,
      targetRole: resume.targetRole,
    });
    sendJson(response, 200, success(resume));
    return true;
  }
  if (pathname.match(/^\/api\/resumes\/[^/]+\/versions\/\d+$/) && request.method === "GET") {
    const match = pathname.match(/^\/api\/resumes\/([^/]+)\/versions\/(\d+)$/);
    const resumeId = match?.[1] ?? "";
    const versionNumber = Number(match?.[2]);
    const version = await ResumeVersion.findOne({ resumeId: id(resumeId), userId, versionNumber })
      .lean()
      .exec();
    if (!version) throw new ApiError(404, "VERSION_NOT_FOUND", "Resume version was not found");
    sendJson(response, 200, success(version));
    return true;
  }
  void readJson;
  return false;
}
