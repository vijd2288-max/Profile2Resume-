import { z } from "zod";

export const jobDescriptionInputSchema = z.object({
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().min(40).max(30_000),
});

export const jobAnalysisSchema = z.object({
  title: z.string().trim().max(200),
  seniorityLevel: z.string().trim().max(80),
  roleCategory: z.string().trim().max(120),
  requiredSkills: z.array(z.string().trim().min(1).max(100)).max(100),
  preferredSkills: z.array(z.string().trim().min(1).max(100)).max(100),
  technologies: z.array(z.string().trim().min(1).max(100)).max(100),
  experienceRequirements: z.array(z.string().trim().min(1).max(500)).max(50),
  educationRequirements: z.array(z.string().trim().min(1).max(500)).max(20),
  responsibilities: z.array(z.string().trim().min(1).max(500)).max(50),
  keywords: z.array(z.string().trim().min(1).max(100)).max(100),
});
export type JobAnalysis = z.infer<typeof jobAnalysisSchema>;

export const aiJsonSchema = z.string().transform((value, ctx) => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "AI response was not valid JSON" });
    return z.NEVER;
  }
});
