import { describe, expect, it } from "vitest";
import {
  authenticateGithubCallback,
  buildGithubAuthorizationUrl,
  createOAuthState,
  createSessionCookie,
  getSessionUserId,
  verifyOAuthState,
} from "../src/server/auth.js";
import { User } from "../src/server/models.js";

describe("GitHub authentication primitives", () => {
  const secret = "a".repeat(32);

  it("creates and validates expiring, cookie-bound OAuth state", () => {
    const state = createOAuthState(secret, 1_000);
    expect(verifyOAuthState(state.value, state.cookie, secret, 1_100)).toBe(true);
    expect(verifyOAuthState(`${state.value}tampered`, state.cookie, secret, 1_100)).toBe(false);
    expect(verifyOAuthState(state.value, state.cookie, secret, 1_601)).toBe(false);
  });

  it("builds a scoped GitHub authorization URL", () => {
    const url = new URL(
      buildGithubAuthorizationUrl(
        {
          clientId: "client",
          clientSecret: "server-only",
          callbackUrl: "https://example.test/auth/github/callback",
          secret,
        },
        "state",
      ),
    );
    expect(url.searchParams.get("scope")).toBe("read:user user:email");
    expect(url.searchParams.get("client_secret")).toBeNull();
  });

  it("signs session cookies and rejects tampering or expiry", () => {
    const cookie = createSessionCookie("user-1", secret, 1_000);
    expect(getSessionUserId({ cookie }, secret, 1_001)).toBe("user-1");
    expect(
      getSessionUserId({ cookie: cookie.replace("session=", "session=x") }, secret, 1_001),
    ).toBeNull();
    expect(getSessionUserId({ cookie }, secret, 605_801)).toBeNull();
  });

  it("completes a successful callback using mocked GitHub and persistence services", async () => {
    const state = createOAuthState(secret);
    const source = {
      API_SECRET_KEY: secret,
      GITHUB_CLIENT_ID: "client",
      GITHUB_CLIENT_SECRET: "server-secret",
      GITHUB_CALLBACK_URL: "https://example.test/auth/github/callback",
    };
    const user = new User({ email: "dev@example.com", authProvider: "github" });
    const result = await authenticateGithubCallback(
      { code: "code", state: state.value },
      { cookie: state.cookie },
      source,
      {
        exchangeCode: async () => "github-token",
        fetchProfile: async () => ({
          id: 42,
          login: "developer",
          name: "Developer",
          email: "dev@example.com",
          avatar_url: "https://example.test/avatar.png",
        }),
        persistUser: async () => user,
      },
    );

    expect(result.user).toBe(user);
    expect(result.sessionCookie).toContain("HttpOnly");
  });

  it("rejects failed and invalid callbacks before contacting GitHub", async () => {
    const source = {
      API_SECRET_KEY: secret,
      GITHUB_CLIENT_ID: "client",
      GITHUB_CLIENT_SECRET: "server-secret",
      GITHUB_CALLBACK_URL: "https://example.test/auth/github/callback",
    };
    const exchangeCode = async () => "should-not-run";
    await expect(
      authenticateGithubCallback({ error: "access_denied" }, {}, source, {
        exchangeCode,
        fetchProfile: async () => {
          throw new Error("should-not-run");
        },
      }),
    ).rejects.toMatchObject({ code: "OAUTH_FAILED" });
    await expect(
      authenticateGithubCallback({ code: "code", state: "bad" }, {}, source, {
        exchangeCode,
        fetchProfile: async () => {
          throw new Error("should-not-run");
        },
      }),
    ).rejects.toMatchObject({ code: "INVALID_OAUTH_STATE" });
  });
});
