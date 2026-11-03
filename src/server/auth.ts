import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { connectToDatabase } from "./db.js";
import { encryptSecret } from "./crypto.js";
import { AccountIntegration, User, type UserDocument } from "./models.js";

const stateLifetimeSeconds = 600;
const sessionLifetimeSeconds = 60 * 60 * 24 * 7;

export class AuthenticationError extends Error {
  constructor(
    public readonly code: "AUTH_NOT_CONFIGURED" | "INVALID_OAUTH_STATE" | "OAUTH_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export type GithubOAuthConfig = {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  secret: string;
};

export function getGithubOAuthConfig(source: NodeJS.ProcessEnv = process.env): GithubOAuthConfig {
  const clientId = source.GITHUB_CLIENT_ID?.trim();
  const clientSecret = source.GITHUB_CLIENT_SECRET?.trim();
  const callbackUrl = source.GITHUB_CALLBACK_URL?.trim();
  const secret = source.API_SECRET_KEY?.trim();
  if (!clientId || !clientSecret || !callbackUrl || !secret || secret.length < 32) {
    throw new AuthenticationError(
      "AUTH_NOT_CONFIGURED",
      "GitHub authentication is not configured on the server",
    );
  }
  return { clientId, clientSecret, callbackUrl, secret };
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function signedValue(value: string, secret: string): string {
  return `${value}.${sign(value, secret)}`;
}

function verifySignedValue(value: string, secret: string): string | null {
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = sign(payload, secret);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  return payload;
}

export function createOAuthState(
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): { value: string; cookie: string } {
  const payload = `${randomBytes(24).toString("base64url")}.${nowSeconds + stateLifetimeSeconds}`;
  const value = signedValue(payload, secret);
  return {
    value,
    cookie: `oauth_state=${encodeURIComponent(value)}; Max-Age=${stateLifetimeSeconds}; Path=/auth/github; HttpOnly; SameSite=Lax`,
  };
}

export function verifyOAuthState(
  state: string | null,
  cookieHeader: string | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!state || !cookieHeader) return false;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("oauth_state="))
    ?.slice("oauth_state=".length);
  if (!cookie) return false;
  const decodedCookie = decodeURIComponent(cookie);
  if (state !== decodedCookie) return false;
  const payload = verifySignedValue(state, secret);
  if (!payload) return false;
  const separator = payload.lastIndexOf(".");
  const expiresAt = Number(payload.slice(separator + 1));
  return Number.isSafeInteger(expiresAt) && expiresAt >= nowSeconds;
}

export function buildGithubAuthorizationUrl(config: GithubOAuthConfig, state: string): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.callbackUrl);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);
  return url.toString();
}

export function createSessionCookie(
  userId: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const payload = `${userId}.${nowSeconds + sessionLifetimeSeconds}`;
  const value = signedValue(payload, secret);
  return `session=${encodeURIComponent(value)}; Max-Age=${sessionLifetimeSeconds}; Path=/; HttpOnly; SameSite=Lax${process.env.APP_ENV === "production" ? "; Secure" : ""}`;
}

export function getSessionUserId(
  headers: Pick<IncomingHttpHeaders, "cookie">,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string | null {
  const value = headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("session="))
    ?.slice("session=".length);
  if (!value) return null;
  const payload = verifySignedValue(decodeURIComponent(value), secret);
  if (!payload) return null;
  const separator = payload.lastIndexOf(".");
  const expiresAt = Number(payload.slice(separator + 1));
  return expiresAt >= nowSeconds ? payload.slice(0, separator) : null;
}

export type GithubProfile = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
};

export type GithubOAuthDependencies = {
  exchangeCode: (code: string, config: GithubOAuthConfig) => Promise<string>;
  fetchProfile: (accessToken: string) => Promise<GithubProfile>;
  persistUser?: (
    profile: GithubProfile,
    accessToken: string,
    source: NodeJS.ProcessEnv,
  ) => Promise<UserDocument>;
};

export async function authenticateGithubCallback(
  params: { code?: string; state?: string; error?: string },
  headers: Pick<IncomingHttpHeaders, "cookie">,
  source: NodeJS.ProcessEnv = process.env,
  dependencies: GithubOAuthDependencies = {
    exchangeCode: exchangeGithubCode,
    fetchProfile: fetchGithubProfile,
  },
): Promise<{ user: UserDocument; sessionCookie: string }> {
  const config = getGithubOAuthConfig(source);
  if (params.error || !params.code || !params.state) {
    throw new AuthenticationError("OAUTH_FAILED", "GitHub authorization was not completed");
  }
  if (!verifyOAuthState(params.state, headers.cookie, config.secret)) {
    throw new AuthenticationError(
      "INVALID_OAUTH_STATE",
      "The GitHub authorization state is invalid",
    );
  }

  const accessToken = await dependencies.exchangeCode(params.code, config);
  const profile = await dependencies.fetchProfile(accessToken);
  const user = await (dependencies.persistUser ?? upsertGithubUser)(profile, accessToken, source);
  return { user, sessionCookie: createSessionCookie(String(user._id), config.secret) };
}

async function exchangeGithubCode(code: string, config: GithubOAuthConfig): Promise<string> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl,
    }),
  });
  if (!response.ok) throw new AuthenticationError("OAUTH_FAILED", "GitHub token exchange failed");
  const body = (await response.json()) as { access_token?: string; error?: string };
  if (!body.access_token) {
    throw new AuthenticationError(
      "OAUTH_FAILED",
      body.error ?? "GitHub did not return an access token",
    );
  }
  return body.access_token;
}

async function fetchGithubProfile(accessToken: string): Promise<GithubProfile> {
  const response = await fetch("https://api.github.com/user", {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new AuthenticationError("OAUTH_FAILED", "GitHub profile lookup failed");
  return (await response.json()) as GithubProfile;
}

async function upsertGithubUser(
  profile: GithubProfile,
  accessToken: string,
  source: NodeJS.ProcessEnv,
): Promise<UserDocument> {
  await connectToDatabase(source);
  const existingAccount = await AccountIntegration.findOne({
    provider: "github",
    providerAccountId: String(profile.id),
  }).exec();
  let user: UserDocument | null = null;
  if (existingAccount) {
    user = await User.findById(existingAccount.userId).exec();
    if (!user)
      throw new AuthenticationError("OAUTH_FAILED", "The linked GitHub user no longer exists");
  } else if (profile.email) {
    user = await User.findOne({ email: profile.email.toLowerCase() }).exec();
    if (user && user.authProvider !== "github") {
      throw new AuthenticationError("OAUTH_FAILED", "This email is linked to another provider");
    }
  }

  if (!user) {
    user = new User({
      name: profile.name ?? profile.login,
      email: profile.email?.toLowerCase() ?? `${profile.id}@users.noreply.github.com`,
      profileImage: profile.avatar_url,
      emailVerified: Boolean(profile.email),
      authProvider: "github",
    });
  } else {
    user.name = profile.name ?? profile.login;
    user.profileImage = profile.avatar_url;
    user.emailVerified = Boolean(profile.email) || user.emailVerified;
  }
  await user.save();

  await AccountIntegration.findOneAndUpdate(
    { userId: user._id, provider: "github" },
    {
      $set: {
        providerAccountId: String(profile.id),
        encryptedAccessToken: encryptSecret(accessToken, source),
        status: "connected",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();
  return user;
}

export function clearSessionCookie(): string {
  return "session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax";
}

export function beginGithubLogin(source: NodeJS.ProcessEnv = process.env): {
  location: string;
  stateCookie: string;
} {
  const config = getGithubOAuthConfig(source);
  const state = createOAuthState(config.secret);
  return {
    location: buildGithubAuthorizationUrl(config, state.value),
    stateCookie: state.cookie,
  };
}
