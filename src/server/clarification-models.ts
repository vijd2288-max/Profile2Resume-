import { model, models, Schema, type Document, type Model, type Types } from "mongoose";

export interface ClarificationQuestionDocument extends Document {
  userId: Types.ObjectId;
  analysisId: Types.ObjectId;
  question: string;
  category: "project_outcome" | "contribution" | "technology" | "metric" | "deployment";
  relatedProjectId?: Types.ObjectId;
  priority: number;
  status: "open" | "answered" | "skipped";
  response?: string;
  answeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const clarificationSchema = new Schema<ClarificationQuestionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    analysisId: { type: Schema.Types.ObjectId, ref: "JobDescriptionAnalysis", required: true },
    question: { type: String, required: true, trim: true, maxlength: 500 },
    category: {
      type: String,
      enum: ["project_outcome", "contribution", "technology", "metric", "deployment"],
      required: true,
    },
    relatedProjectId: { type: Schema.Types.ObjectId },
    priority: { type: Number, min: 0, max: 100, required: true },
    status: { type: String, enum: ["open", "answered", "skipped"], default: "open" },
    response: { type: String, trim: true, maxlength: 2_000 },
    answeredAt: Date,
  },
  { timestamps: true, versionKey: false },
);
clarificationSchema.index({ userId: 1, analysisId: 1, question: 1 }, { unique: true });

export const ClarificationQuestion: Model<ClarificationQuestionDocument> =
  (models.ClarificationQuestion as Model<ClarificationQuestionDocument> | undefined) ??
  model<ClarificationQuestionDocument>("ClarificationQuestion", clarificationSchema);
