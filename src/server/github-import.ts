import { Types } from "mongoose";
import { decryptSecret } from "./crypto.js";
import { AccountIntegration } from "./models.js";
import { GithubImport, type GithubImportDocument } from "./github-models.js";
import { GithubClient } from "./github-client.js";
import type { GithubRepository, GithubUser } from "./github-types.js";
import { enrichGithubRepositories } from "./github-metadata.js";

export function normalizeGithubRepository(repository: GithubRepository) {
  return {
    githubId: repository.id,
    name: repository.name.trim(),
    fullName: repository.full_name.trim(),
    ...(repository.description ? { description: repository.description.trim() } : {}),
    repositoryURL: repository.html_url,
    ...(repository.homepage ? { homepageURL: repository.homepage } : {}),
    ...(repository.language ? { primaryLanguage: repository.language } : {}),
    topics: repository.topics ?? [],
    isFork: repository.fork,
    isArchived: repository.archived,
    createdAtGithub: new Date(repository.created_at),
    ...(repository.pushed_at ? { lastPushedAt: new Date(repository.pushed_at) } : {}),
    stars: repository.stargazers_count,
    forks: repository.forks_count,
    defaultBranch: repository.default_branch,
    size: repository.size,
    visibility: repository.visibility ?? "public",
    synchronizedAt: new Date(),
  };
}

function profileFromGithub(value: GithubUser) {
  return {
    githubId: value.id,
    username: value.login,
    ...(value.name ? { displayName: value.name } : {}),
    profileURL: value.html_url,
    avatarURL: value.avatar_url,
    publicRepositoryCount: value.public_repos,
    synchronizedAt: new Date(),
  };
}

export async function getGithubClient(
  userId: string,
  source: NodeJS.ProcessEnv = process.env,
): Promise<GithubClient> {
  const integration = await AccountIntegration.findOne({
    userId: new Types.ObjectId(userId),
    provider: "github",
  })
    .select("+encryptedAccessToken")
    .exec();
  const token = integration?.encryptedAccessToken
    ? decryptSecret(integration.encryptedAccessToken, source)
    : undefined;
  return new GithubClient({ ...(token ? { token } : {}) });
}

export async function importGithubRepositories(
  userId: string,
  source: NodeJS.ProcessEnv = process.env,
): Promise<GithubImportDocument> {
  const objectId = new Types.ObjectId(userId);
  const client = await getGithubClient(userId, source);
  const profile = await client.getUser();
  const repositories = await client.listRepositories();
  const existing = await GithubImport.findOne({ userId: objectId }).exec();
  const byGithubId = new Map((existing?.repositories ?? []).map((item) => [item.githubId, item]));
  const importedAt = new Date();
  for (const repository of repositories) {
    const normalized = normalizeGithubRepository(repository);
    const current = byGithubId.get(normalized.githubId);
    if (current) {
      const selectedForResume = current.selectedForResume;
      const userEdited = current.userEdited;
      Object.assign(current, normalized, {
        selectedForResume,
        userEdited,
        synchronizedAt: importedAt,
      });
    } else {
      byGithubId.set(normalized.githubId, normalized as never);
    }
  }
  const document = existing ?? new GithubImport({ userId: objectId, repositories: [] });
  document.profile = profileFromGithub(profile);
  document.repositories = Array.from(byGithubId.values()) as never;
  const metadata = await enrichGithubRepositories(client, document);
  document.synchronizationStatus = metadata.failures.length ? "partial" : "idle";
  document.lastSynchronizedAt = importedAt;
  document.set("lastError", undefined);
  await document.save();
  return document;
}
