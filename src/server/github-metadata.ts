import type { GithubClient } from "./github-client.js";
import type { GithubImportDocument } from "./github-models.js";

export type MetadataSyncResult = {
  enriched: number;
  failures: string[];
};

export async function enrichGithubRepositories(
  client: GithubClient,
  document: GithubImportDocument,
  limit = 25,
): Promise<MetadataSyncResult> {
  const failures: string[] = [];
  let enriched = 0;
  const candidates = [...document.repositories]
    .sort(
      (left, right) => (right.lastPushedAt?.getTime() ?? 0) - (left.lastPushedAt?.getTime() ?? 0),
    )
    .slice(0, limit);
  for (const repository of candidates) {
    const [owner, name] = repository.fullName.split("/");
    if (!owner || !name) {
      failures.push(`${repository.fullName}: invalid repository name`);
      continue;
    }
    try {
      const languages = await client.getLanguages(owner, name);
      repository.languages = new Map(Object.entries(languages));
      const readme = await client.getReadme(owner, name);
      if (readme) {
        repository.readmeContent = readme.content;
        repository.readmeURL = readme.htmlUrl;
      }
      if (repository.defaultBranch) {
        const commits = await client.getRecentCommits(owner, name, repository.defaultBranch);
        const latest = commits[0];
        if (latest) {
          repository.lastCommitURL = latest.html_url;
          repository.lastCommitDate = latest.commit.author?.date
            ? new Date(latest.commit.author.date)
            : undefined;
        }
      }
      enriched += 1;
    } catch (error) {
      failures.push(
        `${repository.fullName}: ${error instanceof Error ? error.message : "metadata unavailable"}`,
      );
    }
  }
  return { enriched, failures };
}
