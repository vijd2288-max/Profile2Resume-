import { z } from "zod";
import { profileSourceProviders, skillCategories, verificationStatuses } from "./profile-types.js";

const optionalText = (max: number) => z.string().trim().max(max).optional();
const optionalURL = z.string().trim().url().max(2_048).optional();
const optionalDate = z.coerce.date().optional();
const sourceEvidenceSchema = z.object({
  sourceProvider: z.enum(profileSourceProviders).default("manual"),
  sourceRecordId: optionalText(255),
  sourceURL: optionalURL,
  importedAt: optionalDate,
  updatedAt: optionalDate,
  verificationStatus: z.enum(verificationStatuses).optional(),
});

export const basicInformationSchema = z.object({
  fullName: optionalText(120),
  professionalHeadline: optionalText(240),
  email: z.string().trim().email().max(320).optional(),
  phone: optionalText(40),
  location: optionalText(160),
  profileImage: optionalURL,
  personalWebsite: optionalURL,
  githubURL: optionalURL,
  linkedInURL: optionalURL,
  leetCodeURL: optionalURL,
  portfolioURL: optionalURL,
});

const dateRange = (shape: Record<string, z.ZodTypeAny>) =>
  z.object(shape).refine((value) => {
    const start = value.startDate as Date | undefined;
    const end = value.endDate as Date | undefined;
    return !start || !end || start <= end;
  }, "End date must be on or after start date");

export const educationSchema = dateRange({
  institutionName: z.string().trim().min(1).max(200),
  degree: optionalText(160),
  fieldOfStudy: optionalText(160),
  startDate: optionalDate,
  endDate: optionalDate,
  gradeOrGpa: optionalText(80),
  description: optionalText(2_000),
  ...sourceEvidenceSchema.shape,
});

export const experienceSchema = dateRange({
  organization: z.string().trim().min(1).max(200),
  jobTitle: optionalText(160),
  employmentType: optionalText(80),
  location: optionalText(160),
  startDate: optionalDate,
  endDate: optionalDate,
  currentlyWorking: z.boolean().default(false),
  description: optionalText(2_000),
  responsibilities: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
  achievements: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
  ...sourceEvidenceSchema.shape,
});

export const skillSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.enum(skillCategories),
  proficiency: optionalText(80),
  lastUpdated: optionalDate,
  ...sourceEvidenceSchema.shape,
});

export const projectSchema = dateRange({
  projectName: z.string().trim().min(1).max(200),
  description: optionalText(3_000),
  technologies: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  repositoryURL: optionalURL,
  liveDeploymentURL: optionalURL,
  startDate: optionalDate,
  endDate: optionalDate,
  projectRole: optionalText(160),
  personalContribution: optionalText(2_000),
  evidenceReferences: z.array(z.string().trim().url().max(2_048)).max(30).default([]),
  selectedForResume: z.boolean().default(false),
  ...sourceEvidenceSchema.shape,
});

export const certificationSchema = dateRange({
  certificationName: z.string().trim().min(1).max(200),
  issuingOrganization: optionalText(200),
  issueDate: optionalDate,
  expirationDate: optionalDate,
  credentialId: optionalText(200),
  credentialURL: optionalURL,
  ...sourceEvidenceSchema.shape,
});

export const achievementSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalText(2_000),
  category: optionalText(100),
  date: optionalDate,
  supportingEvidence: z.array(z.string().trim().url().max(2_048)).max(30).default([]),
  ...sourceEvidenceSchema.shape,
});

export const codingStatisticsSchema = z.object({
  leetCodeUsername: optionalText(100),
  totalProblemsSolved: z.number().int().nonnegative().optional(),
  easyProblemsSolved: z.number().int().nonnegative().optional(),
  mediumProblemsSolved: z.number().int().nonnegative().optional(),
  hardProblemsSolved: z.number().int().nonnegative().optional(),
  contestRating: z.number().nonnegative().optional(),
  globalRanking: z.number().int().positive().optional(),
  profileURL: optionalURL,
  lastUpdatedAt: optionalDate,
  dataSource: optionalText(100),
  userConfirmationStatus: z.enum(verificationStatuses).optional(),
  ...sourceEvidenceSchema.shape,
});

export const profilePatchSchema = basicInformationSchema.partial();
export const profileRecordSchemas = {
  education: educationSchema,
  experience: experienceSchema,
  skills: skillSchema,
  projects: projectSchema,
  certifications: certificationSchema,
  achievements: achievementSchema,
  "coding-statistics": codingStatisticsSchema,
} as const;
