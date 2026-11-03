import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";
const ivLength = 12;

function getKey(source: NodeJS.ProcessEnv = process.env): Buffer {
  const secret = source.API_SECRET_KEY?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("API_SECRET_KEY must contain at least 32 characters");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string, source?: NodeJS.ProcessEnv): string {
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv(algorithm, getKey(source), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(value: string, source?: NodeJS.ProcessEnv): string {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Encrypted secret has an invalid format");
  }

  const decipher = createDecipheriv(algorithm, getKey(source), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
