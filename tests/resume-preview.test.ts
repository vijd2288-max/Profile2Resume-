import { describe, expect, it } from "vitest";
import { buildResumePreview } from "../src/server/resume-preview.js";

describe("resume preview", () => {
  it("only includes approved supported bullets", () => {
    const preview = buildResumePreview({
      title: "Resume",
      targetRole: "Engineer",
      sections: {
        personalInformation: {},
        professionalSummary: "",
        technicalSkills: [],
        workExperience: [],
        education: [],
        certifications: [],
        projects: [
          {
            projectName: "Project",
            bullets: [
              {
                bulletId: "a",
                text: "Supported",
                approvalStatus: "approved",
                validationStatus: "supported",
                evidenceReferences: [],
                displayOrder: 0,
              },
              {
                bulletId: "b",
                text: "Unsupported",
                approvalStatus: "approved",
                validationStatus: "unsupported",
                evidenceReferences: [],
                displayOrder: 1,
              },
            ],
          },
        ],
        achievements: [],
      },
    });
    expect(preview.sections.projects[0]?.bullets).toHaveLength(1);
    expect(preview.sections.projects[0]?.bullets?.[0]?.text).toBe("Supported");
  });
});
