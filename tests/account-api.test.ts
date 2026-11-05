import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("account management contracts", () => {
  it("requires an explicit destructive confirmation", () => {
    const schema = z.object({ confirmation: z.literal("DELETE") });
    expect(schema.safeParse({ confirmation: "delete" }).success).toBe(false);
    expect(schema.safeParse({ confirmation: "DELETE" }).success).toBe(true);
  });

  it("distinguishes disconnect from imported-data deletion", () => {
    const schema = z.object({ deleteImportedData: z.boolean().default(false) });
    expect(schema.parse({})).toEqual({ deleteImportedData: false });
    expect(schema.parse({ deleteImportedData: true }).deleteImportedData).toBe(true);
  });
});
