import { model, models, Schema, type Document, type Model, type Types } from "mongoose";
import {
  evidenceApprovalStatuses,
  evidenceSources,
  evidenceTypes,
  evidenceVerificationStatuses,
  type EvidenceApprovalStatus,
  type EvidenceSource,
  type EvidenceType,
  type EvidenceVerificationStatus,
} from "./evidence-types.js";

export interface EvidenceDocument extends Document {
  userId: Types.ObjectId;
  evidenceType: EvidenceType;
  sourcePlatform: EvidenceSource;
  sourceReference: string;
  relatedProjectId?: Types.ObjectId;
  relatedProfileField?: string;
  description: string;
  payload?: Record<string, unknown>;
  collectedAt: Date;
  verificationStatus: EvidenceVerificationStatus;
  approvalStatus: EvidenceApprovalStatus;
  sourceRecordId?: string;
  sourceURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

const evidenceSchema = new Schema<EvidenceDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    evidenceType: { type: String, enum: evidenceTypes, required: true },
    sourcePlatform: { type: String, enum: evidenceSources, required: true },
    sourceReference: { type: String, required: true, trim: true, maxlength: 2_048 },
    relatedProjectId: { type: Schema.Types.ObjectId },
    relatedProfileField: { type: String, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 4_000 },
    payload: { type: Schema.Types.Mixed },
    collectedAt: { type: Date, required: true },
    verificationStatus: {
      type: String,
      enum: evidenceVerificationStatuses,
      required: true,
      default: "pending_review",
    },
    approvalStatus: {
      type: String,
      enum: evidenceApprovalStatuses,
      required: true,
      default: "pending",
    },
    sourceRecordId: { type: String, trim: true, maxlength: 255 },
    sourceURL: { type: String, trim: true, maxlength: 2_048 },
  },
  { timestamps: true, versionKey: false },
);

evidenceSchema.index(
  { userId: 1, sourcePlatform: 1, evidenceType: 1, sourceReference: 1 },
  { unique: true },
);
evidenceSchema.index({ userId: 1, approvalStatus: 1, collectedAt: -1 });
evidenceSchema.index({ userId: 1, relatedProjectId: 1 });

export const Evidence: Model<EvidenceDocument> =
  (models.Evidence as Model<EvidenceDocument> | undefined) ??
  model<EvidenceDocument>("Evidence", evidenceSchema);
