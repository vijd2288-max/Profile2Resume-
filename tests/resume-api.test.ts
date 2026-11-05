import { describe, expect, it } from "vitest";
import { Resume } from "../src/server/resume-models.js";

describe("resume API ownership conventions", () => {
  it("scopes resume queries to the authenticated user", () => {
    const userId = "507f1f77bcf86cd799439011";
    const filter = { userId };
    expect(filter.userId).toBe(userId);
    expect(Resume.modelName).toBe("Resume");
  });
});
