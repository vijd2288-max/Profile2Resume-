import { model, models, Schema, type Document, type Model, type Types } from "mongoose";

const githubProfileSchema = new Schema(
  {
    githubId: { type: Number, required: true },
    username: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true },
    profileURL: { type: String, required: true, trim: true },
    avatarURL: { type: String, required: true, trim: true },
    publicRepositoryCount: { type: Number, min: 0 },
    synchronizedAt: { type: Date, required: true },
  },
  { _id: false },
);

const githubRepositorySchema = new Schema(
  {
    githubId: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    repositoryURL: { type: String, required: true, trim: true },
    homepageURL: { type: String, trim: true },
    primaryLanguage: { type: String, trim: true },
    topics: { type: [String], default: [] },
    isFork: { type: Boolean, required: true },
    isArchived: { type: Boolean, required: true },
    createdAtGithub: Date,
    lastPushedAt: Date,
    stars: { type: Number, min: 0 },
    forks: { type: Number, min: 0 },
    defaultBranch: String,
    size: { type: Number, min: 0 },
    visibility: String,
    languages: { type: Map, of: Number, default: {} },
    readmeContent: { type: String, maxlength: 50_000 },
    readmeURL: String,
    lastCommitURL: String,
    lastCommitDate: Date,
    rankingScore: { type: Number, min: 0 },
    rankingExplanation: String,
    rankingSignals: { type: [String], default: [] },
    missingInformation: { type: [String], default: [] },
    recommended: { type: Boolean, default: false },
    synchronizedAt: { type: Date, required: true },
    selectedForResume: { type: Boolean, default: false },
    userEdited: { type: Boolean, default: false },
  },
  { _id: true },
);

export interface GithubRepositoryDocument extends Document {
  userId: Types.ObjectId;
  githubId: number;
  name: string;
  fullName: string;
  description?: string;
  repositoryURL: string;
  homepageURL?: string;
  primaryLanguage?: string;
  topics: string[];
  isFork: boolean;
  isArchived: boolean;
  createdAtGithub?: Date;
  lastPushedAt?: Date;
  stars: number;
  forks: number;
  defaultBranch?: string;
  size: number;
  visibility?: string;
  languages: Map<string, number>;
  readmeContent?: string;
  readmeURL?: string;
  lastCommitURL?: string;
  lastCommitDate?: Date;
  rankingScore?: number;
  rankingExplanation?: string;
  rankingSignals: string[];
  missingInformation: string[];
  recommended: boolean;
  synchronizedAt: Date;
  selectedForResume: boolean;
  userEdited: boolean;
}

export interface GithubImportDocument extends Document {
  userId: Types.ObjectId;
  profile: {
    githubId: number;
    username: string;
    displayName?: string;
    profileURL: string;
    avatarURL: string;
    publicRepositoryCount?: number;
    synchronizedAt: Date;
  };
  repositories: Types.DocumentArray<GithubRepositoryDocument>;
  synchronizationStatus: "idle" | "running" | "partial" | "failed";
  lastSynchronizedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const githubImportSchema = new Schema<GithubImportDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    profile: { type: githubProfileSchema },
    repositories: { type: [githubRepositorySchema], default: [] },
    synchronizationStatus: {
      type: String,
      enum: ["idle", "running", "partial", "failed"],
      default: "idle",
    },
    lastSynchronizedAt: Date,
    lastError: String,
  },
  { timestamps: true, versionKey: false },
);

githubImportSchema.index({ userId: 1 }, { unique: true });
githubImportSchema.index({ userId: 1, "repositories.githubId": 1 }, { unique: true, sparse: true });

export const GithubImport: Model<GithubImportDocument> =
  (models.GithubImport as Model<GithubImportDocument> | undefined) ??
  model<GithubImportDocument>("GithubImport", githubImportSchema);

export type NormalizedGithubRepository = Omit<GithubRepositoryDocument, keyof Document | "userId">;
