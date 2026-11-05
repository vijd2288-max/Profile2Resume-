import { describe, expect, it } from "vitest";
import { validateLeetcodeInput } from "../src/server/leetcode.js";

const valid = {
  leetCodeUsername: "ada-lovelace",
  totalProblemsSolved: 30,
  easyProblemsSolved: 10,
  mediumProblemsSolved: 15,
  hardProblemsSolved: 5,
  profileURL: "https://leetcode.com/u/ada-lovelace",
};

describe("LeetCode statistics validation", () => {
  it("accepts manual statistics with a LeetCode profile URL", () => {
    expect(validateLeetcodeInput(valid).leetCodeUsername).toBe("ada-lovelace");
  });
  it("rejects negative values, invalid usernames, and inconsistent totals", () => {
    expect(() => validateLeetcodeInput({ ...valid, totalProblemsSolved: -1 })).toThrow();
    expect(() => validateLeetcodeInput({ ...valid, leetCodeUsername: "bad name" })).toThrow();
    expect(() => validateLeetcodeInput({ ...valid, totalProblemsSolved: 2 })).toThrow();
  });
});
