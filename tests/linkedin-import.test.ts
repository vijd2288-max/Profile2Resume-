import { describe, expect, it } from "vitest";
import { extractLinkedInPdf, parseLinkedInText } from "../src/server/linkedin-import.js";

describe("LinkedIn PDF extraction", () => {
  it("parses supported profile sections without inventing fields", () => {
    const result = parseLinkedInText(
      "Ada Lovelace\nSenior Engineer\nAbout\nBuilds analytical systems\nSkills\nTypeScript\nExperience\nExample Labs\nEducation\nExample University",
    );
    expect(result.fullName).toBe("Ada Lovelace");
    expect(result.summary).toBe("Builds analytical systems");
    expect(result.skills).toEqual(["TypeScript"]);
    expect(result.experience[0]?.organization).toBe("Example Labs");
  });

  it("rejects non-PDF, empty, and malformed input", async () => {
    await expect(extractLinkedInPdf(Buffer.from(""))).rejects.toMatchObject({ code: "EMPTY_PDF" });
    await expect(extractLinkedInPdf(Buffer.from("not pdf"))).rejects.toMatchObject({
      code: "INVALID_PDF",
    });
  });
});
