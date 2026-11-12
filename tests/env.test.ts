import { describe, expect, it } from "vitest";
import { loadServerEnv } from "../src/server/env.js";

describe("server environment", () => {
  it("accepts valid server configuration", () => {
    expect(
      loadServerEnv({
        APP_ENV: "test",
        PORT: "4100",
        API_SECRET_KEY: "a".repeat(32),
        DATABASE_URL: "https://example.com/db",
      }),
    ).toMatchObject({ APP_ENV: "test", PORT: 4100 });
  });

  it("rejects short secrets", () => {
    expect(() => loadServerEnv({ API_SECRET_KEY: "short" })).toThrow();
  });

  it("allows optional integrations to remain unconfigured", () => {
    expect(
      loadServerEnv({
        API_SECRET_KEY: "a".repeat(32),
        GITHUB_CLIENT_ID: "",
        GITHUB_CLIENT_SECRET: "",
      }),
    ).toMatchObject({ GITHUB_CLIENT_ID: undefined, GITHUB_CLIENT_SECRET: undefined });
  });
});
