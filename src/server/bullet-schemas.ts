import { z } from "zod";

export const generatedBulletSchema = z.object({
  text: z.string().trim().min(20).max(500),
  relevantSkills: z.array(z.string().trim().min(1).max(100)).max(20),
  supportingEvidenceIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(20),
});
export const generatedBulletsResponseSchema = z.object({
  bullets: z.array(generatedBulletSchema).min(1).max(10),
});
export const bulletGenerationInputSchema = z.object({
  analysisId: z.string().regex(/^[a-f\d]{24}$/i),
  targetRole: z.string().trim().min(2).max(120),
});
