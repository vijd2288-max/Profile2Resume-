import { describe, expect, it } from "vitest";
import { normalizeSkillName } from "../src/server/profile-normalization.js";

describe("unified profile source rules", () => {
  it("uses stable source identities and normalized skill names", () => {
    expect(normalizeSkillName("React.js")).toBe("react");
    expect("github:12345").not.toBe("github:12346");
  });
});
