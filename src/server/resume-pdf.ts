import PDFDocument from "pdfkit";
import type { ResumeDocument, ResumeSections, ResumeBulletValue } from "./resume-models.js";

type PdfDocument = InstanceType<typeof PDFDocument>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function approvedBullets(value: unknown): ResumeBulletValue[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (bullet): bullet is ResumeBulletValue =>
      typeof bullet === "object" &&
      bullet !== null &&
      text((bullet as ResumeBulletValue).text) !== "" &&
      (bullet as ResumeBulletValue).approvalStatus === "approved" &&
      ["supported", "user_confirmed"].includes((bullet as ResumeBulletValue).validationStatus),
  );
}

function value(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const candidate = text(record[key]);
    if (candidate) return candidate;
  }
  return "";
}

function addHeading(document: PdfDocument, heading: string): void {
  document.moveDown(0.7).font("Helvetica-Bold").fontSize(12).text(heading.toUpperCase());
  document.moveTo(54, document.y).lineTo(558, document.y).strokeColor("#666666").stroke();
  document.moveDown(0.25).font("Helvetica").fontSize(10);
}

function addBullets(document: PdfDocument, bullets: ResumeBulletValue[]): void {
  for (const bullet of bullets) {
    document.font("Helvetica").fontSize(10).text(`• ${bullet.text}`, {
      width: 500,
      lineGap: 2,
    });
  }
}

function addRecords(
  document: PdfDocument,
  records: Array<Record<string, unknown> & { bullets?: ResumeBulletValue[] }>,
  fields: Array<[string, string[]]>,
): void {
  for (const record of records) {
    const title = value(record, ...(fields[0]?.[1] ?? []));
    const detail = value(record, ...(fields[1]?.[1] ?? []));
    if (title) document.font("Helvetica-Bold").text(title);
    if (detail) document.font("Helvetica-Oblique").text(detail);
    const description = value(record, "description", "personalContribution", "summary");
    if (description) document.font("Helvetica").text(description, { width: 500, lineGap: 2 });
    addBullets(document, approvedBullets(record.bullets));
    document.moveDown(0.25);
  }
}

function addLinks(document: PdfDocument, personal: Record<string, string>): void {
  const links = [
    ["email", "mailto:"],
    ["personalWebsite", ""],
    ["portfolioURL", ""],
    ["githubURL", ""],
    ["linkedInURL", ""],
  ] as const;
  const present = links
    .map(([key, prefix]) => {
      const link = text(personal[key]);
      return link
        ? { label: link, href: prefix && !link.startsWith(prefix) ? `${prefix}${link}` : link }
        : null;
    })
    .filter((entry): entry is { label: string; href: string } => entry !== null);
  if (!present.length) return;
  document.font("Helvetica").fontSize(9);
  present.forEach((entry, index) => {
    if (index) document.text(" | ", { continued: true });
    document
      .fillColor("#1d4ed8")
      .text(entry.label, { link: entry.href, continued: index < present.length - 1 });
  });
  document.fillColor("#111111").text("");
}

export function createResumePdf(
  resume: Pick<ResumeDocument, "title" | "targetRole" | "sections">,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "LETTER",
      margins: { top: 48, bottom: 48, left: 54, right: 54 },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    const sections = resume.sections as ResumeSections;
    const personal = sections.personalInformation;
    const name = text(personal.fullName) || resume.title;
    document.font("Helvetica-Bold").fontSize(20).text(name);
    if (text(personal.professionalHeadline) || resume.targetRole) {
      document
        .font("Helvetica")
        .fontSize(11)
        .text(text(personal.professionalHeadline) || resume.targetRole);
    }
    addLinks(document, personal);

    if (text(sections.professionalSummary)) {
      addHeading(document, "Professional Summary");
      document
        .font("Helvetica")
        .fontSize(10)
        .text(sections.professionalSummary, { width: 500, lineGap: 2 });
    }
    if (sections.technicalSkills.length) {
      addHeading(document, "Technical Skills");
      document.text(sections.technicalSkills.filter((skill) => text(skill)).join(" | "), {
        width: 500,
      });
    }
    if (sections.workExperience.length) {
      addHeading(document, "Work Experience");
      addRecords(document, sections.workExperience, [
        ["title", ["jobTitle", "title", "organization"]],
        ["organization", ["organization", "company", "location"]],
      ]);
    }
    if (sections.projects.length) {
      addHeading(document, "Projects");
      addRecords(document, sections.projects, [
        ["project", ["projectName", "name", "title"]],
        ["technology", ["technologies", "repositoryURL"]],
      ]);
    }
    if (sections.education.length) {
      addHeading(document, "Education");
      addRecords(document, sections.education, [
        ["institution", ["institutionName", "school", "name"]],
        ["degree", ["degree", "fieldOfStudy"]],
      ]);
    }
    if (sections.certifications.length) {
      addHeading(document, "Certifications");
      addRecords(document, sections.certifications, [
        ["certification", ["certificationName", "name", "title"]],
        ["issuer", ["issuingOrganization", "issuer"]],
      ]);
    }
    if (sections.achievements.length) {
      addHeading(document, "Achievements");
      addRecords(document, sections.achievements, [
        ["achievement", ["title", "name"]],
        ["detail", ["description", "category"]],
      ]);
    }
    document.end();
  });
}

export function resumePdfFilename(title: string): string {
  const safe = title
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${safe || "resume"}.pdf`;
}
