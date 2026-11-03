import { ApiError } from "./api.js";
import { getSessionUserId } from "./auth.js";

export function requireAuthenticatedUser(cookie: string | undefined, secret: string): string {
  const userId = getSessionUserId({ cookie }, secret);
  if (!userId) {
    throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Authentication is required");
  }
  return userId;
}

export function assertUserOwnership(sessionUserId: string, requestedUserId: string): void {
  if (sessionUserId !== requestedUserId) {
    throw new ApiError(403, "FORBIDDEN", "You cannot access another user's resources");
  }
}
