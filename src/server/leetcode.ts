import { z } from "zod";
import { Types } from "mongoose";
import type { IncomingMessage, ServerResponse } from "node:http";
import { ApiError, success } from "./api.js";
import { DeveloperProfile } from "./profile-models.js";

const username = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9_-]{1,28}[A-Za-z0-9])?$/, "Invalid LeetCode username");
export const leetcodeStatisticsSchema = z
  .object({
    leetCodeUsername: username,
    totalProblemsSolved: z.number().int().nonnegative(),
    easyProblemsSolved: z.number().int().nonnegative(),
    mediumProblemsSolved: z.number().int().nonnegative(),
    hardProblemsSolved: z.number().int().nonnegative(),
    contestRating: z.number().nonnegative().optional(),
    globalRanking: z.number().int().positive().optional(),
    profileURL: z
      .string()
      .url()
      .refine(
        (value) => new URL(value).hostname.endsWith("leetcode.com"),
        "Profile URL must be on leetcode.com",
      ),
  })
  .refine(
    (value) =>
      value.totalProblemsSolved >=
      value.easyProblemsSolved + value.mediumProblemsSolved + value.hardProblemsSolved,
    "Total solved problems cannot be lower than difficulty totals",
  );

export type LeetcodeStatisticsInput = z.infer<typeof leetcodeStatisticsSchema>;

export async function handleLeetcodeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
  readJson: (request: IncomingMessage) => Promise<unknown>,
  sendJson: (response: ServerResponse, status: number, body: unknown) => void,
): Promise<boolean> {
  if (pathname !== "/api/leetcode/statistics") return false;
  const ownerId = new Types.ObjectId(userId);
  const profile = await DeveloperProfile.findOneAndUpdate(
    { userId: ownerId },
    { $setOnInsert: { userId: ownerId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();
  if (request.method === "GET") {
    sendJson(response, 200, success(profile.codingStatistics ?? null));
    return true;
  }
  if (request.method !== "PATCH" && request.method !== "PUT") return false;
  const parsed = leetcodeStatisticsSchema.parse(await readJson(request));
  profile.codingStatistics = {
    ...parsed,
    sourceProvider: "manual",
    sourceURL: parsed.profileURL,
    importedAt: new Date(),
    updatedAt: new Date(),
    verificationStatus: "pending_review",
    userConfirmationStatus: "pending_review",
    dataSource: "manual_user_entry",
    lastUpdatedAt: new Date(),
  } as Record<string, unknown>;
  await profile.save();
  sendJson(response, 200, success(profile.codingStatistics));
  return true;
}

export function validateLeetcodeInput(value: unknown): LeetcodeStatisticsInput {
  const result = leetcodeStatisticsSchema.safeParse(value);
  if (!result.success)
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Invalid LeetCode statistics",
      result.error.flatten(),
    );
  return result.data;
}
