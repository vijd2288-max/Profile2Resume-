import { describe, expect, it } from "vitest";
import {
  buildGithubAuthorizationUrl,
  createOAuthState,
  createSessionCookie,
  getSessionUserId,
  verifyOAuthState,
} from "../src/server/auth.js";

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
});
