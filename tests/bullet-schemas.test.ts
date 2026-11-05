import { describe, expect, it } from "vitest";
import { generatedBulletsResponseSchema } from "../src/server/bullet-schemas.js";

describe("generated bullet schemas", () => {
  it("requires evidence references in every bullet", () => {
    expect(() =>
      generatedBulletsResponseSchema.parse({
        bullets: [
          {
            text: "Built reliable services for users.",
            relevantSkills: [],
            supportingEvidenceIds: ["bad"],
          },
        ],
      }),
    ).toThrow();
  });
});
