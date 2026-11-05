import type { DeveloperProfileDocument } from "./profile-models.js";

export type ProfileCompleteness = {
  score: number;
  categories: Record<string, number>;
  suggestions: string[];
};

const weights = {
  basicInformation: 0.25,
  education: 0.15,
  experience: 0.15,
  technicalSkills: 0.15,
  projects: 0.15,
  achievements: 0.1,
  codingStatistics: 0.05,
};

export function calculateProfileCompleteness(
  profile: DeveloperProfileDocument,
): ProfileCompleteness {
  const basic = profile.basicInformation ?? {};
  const basicScore =
    [basic.fullName, basic.professionalHeadline, basic.email, basic.location].filter(Boolean)
      .length / 4;
  const categories = {
    basicInformation: basicScore,
    education: profile.education.length ? 1 : 0,
    experience: profile.experience.length ? 1 : 0,
    technicalSkills: profile.technicalSkills.length ? 1 : 0,
    projects: profile.projects.length ? 1 : 0,
    achievements: profile.achievements.length ? 1 : 0,
    codingStatistics: profile.codingStatistics ? 1 : 0,
  };
  const score = Math.round(
    Object.entries(weights).reduce(
      (total, [category, weight]) =>
        total + categories[category as keyof typeof categories] * weight,
      0,
    ) * 100,
  );
  const suggestions: string[] = [];
  if (!basic.professionalHeadline) suggestions.push("Complete your professional summary.");
  if (!profile.education.length) suggestions.push("Add your education details.");
  if (!profile.technicalSkills.length) suggestions.push("Add technical skills.");
  if (!profile.projects.length) suggestions.push("Add project descriptions.");
  if (!profile.achievements.length) suggestions.push("Add achievements.");
  if (!basic.githubURL) suggestions.push("Connect GitHub.");
  return { score, categories, suggestions };
}
