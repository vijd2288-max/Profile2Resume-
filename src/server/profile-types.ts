export const profileSourceProviders = ["github", "linkedin", "leetcode", "manual"] as const;
export type ProfileSourceProvider = (typeof profileSourceProviders)[number];

export const verificationStatuses = [
  "imported",
  "pending_review",
  "user_confirmed",
  "rejected",
] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

export const skillCategories = [
  "programming_languages",
  "frontend",
  "backend",
  "databases",
  "ai_ml",
  "cloud_devops",
  "developer_tools",
  "other",
] as const;
export type SkillCategory = (typeof skillCategories)[number];

export type SourceEvidence = {
  sourceProvider: ProfileSourceProvider;
  sourceRecordId?: string;
  sourceURL?: string;
  importedAt?: Date;
  updatedAt?: Date;
  verificationStatus: VerificationStatus;
};

export type BasicInformation = {
  fullName?: string;
  professionalHeadline?: string;
  summary?: string;
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

export type Education = SourceEvidence & {
  _id?: string;
  institutionName: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: Date;
  endDate?: Date;
  gradeOrGpa?: string;
  description?: string;
};

export type Experience = SourceEvidence & {
  _id?: string;
  organization: string;
  jobTitle?: string;
  employmentType?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  currentlyWorking: boolean;
  description?: string;
  responsibilities: string[];
  achievements: string[];
};

export type TechnicalSkill = SourceEvidence & {
  _id?: string;
  name: string;
  normalizedName: string;
  category: SkillCategory;
  proficiency?: string;
  lastUpdated?: Date;
};

export type Project = SourceEvidence & {
  _id?: string;
  projectName: string;
  description?: string;
  technologies: string[];
  repositoryURL?: string;
  liveDeploymentURL?: string;
  startDate?: Date;
  endDate?: Date;
  projectRole?: string;
  personalContribution?: string;
  evidenceReferences: string[];
  selectedForResume: boolean;
};

export type Certification = SourceEvidence & {
  _id?: string;
  certificationName: string;
  issuingOrganization?: string;
  issueDate?: Date;
  expirationDate?: Date;
  credentialId?: string;
  credentialURL?: string;
};

export type Achievement = SourceEvidence & {
  _id?: string;
  title: string;
  description?: string;
  category?: string;
  date?: Date;
  supportingEvidence: string[];
};

export type CodingStatistics = SourceEvidence & {
  leetCodeUsername?: string;
  totalProblemsSolved?: number;
  easyProblemsSolved?: number;
  mediumProblemsSolved?: number;
  hardProblemsSolved?: number;
  contestRating?: number;
  globalRanking?: number;
  profileURL?: string;
  lastUpdatedAt?: Date;
  dataSource?: string;
  userConfirmationStatus?: VerificationStatus;
};

export type DeveloperProfile = {
  userId: string;
  basicInformation: BasicInformation;
  education: Education[];
  experience: Experience[];
  technicalSkills: TechnicalSkill[];
  projects: Project[];
  certifications: Certification[];
  achievements: Achievement[];
  codingStatistics?: CodingStatistics;
  createdAt: Date;
  updatedAt: Date;
};
