import { describe, expect, it } from "vitest";
import { PDFParse } from "pdf-parse";
import { createResumePdf, resumePdfFilename } from "../src/server/resume-pdf.js";

describe("resume PDF export", () => {
  it("creates selectable, filtered resume content", async () => {
    const pdf = await createResumePdf({
      title: "Platform Engineer",
      targetRole: "Platform Engineer",
      sections: {
        personalInformation: { fullName: "Ada Lovelace", email: "ada@example.com" },
        professionalSummary: "Builds reliable systems.",
        technicalSkills: ["TypeScript", "MongoDB"],
        workExperience: [],
        projects: [
          {
            projectName: "Compiler",
            bullets: [
              {
                bulletId: "approved",
                text: "Improved throughput by 20%.",
                evidenceReferences: ["evidence-1"],
                validationStatus: "supported",
                approvalStatus: "approved",
                displayOrder: 0,
              },
              {
                bulletId: "rejected",
                text: "This must not be exported.",
                evidenceReferences: [],
                validationStatus: "unsupported",
                approvalStatus: "rejected",
                displayOrder: 1,
              },
            ],
          },
        ],
        education: [],
        certifications: [],
        achievements: [],
      },
    });
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    const parser = new PDFParse({ data: pdf });
    const extracted = await parser.getText();
    await parser.destroy();
    expect(extracted.text).toContain("Improved throughput by 20%.");
    expect(extracted.text).not.toContain("This must not be exported.");
  });

  it("creates a safe filename", () => {
    expect(resumePdfFilename("Ada / Platform Engineer")).toBe("Ada-Platform-Engineer.pdf");
  });
});
