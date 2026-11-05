import type { IncomingMessage, ServerResponse } from "node:http";
import { Types } from "mongoose";
import { z } from "zod";
import { ApiError, success } from "./api.js";
import { Evidence } from "./evidence-models.js";
import { Claim, claimCategories } from "./claim-models.js";
import { createClaim } from "./claim-service.js";
import { evidenceApprovalStatuses, evidenceTypes, evidenceSources } from "./evidence-types.js";

type SendJson = (response: ServerResponse, status: number, body: unknown) => void;
type ReadJson = (request: IncomingMessage) => Promise<unknown>;
const evidenceInput = z.object({
  evidenceType: z.enum(evidenceTypes),
  sourcePlatform: z.enum(evidenceSources),
  sourceReference: z.string().trim().min(1).max(2_048),
  relatedProfileField: z.string().trim().max(160).optional(),
  description: z.string().trim().min(1).max(4_000),
  payload: z.record(z.unknown()).optional(),
  sourceRecordId: z.string().trim().max(255).optional(),
  sourceURL: z.string().url().max(2_048).optional(),
});
const claimInput = z.object({
  claimText: z.string().trim().min(1).max(2_000),
  claimCategory: z.enum(claimCategories),
  supportingEvidenceIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i))
    .max(50)
    .optional(),
});

export async function handleEvidenceRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
  readJson: ReadJson,
  sendJson: SendJson,
): Promise<boolean> {
  if (pathname === "/api/evidence" && request.method === "GET") {
    const records = await Evidence.find({ userId: new Types.ObjectId(userId) })
      .sort({ collectedAt: -1 })
      .limit(200)
      .lean()
      .exec();
    sendJson(response, 200, success(records));
    return true;
  }
  if (pathname === "/api/evidence" && request.method === "POST") {
    const input = evidenceInput.parse(await readJson(request));
    const record = await Evidence.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        sourcePlatform: input.sourcePlatform,
        evidenceType: input.evidenceType,
        sourceReference: input.sourceReference,
      },
      {
        $set: { ...input, collectedAt: new Date() },
        $setOnInsert: {
          userId: new Types.ObjectId(userId),
          verificationStatus: "pending_review",
          approvalStatus: "pending",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();
    sendJson(response, 201, success(record));
    return true;
  }
  const evidenceMatch = pathname.match(/^\/api\/evidence\/([^/]+)\/(approve|reject)$/);
  if (evidenceMatch && request.method === "POST") {
    const id = evidenceMatch[1];
    if (!Types.ObjectId.isValid(id))
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid evidence ID");
    const approvalStatus = evidenceMatch[2] as (typeof evidenceApprovalStatuses)[number];
    const record = await Evidence.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      {
        $set: {
          approvalStatus,
          verificationStatus: approvalStatus === "approved" ? "user_confirmed" : "rejected",
        },
      },
      { new: true },
    ).exec();
    if (!record) throw new ApiError(404, "EVIDENCE_NOT_FOUND", "Evidence was not found");
    sendJson(response, 200, success(record));
    return true;
  }
  if (pathname === "/api/claims" && request.method === "GET") {
    const records = await Claim.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
      .exec();
    sendJson(response, 200, success(records));
    return true;
  }
  if (pathname === "/api/claims" && request.method === "POST") {
    const record = await createClaim(userId, claimInput.parse(await readJson(request)));
    sendJson(response, 201, success(record));
    return true;
  }
  return false;
}
