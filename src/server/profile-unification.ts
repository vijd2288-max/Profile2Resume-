import { Types } from "mongoose";
import { DeveloperProfile } from "./profile-models.js";

type GithubProject = {
  githubId: number;
  name: string;
  fullName: string;
  description?: string;
  repositoryURL: string;
  homepageURL?: string;
  primaryLanguage?: string;
  topics: string[];
  isFork: boolean;
  selectedForResume: boolean;
  userEdited: boolean;
  synchronizedAt: Date;
};

export async function syncGithubProjectsToProfile(
  userId: string,
  repositories: GithubProject[],
): Promise<void> {
  const profile = await DeveloperProfile.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    { $setOnInsert: { userId: new Types.ObjectId(userId) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();
  const projects = profile.projects as unknown as Array<Record<string, unknown>>;
  for (const repository of repositories) {
    const sourceRecordId = String(repository.githubId);
    const current = projects.find(
      (item) => item.sourceProvider === "github" && item.sourceRecordId === sourceRecordId,
    );
    if (current) {
      if (!current.userEdited) {
        Object.assign(current, {
          projectName: repository.name,
          description: repository.description,
          repositoryURL: repository.repositoryURL,
          liveDeploymentURL: repository.homepageURL,
          technologies: [
            ...(repository.primaryLanguage ? [repository.primaryLanguage] : []),
            ...repository.topics,
          ],
          sourceURL: repository.repositoryURL,
          updatedAt: repository.synchronizedAt,
        });
      }
      continue;
    }
    projects.push({
      projectName: repository.name,
      ...(repository.description ? { description: repository.description } : {}),
      technologies: [
        ...(repository.primaryLanguage ? [repository.primaryLanguage] : []),
        ...repository.topics,
      ],
      repositoryURL: repository.repositoryURL,
      ...(repository.homepageURL ? { liveDeploymentURL: repository.homepageURL } : {}),
      evidenceReferences: [repository.repositoryURL],
      selectedForResume: repository.selectedForResume,
      sourceProvider: "github",
      sourceRecordId,
      sourceURL: repository.repositoryURL,
      importedAt: repository.synchronizedAt,
      updatedAt: repository.synchronizedAt,
      verificationStatus: "imported",
      userEdited: false,
    });
  }
  await profile.save();
}
