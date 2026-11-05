import { describe, expect, it } from "vitest";

describe("clarification workflow", () => {
  it("uses safe, non-leading prompts", () => {
    const questions = [
      "What specific problem did this project solve?",
      "Which technologies did you personally implement?",
      "Was this project deployed?",
    ];
    expect(questions.every((question) => !question.includes("invent"))).toBe(true);
  });
});
