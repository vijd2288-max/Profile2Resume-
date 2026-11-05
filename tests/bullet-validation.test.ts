import { describe, expect, it, vi } from "vitest";
import { validateBullet } from "../src/server/bullet-validation.js";
import { Evidence } from "../src/server/evidence-models.js";

describe("bullet validation", () => {
  it("rejects bullets without evidence", async () => {
    const result = await validateBullet("507f1f77bcf86cd799439011", "Built services", [
      "507f1f77bcf86cd799439012",
    ] as never);
    expect(result.status).toBe("unsupported");
  });

  it("cannot use another user's evidence", async () => {
    const query = vi.spyOn(Evidence, "find").mockReturnValue({
      select: () => ({ lean: () => ({ exec: async () => [] }) }),
    } as never);
    const result = await validateBullet("507f1f77bcf86cd799439011", "Built services", []);
    expect(result.status).toBe("unsupported");
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "507f1f77bcf86cd799439011" }),
    );
    query.mockRestore();
  });
});
