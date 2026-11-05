import type { ResumeDocument, ResumeSections } from "./resume-models.js";

export type ResumePreview = {
  title: string;
  targetRole: string;
  sections: ResumeSections;
};

function approvedItems(
  items: Array<Record<string, unknown> & { bullets?: Array<Record<string, unknown>> }>,
) {
  return items.map((item) => ({
    ...item,
    bullets: (item.bullets ?? []).filter(
      (bullet) =>
        bullet.approvalStatus === "approved" &&
        ["supported", "user_confirmed"].includes(String(bullet.validationStatus)),
    ),
  }));
}

export function buildResumePreview(
  resume: Pick<ResumeDocument, "title" | "targetRole" | "sections">,
): ResumePreview {
  return {
    title: resume.title,
    targetRole: resume.targetRole,
    sections: {
      ...resume.sections,
      workExperience: approvedItems(resume.sections.workExperience),
      projects: approvedItems(resume.sections.projects),
      achievements: approvedItems(resume.sections.achievements),
    },
  };
}
