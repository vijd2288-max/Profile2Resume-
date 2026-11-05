import { PDFParse } from "pdf-parse";
import { model, models, Schema, type Document, type Model, type Types } from "mongoose";
import type { IncomingMessage } from "node:http";
import { ApiError } from "./api.js";

export const MAX_LINKEDIN_PDF_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_TEXT = 100_000;

export type LinkedInExtraction = {
  fullName?: string;
  headline?: string;
  summary?: string;
  skills: string[];
  experience: Array<{
    organization: string;
    jobTitle?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education: Array<{
    institutionName: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
  }>;
  certifications: Array<{
    certificationName: string;
    issuingOrganization?: string;
    issueDate?: string;
  }>;
};

const linkedInImportSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sourceProvider: { type: String, enum: ["linkedin"], default: "linkedin" },
    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected"],
      default: "pending_review",
    },
    extractedText: { type: String, required: true, maxlength: MAX_EXTRACTED_TEXT, select: false },
    extraction: { type: Schema.Types.Mixed, required: true },
    sectionStatuses: { type: Map, of: String, default: {} },
    importedAt: { type: Date, required: true },
    reviewedAt: Date,
  },
  { timestamps: true, versionKey: false },
);
linkedInImportSchema.index({ userId: 1, importedAt: -1 });

export interface LinkedInImportDocument extends Document {
  userId: Types.ObjectId;
  sourceProvider: "linkedin";
  status: "pending_review" | "approved" | "rejected";
  extractedText: string;
  extraction: LinkedInExtraction;
  sectionStatuses: Map<string, "pending_review" | "approved" | "rejected">;
  importedAt: Date;
  reviewedAt?: Date;
}

export const LinkedInImport: Model<LinkedInImportDocument> =
  (models.LinkedInImport as Model<LinkedInImportDocument> | undefined) ??
  model<LinkedInImportDocument>("LinkedInImport", linkedInImportSchema);

function section(text: string, names: string[]): string {
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const match = text.match(
    new RegExp(
      `(?:^|\\n)\\s*(?:${escaped})\\s*\\n([\\s\\S]*?)(?=\\n\\s*[A-Z][A-Za-z &/]+\\s*\\n|$)`,
      "i",
    ),
  );
  return match?.[1]?.trim() ?? "";
}

function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseLinkedInText(text: string): LinkedInExtraction {
  const normalized = text
    .split("")
    .filter((character) => character.charCodeAt(0) !== 0)
    .join("")
    .replace(/[ \t]+/g, " ")
    .trim();
  const allLines = lines(normalized);
  const headlineIndex = allLines.findIndex((line) => /headline|summary|about/i.test(line));
  const fullName = allLines[0] && allLines[0].length <= 120 ? allLines[0] : undefined;
  const headline = headlineIndex > 0 ? allLines[headlineIndex - 1] : undefined;
  const summary = section(normalized, ["About", "Summary"]);
  const skillText = section(normalized, ["Skills", "Top Skills"]);
  const skills = lines(skillText).slice(0, 100);
  const experienceText = section(normalized, ["Experience"]);
  const educationText = section(normalized, ["Education"]);
  const certificationsText = section(normalized, ["Licenses & Certifications", "Certifications"]);
  const parseEntries = (
    value: string,
    key: "organization" | "institutionName" | "certificationName",
  ) =>
    lines(value)
      .map((entry) => ({ [key]: entry }))
      .slice(0, 50) as Array<Record<string, string>>;
  return {
    ...(fullName ? { fullName } : {}),
    ...(headline ? { headline } : {}),
    ...(summary ? { summary } : {}),
    skills,
    experience: parseEntries(experienceText, "organization") as LinkedInExtraction["experience"],
    education: parseEntries(educationText, "institutionName") as LinkedInExtraction["education"],
    certifications: parseEntries(
      certificationsText,
      "certificationName",
    ) as LinkedInExtraction["certifications"],
  };
}

export async function extractLinkedInPdf(
  buffer: Buffer,
): Promise<LinkedInExtraction & { text: string }> {
  if (buffer.length === 0) throw new ApiError(400, "EMPTY_PDF", "The uploaded PDF is empty");
  if (buffer.length > MAX_LINKEDIN_PDF_BYTES)
    throw new ApiError(413, "PDF_TOO_LARGE", "PDF must be 10 MB or smaller");
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new ApiError(415, "INVALID_PDF", "Only valid PDF files are accepted");
  }
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = result.text.slice(0, MAX_EXTRACTED_TEXT).trim();
    if (!text)
      throw new ApiError(
        422,
        "PDF_HAS_NO_TEXT",
        "The PDF has no extractable text; scanned PDFs are not supported",
      );
    return { ...parseLinkedInText(text), text };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, "PDF_EXTRACTION_FAILED", "The LinkedIn PDF could not be extracted");
  } finally {
    await parser.destroy();
  }
}

async function readUpload(request: IncomingMessage): Promise<Buffer> {
  const contentType = request.headers["content-type"] ?? "";
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) throw new ApiError(400, "MULTIPART_REQUIRED", "Upload must use multipart/form-data");
  const boundary = Buffer.from(`--${match[1] ?? match[2]}`);
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += part.length;
    if (total > MAX_LINKEDIN_PDF_BYTES + 1024 * 1024)
      throw new ApiError(413, "PDF_TOO_LARGE", "PDF must be 10 MB or smaller");
    chunks.push(part);
  }
  const body = Buffer.concat(chunks);
  const start = body.indexOf(Buffer.from("\r\n\r\n"));
  const end = body.lastIndexOf(boundary);
  if (start < 0 || end < 0) throw new ApiError(400, "INVALID_UPLOAD", "PDF form data is malformed");
  const header = body.subarray(0, start).toString("utf8");
  if (!/name="file"/i.test(header) || !/filename="[^"]+\.pdf"/i.test(header)) {
    throw new ApiError(415, "PDF_REQUIRED", "Upload a file with a .pdf filename");
  }
  return body.subarray(start + 4, Math.max(start + 4, end - 2));
}

export async function readLinkedInUpload(request: IncomingMessage): Promise<Buffer> {
  return readUpload(request);
}
