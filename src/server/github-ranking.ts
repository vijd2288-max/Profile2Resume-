export type RankableRepository = {
  githubId: number;
  name: string;
  description?: string;
  topics: string[];
  isFork: boolean;
  isArchived: boolean;
  size: number;
  primaryLanguage?: string;
  languages?: Map<string, number>;
  readmeContent?: string;
  homepageURL?: string;
  stars: number;
  forks: number;
  lastPushedAt?: Date;
  selectedForResume?: boolean;
};

export type RankedRepository<T extends RankableRepository> = {
  repository: T;
  score: number;
  explanation: string;
  positiveSignals: string[];
  missingInformation: string[];
};

function quality(repository: RankableRepository): RankedRepository<RankableRepository> {
  const positiveSignals: string[] = [];
  const missingInformation: string[] = [];
  let score = 0;
  if (repository.description?.trim()) {
    score += 15;
    positiveSignals.push("has a project description");
  } else missingInformation.push("project description");
  if (repository.readmeContent && repository.readmeContent.trim().length >= 120) {
    score += 20;
    positiveSignals.push("has a substantive README");
  } else missingInformation.push("substantive README");
  const technologyCount = repository.languages?.size ?? (repository.primaryLanguage ? 1 : 0);
  score += Math.min(15, technologyCount * 3);
  if (technologyCount) positiveSignals.push(`${technologyCount} detected technologies`);
  else missingInformation.push("detected languages");
  if (repository.topics.length) {
    score += Math.min(10, repository.topics.length * 2);
    positiveSignals.push("has repository topics");
  } else missingInformation.push("repository topics");
  if (repository.homepageURL) {
    score += 10;
    positiveSignals.push("has a deployment or homepage link");
  } else missingInformation.push("deployment link");
  if (repository.lastPushedAt) {
    const ageDays = (Date.now() - repository.lastPushedAt.getTime()) / 86_400_000;
    score += ageDays <= 365 ? 12 : ageDays <= 1_095 ? 8 : 4;
  } else missingInformation.push("push activity");
  score += Math.min(5, Math.log10(repository.stars + 1) * 2);
  if (repository.size > 0) score += 5;
  else missingInformation.push("repository content");
  if (repository.isFork) {
    score -= 30;
    missingInformation.push("original ownership confirmation");
  } else {
    score += 8;
    positiveSignals.push("is not marked as a fork");
  }
  if (repository.isArchived) {
    score -= 10;
    missingInformation.push("current maintenance");
  }
  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  return {
    repository,
    score: bounded,
    positiveSignals,
    missingInformation,
    explanation: positiveSignals.length
      ? `Selected because it ${positiveSignals.slice(0, 3).join(", ")}.`
      : "Limited public metadata is available; user confirmation is required.",
  };
}

export function filterGithubRepositories<T extends RankableRepository>(repositories: T[]): T[] {
  return repositories.filter(
    (repository) =>
      repository.size > 0 ||
      Boolean(repository.description?.trim()) ||
      Boolean(repository.readmeContent?.trim()) ||
      repository.topics.length > 0 ||
      Boolean(repository.primaryLanguage),
  );
}

export function rankGithubRepositories<T extends RankableRepository>(
  repositories: T[],
  limit = 6,
): RankedRepository<T>[] {
  return filterGithubRepositories(repositories)
    .map((repository) => quality(repository) as RankedRepository<T>)
    .sort(
      (left, right) =>
        right.score - left.score || left.repository.githubId - right.repository.githubId,
    )
    .slice(0, limit);
}
