export const evidenceTypes = [
  "github_repository",
  "github_readme",
  "github_commit",
  "github_languages",
  "linkedin_experience",
  "linkedin_education",
  "linkedin_skill",
  "leetcode_statistics",
  "user_provided",
] as const;
export type EvidenceType = (typeof evidenceTypes)[number];

export const evidenceSources = ["github", "linkedin", "leetcode", "manual"] as const;
export type EvidenceSource = (typeof evidenceSources)[number];

export const evidenceVerificationStatuses = [
  "imported",
  "pending_review",
  "user_confirmed",
  "rejected",
] as const;
export type EvidenceVerificationStatus = (typeof evidenceVerificationStatuses)[number];

export const evidenceApprovalStatuses = ["pending", "approved", "rejected"] as const;
export type EvidenceApprovalStatus = (typeof evidenceApprovalStatuses)[number];
