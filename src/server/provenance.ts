import type { ProfileSourceProvider, SourceEvidence, VerificationStatus } from "./profile-types.js";

export function createProvenance(
  sourceProvider: ProfileSourceProvider,
  values: Partial<Omit<SourceEvidence, "sourceProvider" | "verificationStatus">> = {},
): SourceEvidence {
  const verificationStatus: VerificationStatus =
    sourceProvider === "manual" ? "pending_review" : "imported";
  return { sourceProvider, verificationStatus, ...values };
}

export function preserveProvenance(
  existing: SourceEvidence,
  patch: Partial<SourceEvidence>,
): SourceEvidence {
  const preserved = {
    ...existing,
    ...patch,
    sourceProvider: existing.sourceProvider,
    sourceRecordId: existing.sourceRecordId,
    sourceURL: existing.sourceURL,
    importedAt: existing.importedAt,
  };
  return Object.fromEntries(
    Object.entries(preserved).filter(([, value]) => value !== undefined),
  ) as SourceEvidence;
}

export function isUserProvided(record: SourceEvidence): boolean {
  return record.sourceProvider === "manual";
}
