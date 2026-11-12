import type { IncomingMessage, ServerResponse } from "node:http";
import { Types } from "mongoose";
import { z } from "zod";
import { ApiError, success } from "./api.js";
import { DeveloperProfile, type DeveloperProfileDocument } from "./profile-models.js";
import { calculateProfileCompleteness } from "./profile-completeness.js";
import { profileRecordSchemas, profilePatchSchema } from "./profile-validation.js";
import { normalizeSkillName } from "./profile-normalization.js";

type ReadJson = (request: IncomingMessage) => Promise<unknown>;
type SendJson = (response: ServerResponse, status: number, body: unknown) => void;

const collectionMap = {
  education: "education",
  experience: "experience",
  skills: "technicalSkills",
  projects: "projects",
  certifications: "certifications",
  achievements: "achievements",
} as const;
type Collection = keyof typeof collectionMap;

function objectId(value: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value))
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid profile record ID");
  return new Types.ObjectId(value);
}

async function getProfile(userId: string): Promise<DeveloperProfileDocument> {
  return DeveloperProfile.findOneAndUpdate(
    { userId: objectId(userId) },
    { $setOnInsert: { userId: objectId(userId) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();
}

function serialize(profile: DeveloperProfileDocument) {
  const data = profile.toObject();
  return { ...data, completeness: calculateProfileCompleteness(profile) };
}

export async function handleProfileRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
  readJson: ReadJson,
  sendJson: SendJson,
): Promise<boolean> {
  if (pathname === "/api/profile" && request.method === "GET") {
    sendJson(response, 200, success(serialize(await getProfile(userId))));
    return true;
  }
  if (pathname === "/api/profile" && request.method === "PATCH") {
    const patch = profilePatchSchema.parse(await readJson(request));
    const profile = await getProfile(userId);
    profile.basicInformation = Object.fromEntries(
      Object.entries({ ...profile.basicInformation, ...patch }).filter(
        ([, value]) => value !== undefined,
      ),
    );
    await profile.save();
    sendJson(response, 200, success(serialize(profile)));
    return true;
  }
  const statisticsPath = pathname === "/api/profile/coding-statistics";
  if (statisticsPath && request.method === "PATCH") {
    const patch = profileRecordSchemas["coding-statistics"].parse(await readJson(request));
    const profile = await getProfile(userId);
    profile.codingStatistics = {
      ...profile.codingStatistics,
      ...patch,
      sourceProvider: patch.sourceProvider ?? profile.codingStatistics?.sourceProvider ?? "manual",
      verificationStatus:
        patch.verificationStatus ??
        profile.codingStatistics?.verificationStatus ??
        "pending_review",
    };
    await profile.save();
    sendJson(response, 200, success(serialize(profile)));
    return true;
  }

  const match = pathname.match(
    /^\/api\/profile\/(education|experience|skills|projects|certifications|achievements)(?:\/([^/]+))?$/,
  );
  if (!match) return false;
  const collection = match[1] as Collection;
  const recordId = match[2];
  const field = collectionMap[collection];
  const profile = await getProfile(userId);
  const records = profile[field] as unknown as Array<{
    _id?: Types.ObjectId;
    [key: string]: unknown;
  }>;

  if (request.method === "POST" && !recordId) {
    const parsed = profileRecordSchemas[collection].parse(await readJson(request)) as Record<
      string,
      unknown
    >;
    if (collection === "skills") {
      parsed.normalizedName = normalizeSkillName(parsed.name as string);
      if (
        records.some(
          (item) =>
            item.normalizedName === parsed.normalizedName && item.category === parsed.category,
        )
      ) {
        throw new ApiError(
          409,
          "DUPLICATE_RECORD",
          "This skill already exists in the selected category",
        );
      }
    }
    records.push(parsed);
    await profile.save();
    sendJson(response, 201, success(serialize(profile)));
    return true;
  }

  if (!recordId) return false;
  const id = objectId(recordId);
  const index = records.findIndex((item) => item._id?.equals(id));
  if (index < 0)
    throw new ApiError(404, "PROFILE_RECORD_NOT_FOUND", "Profile record was not found");

  if (request.method === "PATCH") {
    const rawPatch = z.record(z.unknown()).parse(await readJson(request));
    const patch = profileRecordSchemas[collection].parse({
      ...currentRecord(records, index),
      ...rawPatch,
    }) as Record<string, unknown>;
    if (collection === "skills" && patch.name)
      patch.normalizedName = normalizeSkillName(patch.name as string);
    const current = records[index];
    if (!current)
      throw new ApiError(404, "PROFILE_RECORD_NOT_FOUND", "Profile record was not found");
    Object.assign(current, patch);
    await profile.save();
    sendJson(response, 200, success(serialize(profile)));
    return true;
  }

  function currentRecord(
    records: Array<{ _id?: Types.ObjectId; [key: string]: unknown }>,
    index: number,
  ): Record<string, unknown> {
    const record = records[index];
    if (!record)
      throw new ApiError(404, "PROFILE_RECORD_NOT_FOUND", "Profile record was not found");
    const { _id: ignoredId, ...values } = record;
    void ignoredId;
    return values;
  }
  if (request.method === "DELETE") {
    records.splice(index, 1);
    await profile.save();
    sendJson(response, 200, success(serialize(profile)));
    return true;
  }
  return false;
}
