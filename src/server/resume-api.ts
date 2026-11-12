import type { IncomingMessage, ServerResponse } from "node:http";
import { Types } from "mongoose";
import { z } from "zod";
import { ApiError, success } from "./api.js";
import { ResumeBullet } from "./bullet-models.js";
import { emptyResumeSections, Resume, type ResumeBulletValue } from "./resume-models.js";

type ReadJson = (request: IncomingMessage) => Promise<unknown>;
type SendJson = (response: ServerResponse, status: number, body: unknown) => void;

const sectionsSchema = z
  .object({
    personalInformation: z.record(z.string().max(500)).default({}),
    professionalSummary: z.string().max(4_000).default(""),
    technicalSkills: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
    workExperience: z.array(z.record(z.unknown())).max(100).default([]),
    projects: z.array(z.record(z.unknown())).max(100).default([]),
    education: z.array(z.record(z.unknown())).max(100).default([]),
    certifications: z.array(z.record(z.unknown())).max(100).default([]),
    achievements: z.array(z.record(z.unknown())).max(100).default([]),
  })
  .strict();

const createSchema = z.object({
  title: z.string().trim().min(1).max(160),
  targetRole: z.string().trim().min(1).max(160),
  jobAnalysisId: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional(),
  template: z.string().trim().min(1).max(80).default("classic"),
  sections: sectionsSchema.default(emptyResumeSections()),
});

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    targetRole: z.string().trim().min(1).max(160).optional(),
    jobAnalysisId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .nullable()
      .optional(),
    template: z.string().trim().min(1).max(80).optional(),
    status: z.enum(["draft", "ready", "archived"]).optional(),
    sections: sectionsSchema.optional(),
    expectedRevision: z.number().int().min(0).optional(),
  })
  .strict();

const bulletSchema = z.object({
  text: z.string().trim().min(1).max(1_000),
  evidenceReferences: z
    .array(z.string().regex(/^[a-f\d]{24}$/i))
    .max(20)
    .default([]),
  validationStatus: z.enum([
    "supported",
    "partially_supported",
    "user_confirmed",
    "unsupported",
    "requires_clarification",
  ]),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).default("pending"),
  displayOrder: z.number().int().min(0),
  sourceBulletId: z.string().max(100).optional(),
});
const bulletPatchSchema = bulletSchema.omit({ displayOrder: true }).partial();

function objectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "VALIDATION_ERROR", "Invalid resume ID");
  return new Types.ObjectId(id);
}

function resumeFilter(userId: string, id: string) {
  return { _id: objectId(id), userId: new Types.ObjectId(userId) };
}

function toBullet(value: z.infer<typeof bulletSchema>, index: number) {
  return {
    bulletId: new Types.ObjectId().toString(),
    text: value.text,
    evidenceReferences: value.evidenceReferences,
    validationStatus: value.validationStatus,
    approvalStatus: value.approvalStatus,
    displayOrder: value.displayOrder ?? index,
    ...(value.sourceBulletId ? { sourceBulletId: value.sourceBulletId } : {}),
  };
}

export async function handleResumeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
  readJson: ReadJson,
  sendJson: SendJson,
): Promise<boolean> {
  if (pathname === "/api/resumes" && request.method === "GET") {
    const resumes = await Resume.find({ userId: new Types.ObjectId(userId) })
      .select("title targetRole status template revision createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean()
      .exec();
    sendJson(response, 200, success(resumes));
    return true;
  }
  if (pathname === "/api/resumes" && request.method === "POST") {
    const input = createSchema.parse(await readJson(request));
    const { jobAnalysisId, ...resumeInput } = input;
    const resume = await Resume.create({
      userId,
      ...resumeInput,
      ...(jobAnalysisId ? { jobAnalysisId } : {}),
    });
    sendJson(response, 201, success(resume));
    return true;
  }

  const duplicate = pathname.match(/^\/api\/resumes\/([^/]+)\/duplicate$/);
  if (duplicate && request.method === "POST") {
    const source = await Resume.findOne(resumeFilter(userId, duplicate[1] ?? ""))
      .lean()
      .exec();
    if (!source) throw new ApiError(404, "RESUME_NOT_FOUND", "Resume was not found");
    const copy = await Resume.create({
      userId,
      title: `${source.title} (Copy)`,
      targetRole: source.targetRole,
      ...(source.jobAnalysisId ? { jobAnalysisId: source.jobAnalysisId } : {}),
      status: "draft",
      template: source.template,
      sections: source.sections,
    });
    sendJson(response, 201, success(copy));
    return true;
  }

  const sectionMatch = pathname.match(/^\/api\/resumes\/([^/]+)\/sections$/);
  if (sectionMatch && request.method === "PATCH") {
    const input = patchSchema.parse(await readJson(request));
    if (!input.sections) throw new ApiError(400, "VALIDATION_ERROR", "Sections are required");
    const filter = resumeFilter(userId, sectionMatch[1] ?? "");
    const update = await Resume.findOneAndUpdate(
      {
        ...filter,
        ...(input.expectedRevision !== undefined ? { revision: input.expectedRevision } : {}),
      },
      { $set: { sections: input.sections }, $inc: { revision: 1 } },
      { new: true, runValidators: true },
    )
      .lean()
      .exec();
    if (!update)
      throw new ApiError(409, "STALE_RESUME", "Resume changed elsewhere; reload before saving");
    sendJson(response, 200, success(update));
    return true;
  }

  const roleMatch = pathname.match(/^\/api\/resumes\/([^/]+)\/role$/);
  if (roleMatch && request.method === "PATCH") {
    const input = z
      .object({
        targetRole: z.string().trim().min(1).max(160),
        jobAnalysisId: z
          .string()
          .regex(/^[a-f\d]{24}$/i)
          .optional(),
        expectedRevision: z.number().int().min(0).optional(),
      })
      .parse(await readJson(request));
    const update = await Resume.findOneAndUpdate(
      {
        ...resumeFilter(userId, roleMatch[1] ?? ""),
        ...(input.expectedRevision !== undefined ? { revision: input.expectedRevision } : {}),
      },
      {
        $set: {
          targetRole: input.targetRole,
          ...(input.jobAnalysisId ? { jobAnalysisId: input.jobAnalysisId } : {}),
        },
        $inc: { revision: 1 },
      },
      { new: true, runValidators: true },
    )
      .lean()
      .exec();
    if (!update)
      throw new ApiError(409, "STALE_RESUME", "Resume changed elsewhere; reload before saving");
    sendJson(response, 200, success(update));
    return true;
  }

  const bulletMatch = pathname.match(/^\/api\/resumes\/([^/]+)\/bullets$/);
  if (bulletMatch && request.method === "POST") {
    const input = bulletSchema.parse(await readJson(request));
    const filter = resumeFilter(userId, bulletMatch[1] ?? "");
    const resume = await Resume.findOne(filter).exec();
    if (!resume) throw new ApiError(404, "RESUME_NOT_FOUND", "Resume was not found");
    const target = resume.sections.projects[0] ?? {};
    const bullets = Array.isArray(target.bullets) ? target.bullets : [];
    target.bullets = [...bullets, toBullet(input, bullets.length)];
    resume.markModified("sections");
    resume.revision += 1;
    await resume.save();
    sendJson(response, 201, success(resume));
    return true;
  }

  const importMatch = pathname.match(/^\/api\/resumes\/([^/]+)\/from-bullet\/([^/]+)$/);
  if (importMatch && request.method === "POST") {
    const resume = await Resume.findOne(resumeFilter(userId, importMatch[1] ?? "")).exec();
    if (!resume) throw new ApiError(404, "RESUME_NOT_FOUND", "Resume was not found");
    const bulletId = importMatch[2];
    if (!bulletId || !Types.ObjectId.isValid(bulletId))
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid bullet ID");
    const bullet = await ResumeBullet.findOne({
      _id: new Types.ObjectId(bulletId),
      userId: new Types.ObjectId(userId),
      approvalStatus: "approved",
      validationStatus: { $in: ["supported", "user_confirmed"] },
    }).exec();
    if (!bullet)
      throw new ApiError(
        409,
        "BULLET_NOT_APPROVED",
        "Only approved supported bullets can be added",
      );
    if (bullet.validationStatus !== "supported" && bullet.validationStatus !== "user_confirmed")
      throw new ApiError(409, "BULLET_NOT_APPROVED", "Bullet validation must be supported");
    const target = resume.sections.projects[0] ?? {};
    const bullets = Array.isArray(target.bullets) ? target.bullets : [];
    if (!bullets.some((item) => item.sourceBulletId === bullet._id.toString())) {
      target.bullets = [
        ...bullets,
        {
          bulletId: new Types.ObjectId().toString(),
          sourceBulletId: bullet._id.toString(),
          text: bullet.text,
          evidenceReferences: bullet.supportingEvidenceIds.map((value: Types.ObjectId) =>
            value.toString(),
          ),
          validationStatus: bullet.validationStatus,
          approvalStatus: "approved",
          displayOrder: bullets.length,
        },
      ];
      resume.markModified("sections");
      resume.revision += 1;
      await resume.save();
    }
    sendJson(response, 200, success(resume));
    return true;
  }

  const itemMatch = pathname.match(/^\/api\/resumes\/([^/]+)\/bullets\/([^/]+)$/);
  if (itemMatch && (request.method === "PATCH" || request.method === "DELETE")) {
    const filter = resumeFilter(userId, itemMatch[1] ?? "");
    const resume = await Resume.findOne(filter).exec();
    if (!resume) throw new ApiError(404, "RESUME_NOT_FOUND", "Resume was not found");
    const target = resume.sections.projects[0] ?? {};
    const bullets = Array.isArray(target.bullets) ? target.bullets : [];
    const index = bullets.findIndex((bullet) => bullet.bulletId === itemMatch[2]);
    if (index < 0) throw new ApiError(404, "BULLET_NOT_FOUND", "Resume bullet was not found");
    if (request.method === "DELETE") {
      bullets.splice(index, 1);
    } else {
      const patch = bulletPatchSchema.parse(await readJson(request));
      const current = bullets[index] as ResumeBulletValue;
      const sourceBulletId = patch.sourceBulletId ?? current.sourceBulletId;
      bullets[index] = {
        bulletId: current.bulletId,
        text: patch.text ?? current.text,
        evidenceReferences: patch.evidenceReferences ?? current.evidenceReferences,
        validationStatus: patch.validationStatus ?? current.validationStatus,
        approvalStatus: patch.approvalStatus ?? current.approvalStatus,
        displayOrder: current.displayOrder,
        ...(sourceBulletId ? { sourceBulletId } : {}),
      };
    }
    target.bullets = bullets.map((bullet, order) => ({ ...bullet, displayOrder: order }));
    resume.markModified("sections");
    resume.revision += 1;
    await resume.save();
    sendJson(response, 200, success(resume));
    return true;
  }

  const match = pathname.match(/^\/api\/resumes\/([^/]+)$/);
  if (!match || !match[1]) return false;
  const filter = resumeFilter(userId, match[1]);
  if (request.method === "GET") {
    const resume = await Resume.findOne(filter).lean().exec();
    if (!resume) throw new ApiError(404, "RESUME_NOT_FOUND", "Resume was not found");
    sendJson(response, 200, success(resume));
    return true;
  }
  if (request.method === "DELETE") {
    const deleted = await Resume.findOneAndDelete(filter).lean().exec();
    if (!deleted) throw new ApiError(404, "RESUME_NOT_FOUND", "Resume was not found");
    sendJson(response, 200, success({ deleted: true }));
    return true;
  }
  if (request.method === "PATCH") {
    const input = patchSchema.parse(await readJson(request));
    const { expectedRevision, sections, ...metadata } = input;
    const update = await Resume.findOneAndUpdate(
      { ...filter, ...(expectedRevision !== undefined ? { revision: expectedRevision } : {}) },
      { $set: { ...metadata, ...(sections ? { sections } : {}) }, $inc: { revision: 1 } },
      { new: true, runValidators: true },
    )
      .lean()
      .exec();
    if (!update)
      throw new ApiError(409, "STALE_RESUME", "Resume changed elsewhere; reload before saving");
    sendJson(response, 200, success(update));
    return true;
  }
  return false;
}
