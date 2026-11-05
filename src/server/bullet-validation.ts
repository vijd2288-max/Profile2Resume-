import { type Types } from "mongoose";
import { Evidence } from "./evidence-models.js";

export type BulletValidation = {
  status:
    | "supported"
    | "partially_supported"
    | "user_confirmed"
    | "unsupported"
    | "requires_clarification";
  explanation: string;
  evidenceIds: Types.ObjectId[];
};

const metricPattern = /\b\d+(?:[.,]\d+)?%?\b/;

export async function validateBullet(
  userId: string,
  text: string,
  supportingEvidenceIds: Types.ObjectId[],
): Promise<BulletValidation> {
  const evidence = await Evidence.find({
    _id: { $in: supportingEvidenceIds },
    userId,
  })
    .select("_id sourcePlatform verificationStatus approvalStatus description")
    .lean()
    .exec();
  if (!evidence.length) {
    return {
      status: "unsupported",
      explanation: "No user-owned evidence supports this bullet.",
      evidenceIds: [],
    };
  }
  if (metricPattern.test(text) && evidence.some((item) => item.sourcePlatform === "manual")) {
    return {
      status: "requires_clarification",
      explanation: "The metric is manually provided and requires explicit user confirmation.",
      evidenceIds: evidence.map((item) => item._id),
    };
  }
  const confirmed = evidence.every(
    (item) => item.verificationStatus === "user_confirmed" && item.approvalStatus === "approved",
  );
  if (confirmed) {
    return {
      status: "user_confirmed",
      explanation: "All referenced evidence was explicitly confirmed by the user.",
      evidenceIds: evidence.map((item) => item._id),
    };
  }
  const approved = evidence.filter((item) => item.approvalStatus === "approved");
  return {
    status: approved.length === evidence.length ? "supported" : "partially_supported",
    explanation:
      approved.length === evidence.length
        ? "Every referenced evidence record is approved."
        : "Some referenced evidence records still require review.",
    evidenceIds: evidence.map((item) => item._id),
  };
}
