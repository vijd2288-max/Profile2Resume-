import { describe, expect, it } from "vitest";
import { buildResumePreview } from "../src/server/resume-preview.js";
import { createResumePdf } from "../src/server/resume-pdf.js";

describe("complete resume workflow", () => {
  it("keeps rejected claims out of preview and PDF export", async () => {
    const resume = {
      title: "Evidence-backed resume",
      targetRole: "Software Engineer",
      sections: {
        personalInformation: { fullName: "Test User" },
        professionalSummary: "A verified summary.",
        technicalSkills: ["TypeScript"],
        workExperience: [],
        projects: [
          {
            projectName: "Portfolio",
            bullets: [
              {
                bulletId: "approved",
                text: "Delivered a verified feature.",
                evidenceReferences: ["evidence-1"],
                validationStatus: "user_confirmed" as const,
                approvalStatus: "approved" as const,
                displayOrder: 0,
              },
              {
                bulletId: "unsupported",
                text: "An unsupported claim.",
                evidenceReferences: [],
                validationStatus: "unsupported" as const,
                approvalStatus: "approved" as const,
                displayOrder: 1,
              },
            ],
          },
        ],
        education: [],
        certifications: [],
        achievements: [],
      },
    };
    const preview = buildResumePreview(resume);
    expect(preview.sections.projects[0]?.bullets).toHaveLength(1);
    expect(preview.sections.projects[0]?.bullets?.[0]?.text).toBe("Delivered a verified feature.");
    const pdf = await createResumePdf(resume);
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
