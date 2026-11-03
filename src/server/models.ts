import { Schema, model, models, type Document, type Model, type Types } from "mongoose";

export const integrationProviders = ["github", "linkedin", "leetcode"] as const;
export type IntegrationProvider = (typeof integrationProviders)[number];
export const integrationStatuses = ["connected", "disconnected", "error"] as const;
export type IntegrationStatus = (typeof integrationStatuses)[number];

export interface UserDocument extends Document {
  name?: string;
  email: string;
  profileImage?: string;
  emailVerified: boolean;
  authProvider: "github";
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 320 },
    profileImage: { type: String, trim: true, maxlength: 2_048 },
    emailVerified: { type: Boolean, default: false },
    authProvider: { type: String, enum: ["github"], required: true },
  },
  { timestamps: true, versionKey: false },
);

userSchema.index({ email: 1 }, { unique: true });

export interface AccountIntegrationDocument extends Document {
  userId: Types.ObjectId;
  provider: IntegrationProvider;
  providerAccountId: string;
  encryptedAccessToken?: string;
  status: IntegrationStatus;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const accountIntegrationSchema = new Schema<AccountIntegrationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: integrationProviders, required: true },
    providerAccountId: { type: String, required: true, trim: true, maxlength: 255 },
    encryptedAccessToken: { type: String, select: false },
    status: { type: String, enum: integrationStatuses, default: "connected", required: true },
    lastSyncedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

accountIntegrationSchema.index({ userId: 1, provider: 1 }, { unique: true });
accountIntegrationSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });

export const User: Model<UserDocument> =
  (models.User as Model<UserDocument> | undefined) ?? model<UserDocument>("User", userSchema);

export const AccountIntegration: Model<AccountIntegrationDocument> =
  (models.AccountIntegration as Model<AccountIntegrationDocument> | undefined) ??
  model<AccountIntegrationDocument>("AccountIntegration", accountIntegrationSchema);

export async function disconnectIntegration(
  userId: Types.ObjectId,
  provider: IntegrationProvider,
): Promise<void> {
  await AccountIntegration.updateOne(
    { userId, provider },
    { $set: { status: "disconnected" }, $unset: { encryptedAccessToken: 1 } },
  );
}
