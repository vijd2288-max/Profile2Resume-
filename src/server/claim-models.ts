import { model, models, Schema, type Document, type Model, type Types } from "mongoose";
import {
  evidenceSources,
  evidenceVerificationStatuses,
  type EvidenceSource,
  type EvidenceVerificationStatus,
} from "./evidence-types.js";

export const claimCategories = [
  "technical_skill",
  "project",
  "technology",
  "experience",
  "education",
  "certification",
  "achievement",
  "metric",
] as const;
export type ClaimCategory = (typeof claimCategories)[number];
export const claimSupportStatuses = [
  "directly_supported",
  "partially_supported",
  "user_confirmed",
  "unsupported",
] as const;
export type ClaimSupportStatus = (typeof claimSupportStatuses)[number];

export interface ClaimDocument extends Document {
  userId: Types.ObjectId;
  claimText: string;
  claimCategory: ClaimCategory;
  supportingEvidenceIds: Types.ObjectId[];
  evidenceSource?: EvidenceSource;
  verificationState: EvidenceVerificationStatus;
  approvalState: "pending" | "approved" | "rejected";
  supportStatus: ClaimSupportStatus;
  createdAt: Date;
  updatedAt: Date;
}

const claimSchema = new Schema<ClaimDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    claimText: { type: String, required: true, trim: true, maxlength: 2_000 },
    claimCategory: { type: String, enum: claimCategories, required: true },
    supportingEvidenceIds: { type: [Schema.Types.ObjectId], ref: "Evidence", default: [] },
    evidenceSource: { type: String, enum: evidenceSources },
    verificationState: {
      type: String,
      enum: evidenceVerificationStatuses,
      required: true,
      default: "pending_review",
    },
    approvalState: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      required: true,
      default: "pending",
    },
    supportStatus: {
      type: String,
      enum: claimSupportStatuses,
      required: true,
      default: "unsupported",
    },
  },
  { timestamps: true, versionKey: false },
);
claimSchema.index({ userId: 1, claimCategory: 1, createdAt: -1 });
claimSchema.index({ userId: 1, supportingEvidenceIds: 1 });

export const Claim: Model<ClaimDocument> =
  (models.Claim as Model<ClaimDocument> | undefined) ?? model<ClaimDocument>("Claim", claimSchema);
