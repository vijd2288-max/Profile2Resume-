import { model, models, Schema, type Document, type Model, type Types } from "mongoose";

export type ResumeStatus = "draft" | "ready" | "archived";
export type ResumeApprovalStatus = "pending" | "approved" | "rejected";
export type ResumeValidationStatus =
  "supported" | "partially_supported" | "user_confirmed" | "unsupported" | "requires_clarification";

export interface ResumeBulletValue {
  bulletId: string;
  text: string;
  evidenceReferences: string[];
  validationStatus: ResumeValidationStatus;
  approvalStatus: ResumeApprovalStatus;
  displayOrder: number;
  sourceBulletId?: string;
}

export interface ResumeSections {
  personalInformation: Record<string, string>;
  professionalSummary: string;
  technicalSkills: string[];
  workExperience: Array<Record<string, unknown> & { bullets?: ResumeBulletValue[] }>;
  projects: Array<Record<string, unknown> & { bullets?: ResumeBulletValue[] }>;
  education: Array<Record<string, unknown>>;
  certifications: Array<Record<string, unknown>>;
  achievements: Array<Record<string, unknown> & { bullets?: ResumeBulletValue[] }>;
}

export interface ResumeDocument extends Document {
  userId: Types.ObjectId;
  title: string;
  targetRole: string;
  jobAnalysisId?: Types.ObjectId;
  status: ResumeStatus;
  template: string;
  sections: ResumeSections;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResumeVersionDocument extends Document {
  userId: Types.ObjectId;
  resumeId: Types.ObjectId;
  versionNumber: number;
  reason: "created" | "checkpoint" | "restored" | "manual";
  snapshot: ResumeSections;
  title: string;
  targetRole: string;
  createdAt: Date;
}

const bulletSchema = new Schema<ResumeBulletValue>(
  {
    bulletId: { type: String, required: true, trim: true, maxlength: 100 },
    text: { type: String, required: true, trim: true, maxlength: 1_000 },
    evidenceReferences: { type: [String], default: [] },
    validationStatus: {
      type: String,
      enum: [
        "supported",
        "partially_supported",
        "user_confirmed",
        "unsupported",
        "requires_clarification",
      ],
      required: true,
    },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], required: true },
    displayOrder: { type: Number, min: 0, required: true },
    sourceBulletId: { type: String, maxlength: 100 },
  },
  { _id: false },
);

const sectionsSchema = new Schema<ResumeSections>(
  {
    personalInformation: { type: Schema.Types.Mixed, default: {} },
    professionalSummary: { type: String, maxlength: 4_000, default: "" },
    technicalSkills: { type: [String], default: [] },
    workExperience: { type: [Schema.Types.Mixed], default: [] },
    projects: { type: [Schema.Types.Mixed], default: [] },
    education: { type: [Schema.Types.Mixed], default: [] },
    certifications: { type: [Schema.Types.Mixed], default: [] },
    achievements: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false },
);

const resumeSchema = new Schema<ResumeDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    targetRole: { type: String, required: true, trim: true, maxlength: 160 },
    jobAnalysisId: { type: Schema.Types.ObjectId, ref: "JobDescriptionAnalysis" },
    status: { type: String, enum: ["draft", "ready", "archived"], default: "draft" },
    template: { type: String, required: true, trim: true, maxlength: 80, default: "classic" },
    sections: { type: sectionsSchema, required: true },
    revision: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true, versionKey: false },
);
resumeSchema.index({ userId: 1, updatedAt: -1 });
resumeSchema.index({ userId: 1, status: 1 });

const versionSchema = new Schema<ResumeVersionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true },
    versionNumber: { type: Number, required: true, min: 1 },
    reason: { type: String, enum: ["created", "checkpoint", "restored", "manual"], required: true },
    snapshot: { type: sectionsSchema, required: true },
    title: { type: String, required: true, maxlength: 160 },
    targetRole: { type: String, required: true, maxlength: 160 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);
versionSchema.index({ userId: 1, resumeId: 1, versionNumber: -1 }, { unique: true });

export const Resume: Model<ResumeDocument> =
  (models.Resume as Model<ResumeDocument> | undefined) ??
  model<ResumeDocument>("Resume", resumeSchema);
export const ResumeVersion: Model<ResumeVersionDocument> =
  (models.ResumeVersion as Model<ResumeVersionDocument> | undefined) ??
  model<ResumeVersionDocument>("ResumeVersion", versionSchema);

export function emptyResumeSections(): ResumeSections {
  return {
    personalInformation: {},
    professionalSummary: "",
    technicalSkills: [],
    workExperience: [],
    projects: [],
    education: [],
    certifications: [],
    achievements: [],
  };
}
