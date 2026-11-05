import { model, models, Schema, type Document, type Model, type Types } from "mongoose";
import type { RankedRepository, RankableRepository } from "./github-ranking.js";

export interface ProjectOverrideDocument extends Document {
  userId: Types.ObjectId;
  githubId: number;
  include: boolean;
  exclude: boolean;
  pinned: boolean;
  priority: number;
  automaticRanking: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const projectOverrideSchema = new Schema<ProjectOverrideDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    githubId: { type: Number, required: true, min: 1 },
    include: { type: Boolean, default: false },
    exclude: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    priority: { type: Number, default: 0, min: -100, max: 100 },
    automaticRanking: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);
projectOverrideSchema.index({ userId: 1, githubId: 1 }, { unique: true });

export const ProjectOverride: Model<ProjectOverrideDocument> =
  (models.ProjectOverride as Model<ProjectOverrideDocument> | undefined) ??
  model<ProjectOverrideDocument>("ProjectOverride", projectOverrideSchema);

export type ProjectOverrideValues = Pick<
  ProjectOverrideDocument,
  "include" | "exclude" | "pinned" | "priority" | "automaticRanking"
>;

export function applyProjectOverrides<T extends RankableRepository>(
  ranked: RankedRepository<T>[],
  overrides: Map<number, ProjectOverrideValues>,
): RankedRepository<T>[] {
  return ranked
    .map((item) => {
      const override = overrides.get(item.repository.githubId);
      if (!override) return item;
      const score = override.automaticRanking
        ? Math.max(0, Math.min(100, item.score + override.priority))
        : override.priority;
      return {
        ...item,
        score,
        explanation: override.pinned
          ? "Pinned by the user; automatic ranking remains visible for context."
          : override.include
            ? "Included by the user; automatic ranking remains visible for context."
            : override.exclude
              ? "Excluded by the user."
              : item.explanation,
      };
    })
    .filter((item) => {
      const override = overrides.get(item.repository.githubId);
      return !override?.exclude || override.include || override.pinned;
    })
    .sort((left, right) => {
      const leftOverride = overrides.get(left.repository.githubId);
      const rightOverride = overrides.get(right.repository.githubId);
      const leftPinned = leftOverride?.pinned ? 1 : 0;
      const rightPinned = rightOverride?.pinned ? 1 : 0;
      return (
        rightPinned - leftPinned ||
        right.score - left.score ||
        left.repository.githubId - right.repository.githubId
      );
    });
}
