import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "../src/server/crypto.js";
import { AccountIntegration, User } from "../src/server/models.js";
import { DeveloperProfile } from "../src/server/profile-models.js";

describe("database models", () => {
  it("validates required user fields and provider values", () => {
    const invalidUser = new User({ authProvider: "github" });
    expect(invalidUser.validateSync()?.errors.email).toBeDefined();

    const invalidEmail = new User({
      email: "not-an-email",
      authProvider: "github",
    });
    expect(invalidEmail.validateSync()?.errors.email).toBeDefined();

    const validUser = new User({
      email: "Developer@Example.com",
      authProvider: "github",
      emailVerified: true,
    });
    expect(validUser.validateSync()).toBeUndefined();
    expect(validUser.email).toBe("developer@example.com");
  });

  it("enforces unique user email addresses", () => {
    expect(User.schema.indexes()).toContainEqual([{ email: 1 }, { unique: true }]);
  });

  it("validates integration provider and ownership fields", () => {
    const invalidIntegration = new AccountIntegration({
      provider: "unknown",
      providerAccountId: "123",
      status: "connected",
    });
    const errors = invalidIntegration.validateSync()?.errors;
    expect(errors?.userId).toBeDefined();
    expect(errors?.provider).toBeDefined();
  });

  it("defines unique ownership indexes for integrations", () => {
    const indexes = AccountIntegration.schema.indexes();
    expect(indexes).toContainEqual([{ userId: 1, provider: 1 }, { unique: true }]);
    expect(indexes).toContainEqual([{ provider: 1, providerAccountId: 1 }, { unique: true }]);
  });

  it("encrypts tokens without retaining plaintext", () => {
    const env = { API_SECRET_KEY: "a".repeat(32) };
    const encrypted = encryptSecret("oauth-token", env);
    expect(encrypted).not.toContain("oauth-token");
    expect(decryptSecret(encrypted, env)).toBe("oauth-token");
  });

  it("validates a profile with optional sections and source attribution", () => {
    const profile = new DeveloperProfile({
      userId: "507f1f77bcf86cd799439011",
      education: [
        {
          institutionName: "Example University",
          sourceProvider: "manual",
          verificationStatus: "pending_review",
        },
      ],
      technicalSkills: [
        {
          name: "TypeScript",
          normalizedName: "typescript",
          category: "programming_languages",
          sourceProvider: "github",
          verificationStatus: "imported",
        },
      ],
    });
    expect(profile.validateSync()).toBeUndefined();
    expect(profile.education).toHaveLength(1);
    expect(profile.technicalSkills).toHaveLength(1);
  });

  it("defines one profile per authenticated user", () => {
    expect(DeveloperProfile.schema.indexes()).toContainEqual([{ userId: 1 }, { unique: true }]);
  });
});
