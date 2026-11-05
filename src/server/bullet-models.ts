import { model, models, Schema, type Document, type Model, type Types } from "mongoose";

export interface ResumeBulletDocument extends Document {
  userId: Types.ObjectId;
  analysisId: Types.ObjectId;
  text: string;
  targetRole: string;
  relevantSkills: string[];
  supportingEvidenceIds: Types.ObjectId[];
  validationStatus:
    "pending" | "supported" | "partially_supported" | "unsupported" | "requires_clarification";
  validationExplanation?: string;
  approvalStatus: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const bulletSchema = new Schema<ResumeBulletDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    analysisId: { type: Schema.Types.ObjectId, ref: "JobDescriptionAnalysis", required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    targetRole: { type: String, required: true, trim: true, maxlength: 120 },
    relevantSkills: { type: [String], default: [] },
    supportingEvidenceIds: { type: [Schema.Types.ObjectId], ref: "Evidence", default: [] },
    validationStatus: {
      type: String,
      enum: [
        "pending",
        "supported",
        "partially_supported",
        "unsupported",
        "requires_clarification",
      ],
      default: "pending",
    },
    validationExplanation: { type: String, maxlength: 1_000 },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true, versionKey: false },
);
bulletSchema.index({ userId: 1, analysisId: 1, createdAt: -1 });

export const ResumeBullet: Model<ResumeBulletDocument> =
  (models.ResumeBullet as Model<ResumeBulletDocument> | undefined) ??
  model<ResumeBulletDocument>("ResumeBullet", bulletSchema);
