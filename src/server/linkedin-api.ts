import type { IncomingMessage, ServerResponse } from "node:http";
import { Types } from "mongoose";
import { ApiError, success } from "./api.js";
import { extractLinkedInPdf, LinkedInImport, readLinkedInUpload } from "./linkedin-import.js";
import { DeveloperProfile } from "./profile-models.js";
import { z } from "zod";

type SendJson = (response: ServerResponse, status: number, body: unknown) => void;
type ReadJson = (request: IncomingMessage) => Promise<unknown>;
const reviewSchema = z.object({
  section: z.enum(["basic", "skills", "experience", "education", "certifications"]),
  action: z.enum(["approve", "reject"]),
  data: z.unknown().optional(),
});

export async function handleLinkedInRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
  readJson: ReadJson,
  sendJson: SendJson,
): Promise<boolean> {
  if (!pathname.startsWith("/api/linkedin/")) return false;
  const ownerId = new Types.ObjectId(userId);
  if (pathname === "/api/linkedin/import" && request.method === "POST") {
    const buffer = await readLinkedInUpload(request);
    const extracted = await extractLinkedInPdf(buffer);
    const document = await LinkedInImport.create({
      userId: ownerId,
      status: "pending_review",
      extractedText: extracted.text,
      extraction: extracted,
      importedAt: new Date(),
    });
    sendJson(
      response,
      201,
      success({
        id: document.id,
        status: document.status,
        importedAt: document.importedAt,
        extraction: document.extraction,
      }),
    );
    return true;
  }
  if (pathname === "/api/linkedin/import/latest" && request.method === "GET") {
    const document = await LinkedInImport.findOne({ userId: ownerId })
      .sort({ importedAt: -1 })
      .exec();
    sendJson(
      response,
      200,
      success(
        document
          ? {
              id: document.id,
              status: document.status,
              importedAt: document.importedAt,
              extraction: document.extraction,
            }
          : null,
      ),
    );
    return true;
  }
  if (pathname.startsWith("/api/linkedin/import/")) {
    const suffix = pathname.slice("/api/linkedin/import/".length);
    const approve = suffix.endsWith("/approve");
    const id = approve ? suffix.slice(0, -"/approve".length) : suffix;
    if (!Types.ObjectId.isValid(id))
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid LinkedIn import ID");
    const document = await LinkedInImport.findOne({ _id: id, userId: ownerId }).exec();
    if (!document)
      throw new ApiError(404, "LINKEDIN_IMPORT_NOT_FOUND", "LinkedIn import was not found");
    if (request.method === "PATCH" && !approve) {
      const body = reviewSchema.parse(await readJson(request));
      if (body.data !== undefined) {
        document.extraction = { ...document.extraction, [body.section]: body.data };
      }
      document.sectionStatuses.set(
        body.section,
        body.action === "approve" ? "approved" : "rejected",
      );
      await document.save();
      sendJson(
        response,
        200,
        success({
          id: document.id,
          status: document.status,
          extraction: document.extraction,
          sectionStatuses: Object.fromEntries(document.sectionStatuses),
        }),
      );
      return true;
    }
    if (request.method === "POST" && approve) {
      const profile = await DeveloperProfile.findOneAndUpdate(
        { userId: ownerId },
        { $setOnInsert: { userId: ownerId } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).exec();
      const evidence = {
        sourceProvider: "linkedin",
        verificationStatus: "user_confirmed",
        importedAt: document.importedAt,
      };
      const extraction = document.extraction;
      if (document.sectionStatuses.get("skills") === "approved") {
        const skills = profile.technicalSkills as unknown as Array<Record<string, unknown>>;
        for (const name of extraction.skills) {
          if (!skills.some((item) => item.name === name)) {
            skills.push({
              name,
              normalizedName: name.toLowerCase(),
              category: "other",
              ...evidence,
            });
          }
        }
      }
      if (document.sectionStatuses.get("experience") === "approved") {
        const experience = profile.experience as unknown as Array<Record<string, unknown>>;
        for (const entry of extraction.experience) {
          if (
            !experience.some(
              (item) =>
                item.organization === entry.organization && item.jobTitle === entry.jobTitle,
            )
          ) {
            experience.push({
              ...entry,
              currentlyWorking: false,
              responsibilities: [],
              achievements: [],
              ...evidence,
            });
          }
        }
      }
      if (document.sectionStatuses.get("education") === "approved") {
        const education = profile.education as unknown as Array<Record<string, unknown>>;
        for (const entry of extraction.education) {
          if (
            !education.some(
              (item) =>
                item.institutionName === entry.institutionName && item.degree === entry.degree,
            )
          ) {
            education.push({ ...entry, ...evidence });
          }
        }
      }
      if (document.sectionStatuses.get("certifications") === "approved") {
        const certifications = profile.certifications as unknown as Array<Record<string, unknown>>;
        for (const entry of extraction.certifications) {
          if (!certifications.some((item) => item.certificationName === entry.certificationName)) {
            certifications.push({ ...entry, ...evidence });
          }
        }
      }
      await profile.save();
      document.status = "approved";
      document.reviewedAt = new Date();
      await document.save();
      sendJson(response, 200, success({ id: document.id, status: document.status }));
      return true;
    }
  }
  return false;
}
