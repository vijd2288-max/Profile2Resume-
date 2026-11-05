import { model, models, Schema, type Document, type Model, type Types } from "mongoose";
import type { JobAnalysis } from "./ai-schemas.js";

export interface JobDescriptionAnalysisDocument extends Document {
  userId: Types.ObjectId;
  title: string;
  description: string;
  descriptionHash: string;
  analysis: JobAnalysis;
  missingProfileInformation: string[];
  createdAt: Date;
  updatedAt: Date;
}

const analysisSchema = new Schema<JobDescriptionAnalysisDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 30_000 },
    descriptionHash: { type: String, required: true, index: true },
    analysis: { type: Schema.Types.Mixed, required: true },
    missingProfileInformation: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false },
);
analysisSchema.index({ userId: 1, createdAt: -1 });

export const JobDescriptionAnalysis: Model<JobDescriptionAnalysisDocument> =
  (models.JobDescriptionAnalysis as Model<JobDescriptionAnalysisDocument> | undefined) ??
  model<JobDescriptionAnalysisDocument>("JobDescriptionAnalysis", analysisSchema);
