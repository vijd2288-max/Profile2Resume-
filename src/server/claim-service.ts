import { Types } from "mongoose";
import { Evidence } from "./evidence-models.js";
import { Claim, type ClaimCategory, type ClaimSupportStatus } from "./claim-models.js";

export function supportStatusForEvidence(
  evidenceCount: number,
  userConfirmed: boolean,
): ClaimSupportStatus {
  if (userConfirmed && evidenceCount > 0) return "user_confirmed";
  if (evidenceCount > 1) return "directly_supported";
  if (evidenceCount === 1) return "partially_supported";
  return "unsupported";
}

export async function createClaim(
  userId: string,
  input: { claimText: string; claimCategory: ClaimCategory; supportingEvidenceIds?: string[] },
) {
  const ownerId = new Types.ObjectId(userId);
  const ids = (input.supportingEvidenceIds ?? []).map((id) => new Types.ObjectId(id));
  const evidence = ids.length
    ? await Evidence.find({ _id: { $in: ids }, userId: ownerId })
        .select("_id sourcePlatform verificationStatus")
        .exec()
    : [];
  const verifiedIds = evidence.map((item) => item._id);
  const document = await Claim.create({
    userId: ownerId,
    claimText: input.claimText,
    claimCategory: input.claimCategory,
    supportingEvidenceIds: verifiedIds,
    ...(evidence[0]?.sourcePlatform ? { evidenceSource: evidence[0].sourcePlatform } : {}),
    verificationState: evidence.some((item) => item.verificationStatus === "user_confirmed")
      ? "user_confirmed"
      : "pending_review",
    approvalState: "pending",
    supportStatus: supportStatusForEvidence(evidence.length, false),
  });
  return document;
}
