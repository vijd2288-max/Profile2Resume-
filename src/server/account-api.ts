import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { Types } from "mongoose";
import { ApiError, success } from "./api.js";
import { AccountIntegration, disconnectIntegration, User } from "./models.js";
import { DeveloperProfile } from "./profile-models.js";
import { LinkedInImport } from "./linkedin-import.js";
import { GithubImport } from "./github-models.js";
import { Evidence } from "./evidence-models.js";
import { Resume, ResumeVersion } from "./resume-models.js";
import { ResumeBullet } from "./bullet-models.js";
import { Claim } from "./claim-models.js";
import { ClarificationQuestion } from "./clarification-models.js";
import { JobDescriptionAnalysis } from "./job-analysis-models.js";
import { ProjectOverride } from "./project-overrides.js";
import { clearSessionCookie } from "./auth.js";

const providerSchema = z.enum(["github", "linkedin", "leetcode"]);
const disconnectSchema = z.object({ deleteImportedData: z.boolean().default(false) });
const deleteAccountSchema = z.object({ confirmation: z.literal("DELETE") });

export async function handleAccountRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
  readJson: (request: IncomingMessage) => Promise<unknown>,
  sendJson: (response: ServerResponse, status: number, body: unknown) => void,
): Promise<boolean> {
  const disconnectMatch = pathname.match(/^\/api\/account\/integrations\/([^/]+)\/disconnect$/);
  if (disconnectMatch && request.method === "POST") {
    const provider = providerSchema.parse(disconnectMatch[1]);
    const body = disconnectSchema.parse(await readJson(request));
    await disconnectIntegration(new Types.ObjectId(userId), provider);
    if (body.deleteImportedData) {
      if (provider === "linkedin") await LinkedInImport.deleteMany({ userId }).exec();
      if (provider === "github") await GithubImport.deleteMany({ userId }).exec();
      await Evidence.deleteMany({ userId, sourcePlatform: provider }).exec();
      if (provider === "leetcode") {
        await DeveloperProfile.updateOne(
          { userId },
          { $unset: { codingStatistics: 1, "basicInformation.leetCodeURL": 1 } },
        ).exec();
      } else {
        const field = provider === "github" ? "githubURL" : "linkedInURL";
        await DeveloperProfile.updateOne(
          { userId },
          {
            $unset: { [`basicInformation.${field}`]: 1 },
            $pull: {
              technicalSkills: { sourceProvider: provider },
              experience: { sourceProvider: provider },
              education: { sourceProvider: provider },
              certifications: { sourceProvider: provider },
              achievements: { sourceProvider: provider },
              projects: { sourceProvider: provider },
            },
          },
        ).exec();
      }
    }
    sendJson(
      response,
      200,
      success({ provider, disconnected: true, importedDataDeleted: body.deleteImportedData }),
    );
    return true;
  }

  if (pathname === "/api/account/delete" && request.method === "POST") {
    deleteAccountSchema.parse(await readJson(request));
    const owner = new Types.ObjectId(userId);
    await Promise.all([
      AccountIntegration.deleteMany({ userId: owner }).exec(),
      DeveloperProfile.deleteMany({ userId: owner }).exec(),
      LinkedInImport.deleteMany({ userId: owner }).exec(),
      GithubImport.deleteMany({ userId: owner }).exec(),
      Evidence.deleteMany({ userId: owner }).exec(),
      Resume.deleteMany({ userId: owner }).exec(),
      ResumeVersion.deleteMany({ userId: owner }).exec(),
      ResumeBullet.deleteMany({ userId: owner }).exec(),
      Claim.deleteMany({ userId: owner }).exec(),
      ClarificationQuestion.deleteMany({ userId: owner }).exec(),
      JobDescriptionAnalysis.deleteMany({ userId: owner }).exec(),
      ProjectOverride.deleteMany({ userId: owner }).exec(),
    ]);
    const deleted = await User.deleteOne({ _id: owner }).exec();
    if (!deleted.deletedCount) throw new ApiError(404, "USER_NOT_FOUND", "Account was not found");
    response.writeHead(200, {
      "Set-Cookie": clearSessionCookie(),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify(success({ deleted: true })));
    return true;
  }
  return false;
}
