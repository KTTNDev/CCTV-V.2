import { z } from "zod";

const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;
function isValidCalendarDate(
  value: string,
): boolean {
  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    year < 1900 ||
    year > 2200
  ) {
    return false;
  }

  const parsedDate =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  return (
    parsedDate.getUTCFullYear() ===
      year &&
    parsedDate.getUTCMonth() ===
      month - 1 &&
    parsedDate.getUTCDate() === day
  );
}
export const secureTrackRequestSchema =
  z
    .object({
      trackingToken: z
        .string()
        .trim()
        .min(
          40,
          "รหัสติดตามคำร้องสั้นเกินไป",
        )
        .max(
          120,
          "รหัสติดตามคำร้องยาวเกินไป",
        ),
    })
    .strict();

export const legacyTrackRequestSchema =
  z
    .object({
      trackingId: z
        .string()
        .trim()
        .toUpperCase()
        .min(
          4,
          "หมายเลขติดตามสั้นเกินไป",
        )
        .max(
          128,
          "หมายเลขติดตามยาวเกินไป",
        )
        .regex(
          /^[A-Z0-9_-]+$/,
          "รูปแบบหมายเลขติดตามไม่ถูกต้อง",
        ),

      phoneLast4: z
        .string()
        .trim()
        .regex(
          /^\d{4}$/,
          "กรุณากรอกเบอร์โทร 4 หลักท้าย",
        ),
eventDate: z
  .string()
  .trim()
  .regex(
    DATE_PATTERN,
    "รูปแบบวันที่เกิดเหตุไม่ถูกต้อง",
  )
  .refine(
    isValidCalendarDate,
    "วันที่เกิดเหตุไม่มีอยู่จริง",
  ),
    })
    .strict();

export const trackRequestSchema =
  z.union([
    secureTrackRequestSchema,
    legacyTrackRequestSchema,
  ]);

export type SecureTrackRequestInput =
  z.infer<
    typeof secureTrackRequestSchema
  >;

export type LegacyTrackRequestInput =
  z.infer<
    typeof legacyTrackRequestSchema
  >;

export type TrackRequestInput =
  z.infer<
    typeof trackRequestSchema
  >;

export function isLegacyTrackRequestInput(
  input: TrackRequestInput,
): input is LegacyTrackRequestInput {
  return (
    "trackingId" in input &&
    "phoneLast4" in input &&
    "eventDate" in input
  );
}