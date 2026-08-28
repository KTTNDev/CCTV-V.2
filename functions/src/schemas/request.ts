import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const PASSPORT_PATTERN = /^[A-Z0-9-]{5,20}$/i;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_SCENE_FILES = 5;

export const applicantTypeSchema = z.enum([
  "THAI",
  "FOREIGNER",
]);

export const eventTypeSchema = z.enum([
  "ACCIDENT",
  "THEFT",
  "VANDALISM",
  "DISPUTE",
  "OTHER",
]);

export const accidentSubtypeSchema = z.enum([
  "MC_VS_MC",
  "MC_VS_CAR",
  "CAR_VS_CAR",
  "PEDESTRIAN",
  "HIT_AND_RUN",
  "OTHER",
]);

export const foreignerInvolvementSchema = z.enum([
  "YES",
  "NO",
  "NOT_SURE",
]);

export const deliveryMethodSchema = z.enum([
  "LINE",
  "WALKIN",
]);

export const requestStatusSchema = z.enum([
  "draft",
  "pending",
  "verifying",
  "searching",
  "waiting_for_information",
  "completed",
  "rejected",
]);

export const allowedContentTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const uploadFileMetadataSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "ไม่พบชื่อไฟล์")
      .max(150, "ชื่อไฟล์ยาวเกินไป"),
    contentType: allowedContentTypeSchema,
    size: z
      .number()
      .int()
      .positive()
      .max(
        MAX_FILE_SIZE_BYTES,
        "ไฟล์ต้องมีขนาดไม่เกิน 10 MB",
      ),
  })
  .strict();

const optionalEmailSchema = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .max(254, "อีเมลยาวเกินไป")
    .email("รูปแบบอีเมลไม่ถูกต้อง"),
]);

const optionalNationalIdSchema = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .regex(/^\d{13}$/, "เลขประจำตัวประชาชนต้องมี 13 หลัก"),
]);

const optionalPassportSchema = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .regex(
      PASSPORT_PATTERN,
      "หมายเลขหนังสือเดินทางไม่ถูกต้อง",
    ),
]);

export const createRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร")
      .max(150, "ชื่อยาวเกินไป"),

    applicantType: applicantTypeSchema,

    nationalId: optionalNationalIdSchema,

    passportNumber: optionalPassportSchema,

    phone: z
      .string()
      .trim()
      .transform((value) => value.replace(/[\s-]/g, ""))
      .pipe(
        z
          .string()
          .regex(
            /^(?:\+66|0)\d{8,9}$/,
            "รูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง",
          ),
      ),

    email: optionalEmailSchema,

    eventDate: z
      .string()
      .trim()
      .regex(DATE_PATTERN, "รูปแบบวันที่ไม่ถูกต้อง"),

    eventTimeStart: z
      .string()
      .trim()
      .regex(TIME_PATTERN, "รูปแบบเวลาเริ่มต้นไม่ถูกต้อง"),

    eventTimeEnd: z
      .string()
      .trim()
      .regex(TIME_PATTERN, "รูปแบบเวลาสิ้นสุดไม่ถูกต้อง"),

    eventType: eventTypeSchema,

    accidentSubtype: accidentSubtypeSchema.optional(),

    isForeignerInvolved:
      foreignerInvolvementSchema.optional(),

    location: z
      .string()
      .trim()
      .min(3, "กรุณาระบุสถานที่เกิดเหตุ")
      .max(300, "รายละเอียดสถานที่ยาวเกินไป"),

    latitude: z
      .number()
      .finite()
      .min(-90)
      .max(90),

    longitude: z
      .number()
      .finite()
      .min(-180)
      .max(180),

    description: z
      .string()
      .trim()
      .min(10, "กรุณาอธิบายเหตุการณ์อย่างน้อย 10 ตัวอักษร")
      .max(2000, "รายละเอียดเหตุการณ์ยาวเกินไป"),

    deliveryMethod: deliveryMethodSchema,

    privacyAccepted: z.literal(true, {
      error: "กรุณายอมรับประกาศความเป็นส่วนตัว",
    }),

    expectedFiles: z
      .object({
        idCard: uploadFileMetadataSchema,
        policeReport: uploadFileMetadataSchema,
        scene: z
          .array(uploadFileMetadataSchema)
          .max(
            MAX_SCENE_FILES,
            `แนบภาพเหตุการณ์ได้ไม่เกิน ${MAX_SCENE_FILES} ไฟล์`,
          ),
      })
      .strict(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.applicantType === "THAI") {
      if (!data.nationalId) {
        context.addIssue({
          code: "custom",
          path: ["nationalId"],
          message: "กรุณากรอกเลขประจำตัวประชาชน",
        });
      } else if (!isValidThaiNationalId(data.nationalId)) {
        context.addIssue({
          code: "custom",
          path: ["nationalId"],
          message: "เลขประจำตัวประชาชนไม่ผ่านการตรวจสอบ",
        });
      }
    }

    if (
      data.applicantType === "FOREIGNER" &&
      !data.passportNumber
    ) {
      context.addIssue({
        code: "custom",
        path: ["passportNumber"],
        message: "กรุณากรอกหมายเลขหนังสือเดินทาง",
      });
    }

    if (
      data.eventType === "ACCIDENT" &&
      !data.accidentSubtype
    ) {
      context.addIssue({
        code: "custom",
        path: ["accidentSubtype"],
        message: "กรุณาระบุลักษณะอุบัติเหตุ",
      });
    }

    if (
      data.eventType === "ACCIDENT" &&
      !data.isForeignerInvolved
    ) {
      context.addIssue({
        code: "custom",
        path: ["isForeignerInvolved"],
        message:
          "กรุณาระบุว่าเหตุการณ์เกี่ยวข้องกับชาวต่างชาติหรือไม่",
      });
    }

    if (data.eventTimeEnd <= data.eventTimeStart) {
      context.addIssue({
        code: "custom",
        path: ["eventTimeEnd"],
        message: "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น",
      });
    }

    const eventDate = new Date(`${data.eventDate}T00:00:00`);
    const today = new Date();

    today.setHours(23, 59, 59, 999);

    if (
      Number.isNaN(eventDate.getTime()) ||
      eventDate > today
    ) {
      context.addIssue({
        code: "custom",
        path: ["eventDate"],
        message: "วันที่เกิดเหตุต้องไม่เป็นวันในอนาคต",
      });
    }
  });

export function isValidThaiNationalId(value: string): boolean {
  if (!/^\d{13}$/.test(value)) {
    return false;
  }

  const digits = value.split("").map(Number);

  const weightedSum = digits
    .slice(0, 12)
    .reduce(
      (sum, digit, index) => sum + digit * (13 - index),
      0,
    );

  const expectedCheckDigit = (11 - (weightedSum % 11)) % 10;

  return expectedCheckDigit === digits[12];
}

export type ApplicantType = z.infer<
  typeof applicantTypeSchema
>;

export type EventType = z.infer<
  typeof eventTypeSchema
>;

export type RequestStatus = z.infer<
  typeof requestStatusSchema
>;

export type UploadFileMetadata = z.infer<
  typeof uploadFileMetadataSchema
>;

export type CreateRequestInput = z.infer<
  typeof createRequestSchema
>;