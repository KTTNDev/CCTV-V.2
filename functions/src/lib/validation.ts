import type {
  ZodError,
  ZodIssue,
} from "zod";

import { HttpError } from "./http-error";

function createFieldPath(
  issue: ZodIssue,
): string {
  if (issue.path.length === 0) {
    return "form";
  }

  return issue.path
    .map((segment) => String(segment))
    .join(".");
}

export function createValidationFields(
  error: ZodError,
): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const fieldPath = createFieldPath(issue);

    const messages =
      fields[fieldPath] ?? [];

    if (!messages.includes(issue.message)) {
      messages.push(issue.message);
    }

    fields[fieldPath] = messages;
  }

  return fields;
}

export function createValidationHttpError(
  error: ZodError,
): HttpError {
  return new HttpError({
    status: 400,
    code: "INVALID_INPUT",
    message:
      "ข้อมูลบางส่วนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
    fields: createValidationFields(error),
  });
}