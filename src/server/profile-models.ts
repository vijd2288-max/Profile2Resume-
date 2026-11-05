import { model, models, Schema, type Document, type Model, type Types } from "mongoose";
import { profileSourceProviders, skillCategories, verificationStatuses } from "./profile-types.js";

const sourceEvidenceSchema = new Schema(
  {
    sourceProvider: { type: String, enum: profileSourceProviders, required: true, default: "manual" },
    sourceRecordId: { type: String, trim: true, maxlength: 255 },
    sourceURL: { type: String, trim: true, maxlength: 2_048 },
    importedAt: { type: Date },
    updatedAt: { type: Date },
    verificationStatus: {
      type: String,
      enum: verificationStatuses,
      required: true,
      default: "pending_review",
    },
  },
  { _id: false },
);

const educationSchema = new Schema(
  {
    institutionName: { type: String, required: true, trim: true, maxlength: 200 },
    degree: { type: String, trim: true, maxlength: 160 },
    fieldOfStudy: { type: String, trim: true, maxlength: 160 },
    startDate: Date,
    endDate: Date,
    gradeOrGpa: { type: String, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 2_000 },
    ...sourceEvidenceSchema.obj,
  },
  { _id: true },
);

const experienceSchema = new Schema(
  {
    organization: { type: String, required: true, trim: true, maxlength: 200 },
    jobTitle: { type: String, trim: true, maxlength: 160 },
    employmentType: { type: String, trim: true, maxlength: 80 },
    location: { type: String, trim: true, maxlength: 160 },
    startDate: Date,
    endDate: Date,
    currentlyWorking: { type: Boolean, default: false },
    description: { type: String, trim: true, maxlength: 2_000 },
    responsibilities: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    ...sourceEvidenceSchema.obj,
  },
  { _id: true },
);

const technicalSkillSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    normalizedName: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, enum: skillCategories, required: true },
    proficiency: { type: String, trim: true, maxlength: 80 },
    lastUpdated: Date,
    ...sourceEvidenceSchema.obj,
  },
  { _id: true },
);

const projectSchema = new Schema(
  {
    projectName: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 3_000 },
    technologies: { type: [String], default: [] },
    repositoryURL: { type: String, trim: true, maxlength: 2_048 },
    liveDeploymentURL: { type: String, trim: true, maxlength: 2_048 },
    startDate: Date,
    endDate: Date,
    projectRole: { type: String, trim: true, maxlength: 160 },
    personalContribution: { type: String, trim: true, maxlength: 2_000 },
    evidenceReferences: { type: [String], default: [] },
    selectedForResume: { type: Boolean, default: false },
    ...sourceEvidenceSchema.obj,
  },
  { _id: true },
);

const certificationSchema = new Schema(
  {
    certificationName: { type: String, required: true, trim: true, maxlength: 200 },
    issuingOrganization: { type: String, trim: true, maxlength: 200 },
    issueDate: Date,
    expirationDate: Date,
    credentialId: { type: String, trim: true, maxlength: 200 },
    credentialURL: { type: String, trim: true, maxlength: 2_048 },
    ...sourceEvidenceSchema.obj,
  },
  { _id: true },
);

const achievementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2_000 },
    category: { type: String, trim: true, maxlength: 100 },
    date: Date,
    supportingEvidence: { type: [String], default: [] },
    ...sourceEvidenceSchema.obj,
  },
  { _id: true },
);

const codingStatisticsSchema = new Schema(
  {
    leetCodeUsername: { type: String, trim: true, maxlength: 100 },
    totalProblemsSolved: { type: Number, min: 0 },
    easyProblemsSolved: { type: Number, min: 0 },
    mediumProblemsSolved: { type: Number, min: 0 },
    hardProblemsSolved: { type: Number, min: 0 },
    contestRating: { type: Number, min: 0 },
    globalRanking: { type: Number, min: 1 },
    profileURL: { type: String, trim: true, maxlength: 2_048 },
    lastUpdatedAt: Date,
    dataSource: { type: String, trim: true, maxlength: 100 },
    userConfirmationStatus: { type: String, enum: verificationStatuses },
    ...sourceEvidenceSchema.obj,
  },
  { _id: false },
);

export interface DeveloperProfileDocument extends Document {
  userId: Types.ObjectId;
  basicInformation: {
    fullName?: string;
    professionalHeadline?: string;
    email?: string;
    phone?: string;
    location?: string;
    profileImage?: string;
    personalWebsite?: string;
    githubURL?: string;
    linkedInURL?: string;
    leetCodeURL?: string;
    portfolioURL?: string;
  };
  education: Types.DocumentArray<unknown>;
  experience: Types.DocumentArray<unknown>;
  technicalSkills: Types.DocumentArray<unknown>;
  projects: Types.DocumentArray<unknown>;
  certifications: Types.DocumentArray<unknown>;
  achievements: Types.DocumentArray<unknown>;
  codingStatistics?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const developerProfileSchema = new Schema<DeveloperProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    basicInformation: {
      fullName: { type: String, trim: true, maxlength: 120 },
      professionalHeadline: { type: String, trim: true, maxlength: 240 },
      email: { type: String, trim: true, lowercase: true, maxlength: 320 },
      phone: { type: String, trim: true, maxlength: 40 },
      location: { type: String, trim: true, maxlength: 160 },
      profileImage: { type: String, trim: true, maxlength: 2_048 },
      personalWebsite: { type: String, trim: true, maxlength: 2_048 },
      githubURL: { type: String, trim: true, maxlength: 2_048 },
      linkedInURL: { type: String, trim: true, maxlength: 2_048 },
      leetCodeURL: { type: String, trim: true, maxlength: 2_048 },
      portfolioURL: { type: String, trim: true, maxlength: 2_048 },
    },
    education: { type: [educationSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    technicalSkills: { type: [technicalSkillSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
    achievements: { type: [achievementSchema], default: [] },
    codingStatistics: { type: codingStatisticsSchema },
  },
  { timestamps: true, versionKey: false },
);

developerProfileSchema.index({ userId: 1 }, { unique: true });
developerProfileSchema.index({ userId: 1, "technicalSkills.normalizedName": 1 });
developerProfileSchema.index({ userId: 1, "projects.selectedForResume": 1 });

export const DeveloperProfile: Model<DeveloperProfileDocument> =
  (models.DeveloperProfile as Model<DeveloperProfileDocument> | undefined) ??
  model<DeveloperProfileDocument>("DeveloperProfile", developerProfileSchema);
