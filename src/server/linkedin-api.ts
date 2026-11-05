import type { IncomingMessage, ServerResponse } from "node:http";
import { Types } from "mongoose";
import { ApiError, success } from "./api.js";
import { extractLinkedInPdf, LinkedInImport, readLinkedInUpload } from "./linkedin-import.js";

type SendJson = (response: ServerResponse, status: number, body: unknown) => void;

export async function handleLinkedInRequest(
  request: IncomingMessage,
  response: ServerResponse,
  userId: string,
  pathname: string,
  sendJson: SendJson,
): Promise<boolean> {
  if (!pathname.startsWith("/api/linkedin/")) return false;
  const ownerId = new Types.ObjectId(userId);
  if (pathname === "/api/linkedin/import" && request.method === "POST") {
    const buffer = await readLinkedInUpload(request);
    const extracted = await extractLinkedInPdf(buffer);
    const document = await LinkedInImport.create({
      userId: ownerId,
      status: "pending_review",
      extractedText: extracted.text,
      extraction: extracted,
      importedAt: new Date(),
    });
    sendJson(
      response,
      201,
      success({
        id: document.id,
        status: document.status,
        importedAt: document.importedAt,
        extraction: document.extraction,
      }),
    );
    return true;
  }
  if (pathname === "/api/linkedin/import/latest" && request.method === "GET") {
    const document = await LinkedInImport.findOne({ userId: ownerId })
      .sort({ importedAt: -1 })
      .exec();
    sendJson(
      response,
      200,
      success(
        document
          ? {
              id: document.id,
              status: document.status,
              importedAt: document.importedAt,
              extraction: document.extraction,
            }
          : null,
      ),
    );
    return true;
  }
  if (pathname.startsWith("/api/linkedin/import/")) {
    const id = pathname.slice("/api/linkedin/import/".length);
    if (!Types.ObjectId.isValid(id))
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid LinkedIn import ID");
  }
  return false;
}
