import type { IncomingMessage, ServerResponse } from "node:http";
import {
  AuthenticationError,
  authenticateGithubCallback,
  beginGithubLogin,
  clearSessionCookie,
  type GithubOAuthDependencies,
} from "./auth.js";

function redirect(response: ServerResponse, location: string, cookies: string[] = []): void {
  response.writeHead(302, {
    Location: location,
    ...(cookies.length ? { "Set-Cookie": cookies } : {}),
  });
  response.end();
}

export async function handleAuthRequest(
  request: IncomingMessage,
  response: ServerResponse,
  source: NodeJS.ProcessEnv = process.env,
  dependencies?: GithubOAuthDependencies,
): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (request.method === "GET" && url.pathname === "/auth/github") {
    try {
      const login = beginGithubLogin(source);
      redirect(response, login.location, [login.stateCookie]);
    } catch (error) {
      const status =
        error instanceof AuthenticationError && error.code === "AUTH_NOT_CONFIGURED" ? 503 : 500;
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          ok: false,
          error: {
            code: "AUTH_NOT_CONFIGURED",
            message: "GitHub authentication is not configured",
          },
        }),
      );
    }
    return true;
  }

  if (request.method === "GET" && url.pathname === "/auth/github/callback") {
    try {
      const callbackParams: { code?: string; state?: string; error?: string } = {};
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const oauthError = url.searchParams.get("error");
      if (code) callbackParams.code = code;
      if (state) callbackParams.state = state;
      if (oauthError) callbackParams.error = oauthError;
      const result = await authenticateGithubCallback(
        callbackParams,
        { cookie: request.headers.cookie },
        source,
        dependencies,
      );
      redirect(response, "/#dashboard", [
        result.sessionCookie,
        "oauth_state=; Max-Age=0; Path=/auth/github; HttpOnly; SameSite=Lax",
      ]);
    } catch (error) {
      const message =
        error instanceof AuthenticationError ? error.message : "GitHub authentication failed";
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({ ok: false, error: { code: "AUTHENTICATION_FAILED", message } }),
      );
    }
    return true;
  }

  if (request.method === "POST" && url.pathname === "/auth/logout") {
    response.writeHead(204, { "Set-Cookie": clearSessionCookie() });
    response.end();
    return true;
  }

  return false;
}
