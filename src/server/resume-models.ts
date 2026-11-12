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

export interface ResumeEducationValue extends Record<string, unknown> {
  institutionName?: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: Date;
  endDate?: Date;
  gradeOrGpa?: string;
  description?: string;
}

export interface ResumeExperienceValue extends Record<string, unknown> {
  organization?: string;
  jobTitle?: string;
  employmentType?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  currentlyWorking?: boolean;
  description?: string;
  responsibilities?: string[];
  achievements?: string[];
  bullets?: ResumeBulletValue[];
}

export interface ResumeProjectValue extends Record<string, unknown> {
  projectName?: string;
  description?: string;
  technologies?: string[];
  repositoryURL?: string;
  liveDeploymentURL?: string;
  startDate?: Date;
  endDate?: Date;
  projectRole?: string;
  personalContribution?: string;
  evidenceReferences?: string[];
  selectedForResume?: boolean;
  bullets?: ResumeBulletValue[];
}

export interface ResumeCertificationValue extends Record<string, unknown> {
  certificationName?: string;
  issuingOrganization?: string;
  issueDate?: Date;
  expirationDate?: Date;
  credentialId?: string;
  credentialURL?: string;
}

export interface ResumeAchievementValue extends Record<string, unknown> {
  title?: string;
  description?: string;
  category?: string;
  date?: Date;
  supportingEvidence?: string[];
  bullets?: ResumeBulletValue[];
}

export interface ResumeSections {
  personalInformation: Record<string, string>;
  professionalSummary: string;
  technicalSkills: string[];
  workExperience: ResumeExperienceValue[];
  projects: ResumeProjectValue[];
  education: ResumeEducationValue[];
  certifications: ResumeCertificationValue[];
  achievements: ResumeAchievementValue[];
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
    bulletId: { type: String, required: true, maxlength: 100 },
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

const educationSectionSchema = new Schema<ResumeEducationValue>(
  {
    institutionName: { type: String, trim: true, maxlength: 200 },
    degree: { type: String, trim: true, maxlength: 160 },
    fieldOfStudy: { type: String, trim: true, maxlength: 160 },
    startDate: Date,
    endDate: Date,
    gradeOrGpa: { type: String, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 2_000 },
  },
  { _id: false, strict: false },
);

const experienceSectionSchema = new Schema<ResumeExperienceValue>(
  {
    organization: { type: String, trim: true, maxlength: 200 },
    jobTitle: { type: String, trim: true, maxlength: 160 },
    employmentType: { type: String, trim: true, maxlength: 80 },
    location: { type: String, trim: true, maxlength: 160 },
    startDate: Date,
    endDate: Date,
    currentlyWorking: Boolean,
    description: { type: String, trim: true, maxlength: 2_000 },
    responsibilities: { type: [{ type: String, maxlength: 500 }], default: undefined },
    achievements: { type: [{ type: String, maxlength: 500 }], default: undefined },
    bullets: { type: [bulletSchema], default: undefined },
  },
  { _id: false, strict: false },
);

const projectSectionSchema = new Schema<ResumeProjectValue>(
  {
    projectName: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 3_000 },
    technologies: { type: [{ type: String, maxlength: 100 }], default: undefined },
    repositoryURL: { type: String, trim: true, maxlength: 2_048 },
    liveDeploymentURL: { type: String, trim: true, maxlength: 2_048 },
    startDate: Date,
    endDate: Date,
    projectRole: { type: String, trim: true, maxlength: 160 },
    personalContribution: { type: String, trim: true, maxlength: 2_000 },
    evidenceReferences: { type: [String], default: undefined },
    selectedForResume: Boolean,
    bullets: { type: [bulletSchema], default: undefined },
  },
  { _id: false, strict: false },
);

const certificationSectionSchema = new Schema<ResumeCertificationValue>(
  {
    certificationName: { type: String, trim: true, maxlength: 200 },
    issuingOrganization: { type: String, trim: true, maxlength: 200 },
    issueDate: Date,
    expirationDate: Date,
    credentialId: { type: String, trim: true, maxlength: 200 },
    credentialURL: { type: String, trim: true, maxlength: 2_048 },
  },
  { _id: false, strict: false },
);

const achievementSectionSchema = new Schema<ResumeAchievementValue>(
  {
    title: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2_000 },
    category: { type: String, trim: true, maxlength: 100 },
    date: Date,
    supportingEvidence: { type: [String], default: undefined },
    bullets: { type: [bulletSchema], default: undefined },
  },
  { _id: false, strict: false },
);

const sectionsSchema = new Schema<ResumeSections>(
  {
    personalInformation: { type: Schema.Types.Mixed, default: {} },
    professionalSummary: { type: String, maxlength: 4_000, default: "" },
    technicalSkills: { type: [String], default: [] },
    workExperience: { type: [experienceSectionSchema], default: [] },
    projects: { type: [projectSectionSchema], default: [] },
    education: { type: [educationSectionSchema], default: [] },
    certifications: { type: [certificationSectionSchema], default: [] },
    achievements: { type: [achievementSectionSchema], default: [] },
  },
  { _id: false, strict: false },
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
