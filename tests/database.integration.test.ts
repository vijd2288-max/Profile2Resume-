import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectToDatabase, disconnectFromDatabase } from "../src/server/db.js";
import { User } from "../src/server/models.js";
import { DeveloperProfile } from "../src/server/profile-models.js";
import { emptyResumeSections, Resume, ResumeVersion } from "../src/server/resume-models.js";

const mongoUri = process.env.MONGODB_TEST_URI?.trim();
const databaseName = `profile2resume_phase1_test_${randomUUID().replaceAll("-", "")}`;
const databaseEnv = {
  MONGODB_URI: mongoUri,
  MONGODB_DB_NAME: databaseName,
};

describe("MongoDB persistence", () => {
  beforeAll(async () => {
    if (!mongoUri) {
      throw new Error("MONGODB_TEST_URI is required to run the real database integration test");
    }
    await connectToDatabase(databaseEnv);
  });

  afterAll(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
      }
    } finally {
      await disconnectFromDatabase();
    }
  });

  it("creates, reads, updates, persists across processes, and deletes a user", async () => {
    const email = `phase1-${randomUUID()}@example.test`;
    const user = await User.create({ email, authProvider: "github" });
    const profile = await DeveloperProfile.create({
      userId: user._id,
      education: [{ institutionName: "Sample University" }],
      experience: [{ organization: "Sample Company" }],
      technicalSkills: [
        { name: "TypeScript", normalizedName: "typescript", category: "programming_languages" },
      ],
      projects: [{ projectName: "Sample Project" }],
      certifications: [{ certificationName: "Sample Certification" }],
    });
    expect(profile.userId.toString()).toBe(user._id.toString());
    const sections = {
      ...emptyResumeSections(),
      education: [{ institutionName: "Sample University" }],
      workExperience: [{ organization: "Sample Company" }],
      technicalSkills: ["TypeScript"],
      projects: [{ projectName: "Sample Project" }],
      certifications: [{ certificationName: "Sample Certification" }],
    };
    const resume = await Resume.create({
      userId: user._id,
      title: "Integration Test Resume",
      targetRole: "Software Engineer",
      sections,
    });
    await ResumeVersion.create({
      userId: user._id,
      resumeId: resume._id,
      versionNumber: 1,
      reason: "created",
      snapshot: sections,
      title: resume.title,
      targetRole: resume.targetRole,
    });

    const loadedProfile = await DeveloperProfile.findOne({ userId: user._id }).exec();
    const loadedResume = await Resume.findOne({ userId: user._id }).exec();
    const loadedVersion = await ResumeVersion.findOne({ resumeId: resume._id }).exec();
    expect(loadedProfile?.technicalSkills[0]?.normalizedName).toBe("typescript");
    expect(loadedResume?.sections.education[0]?.institutionName).toBe("Sample University");
    expect(loadedVersion?.userId.toString()).toBe(user._id.toString());

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: { name: "Updated Test User" } },
      { new: true, runValidators: true },
    ).exec();
    expect(updatedUser?.name).toBe("Updated Test User");

    await disconnectFromDatabase();
    let childOutput: string;
    try {
      childOutput = execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          [
            "import mongoose from 'mongoose';",
            "const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));",
            "await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME, serverSelectionTimeoutMS: 5000 });",
            "const user = await User.findById(process.env.PROFILE_TEST_USER_ID).lean();",
            "if (!user) process.exitCode = 2;",
            "else console.log(`${user.email}|${user.name}`);",
            "await mongoose.disconnect();",
          ].join("\n"),
        ],
        {
          encoding: "utf8",
          env: { ...process.env, ...databaseEnv, PROFILE_TEST_USER_ID: user._id.toString() },
        },
      );
    } finally {
      await connectToDatabase(databaseEnv);
    }
    expect(childOutput.trim()).toBe(`${email}|Updated Test User`);

    expect(await User.findByIdAndDelete(user._id).exec()).not.toBeNull();
    expect(await User.findById(user._id).exec()).toBeNull();
  });
});
