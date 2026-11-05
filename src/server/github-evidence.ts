import { Types } from "mongoose";
import { Evidence } from "./evidence-models.js";
import type { GithubImportDocument } from "./github-models.js";

type EvidenceInput = {
  evidenceType: "github_repository" | "github_readme" | "github_languages" | "github_commit";
  sourceReference: string;
  sourceURL?: string;
  description: string;
  payload?: Record<string, unknown>;
};

function recordsForRepository(repository: {
  githubId: number;
  fullName: string;
  repositoryURL: string;
  description?: string;
  readmeContent?: string;
  readmeURL?: string;
  languages: Map<string, number>;
  lastCommitURL?: string;
  lastCommitDate?: Date;
}): EvidenceInput[] {
  const records: EvidenceInput[] = [
    {
      evidenceType: "github_repository",
      sourceReference: `repository:${repository.githubId}`,
      sourceURL: repository.repositoryURL,
      description: repository.description
        ? `Public repository metadata: ${repository.description}`
        : `Public repository metadata for ${repository.fullName}`,
      payload: { fullName: repository.fullName },
    },
  ];
  if (repository.readmeContent && repository.readmeURL) {
    records.push({
      evidenceType: "github_readme",
      sourceReference: `readme:${repository.githubId}`,
      sourceURL: repository.readmeURL,
      description: "Repository README content is available for user inspection.",
      payload: { content: repository.readmeContent.slice(0, 50_000) },
    });
  }
  if (repository.languages.size) {
    records.push({
      evidenceType: "github_languages",
      sourceReference: `languages:${repository.githubId}`,
      sourceURL: repository.repositoryURL,
      description: "GitHub language byte statistics for the repository.",
      payload: { languages: Object.fromEntries(repository.languages) },
    });
  }
  if (repository.lastCommitURL) {
    records.push({
      evidenceType: "github_commit",
      sourceReference: `commit:${repository.githubId}:${repository.lastCommitDate?.toISOString() ?? "latest"}`,
      sourceURL: repository.lastCommitURL,
      description:
        "Recent commit metadata; this does not prove ownership of every project feature.",
      payload: { date: repository.lastCommitDate ?? null },
    });
  }
  return records;
}

export async function collectGithubEvidence(
  userId: string,
  document: GithubImportDocument,
): Promise<number> {
  const ownerId = new Types.ObjectId(userId);
  let count = 0;
  for (const repository of document.repositories) {
    for (const record of recordsForRepository(repository)) {
      await Evidence.updateOne(
        {
          userId: ownerId,
          sourcePlatform: "github",
          evidenceType: record.evidenceType,
          sourceReference: record.sourceReference,
        },
        {
          $set: {
            sourceURL: record.sourceURL,
            description: record.description,
            payload: record.payload,
            collectedAt: repository.synchronizedAt,
            sourceRecordId: String(repository.githubId),
          },
          $setOnInsert: {
            userId: ownerId,
            sourcePlatform: "github",
            evidenceType: record.evidenceType,
            sourceReference: record.sourceReference,
            verificationStatus: "pending_review",
            approvalStatus: "pending",
          },
        },
        { upsert: true },
      ).exec();
      count += 1;
    }
  }
  return count;
}

export { recordsForRepository };
