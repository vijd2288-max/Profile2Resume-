import type {
  Achievement, BasicInformation, Certification, CodingStatistics, Education, Experience,
  Project, TechnicalSkill,
} from "./profile-types.js";

const clean = (value: string | undefined): string | undefined => {
  const result = value?.trim().replace(/\s+/g, " ");
  return result || undefined;
};

const normalizeUrl = (value: string | undefined): string | undefined => {
  const cleaned = clean(value);
  if (!cleaned) return undefined;
  return cleaned.replace(/\/+$/, "");
};

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}

export function normalizePersonalInformation(value: BasicInformation): BasicInformation {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key.endsWith("URL") || key === "profileImage" || key === "personalWebsite"
        ? normalizeUrl(item)
        : clean(item),
    ]),
  ) as BasicInformation;
}

export function normalizeEducation(value: Education): Education {
  return { ...value, institutionName: clean(value.institutionName) ?? value.institutionName };
}
export function normalizeExperience(value: Experience): Experience {
  return withoutUndefined({
    ...value,
    organization: clean(value.organization) ?? value.organization,
    jobTitle: clean(value.jobTitle),
    responsibilities: value.responsibilities.map((item) => clean(item) ?? item),
    achievements: value.achievements.map((item) => clean(item) ?? item),
  }) as Experience;
}

const skillAliases: Record<string, string> = {
  "react.js": "react", reactjs: "react", "node.js": "node", nodejs: "node",
  typescript: "typescript", ts: "typescript", javascript: "javascript", js: "javascript",
};
export function normalizeSkillName(value: string): string {
  const key = value.trim().toLowerCase().replace(/\s+/g, " ");
  return skillAliases[key] ?? key;
}
export function normalizeSkill(value: TechnicalSkill): TechnicalSkill {
  return { ...value, name: clean(value.name) ?? value.name, normalizedName: normalizeSkillName(value.name) };
}
export function deduplicateSkills(values: TechnicalSkill[]): TechnicalSkill[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = `${value.category}:${normalizeSkillName(value.name)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(normalizeSkill);
}
export function normalizeProject(value: Project): Project {
  return withoutUndefined({
    ...value,
    projectName: clean(value.projectName) ?? value.projectName,
    technologies: value.technologies.map((item) => clean(item) ?? item),
    repositoryURL: normalizeUrl(value.repositoryURL),
    liveDeploymentURL: normalizeUrl(value.liveDeploymentURL),
  }) as Project;
}
export function normalizeCertification(value: Certification): Certification {
  return { ...value, certificationName: clean(value.certificationName) ?? value.certificationName };
}
export function normalizeAchievement(value: Achievement): Achievement {
  return { ...value, title: clean(value.title) ?? value.title };
}
export function normalizeCodingStatistics(value: CodingStatistics): CodingStatistics {
  return withoutUndefined({
    ...value,
    leetCodeUsername: clean(value.leetCodeUsername),
    profileURL: normalizeUrl(value.profileURL),
  }) as CodingStatistics;
}
