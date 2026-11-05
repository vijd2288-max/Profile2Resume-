import { Types } from "mongoose";
import { Evidence } from "./evidence-models.js";
import { DeveloperProfile } from "./profile-models.js";
import { ClarificationQuestion } from "./clarification-models.js";

export async function createClarificationQuestions(userId: string, analysisId: string) {
  const profile = await DeveloperProfile.findOne({ userId }).lean().exec();
  const questions = [];
  const projects = (profile?.projects ?? []) as Array<{
    _id: Types.ObjectId;
    projectName: string;
    description?: string;
    personalContribution?: string;
    liveDeploymentURL?: string;
  }>;
  for (const project of projects) {
    if (!project.description || !project.personalContribution) {
      questions.push({
        question: `What specific problem did ${project.projectName} solve, and what did you personally implement?`,
        category: "contribution" as const,
        relatedProjectId: project._id,
        priority: 90,
      });
    } else if (!project.liveDeploymentURL) {
      questions.push({
        question: `Was ${project.projectName} deployed or used by others?`,
        category: "deployment" as const,
        relatedProjectId: project._id,
        priority: 60,
      });
    }
  }
  const created = [];
  for (const question of questions) {
    created.push(
      await ClarificationQuestion.findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          analysisId: new Types.ObjectId(analysisId),
          question: question.question,
        },
        { $setOnInsert: { ...question, userId, analysisId } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
        .lean()
        .exec(),
    );
  }
  return created;
}

export async function answerClarification(
  userId: string,
  questionId: string,
  response: string | null,
  skipped: boolean,
) {
  const question = await ClarificationQuestion.findOne({ _id: questionId, userId }).exec();
  if (!question) return null;
  question.status = skipped ? "skipped" : "answered";
  if (response) question.response = response.trim();
  question.answeredAt = new Date();
  await question.save();
  if (response && !skipped) {
    await Evidence.findOneAndUpdate(
      {
        userId,
        sourcePlatform: "manual",
        evidenceType: "user_provided",
        sourceReference: `clarification:${question._id.toString()}`,
      },
      {
        $set: {
          description: response.trim(),
          collectedAt: new Date(),
          relatedProfileField: question.category,
        },
        $setOnInsert: { userId, verificationStatus: "pending_review", approvalStatus: "pending" },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();
  }
  return question;
}
