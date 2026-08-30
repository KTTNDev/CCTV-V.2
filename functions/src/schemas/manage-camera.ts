import { z } from "zod";

const cameraIdSchema = z
  .string()
  .trim()
  .min(1, "ไม่พบรหัสกล้อง")
  .max(80, "รหัสกล้องยาวเกินไป")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "รหัสกล้องมีรูปแบบไม่ถูกต้อง",
  );

const optionalText = (
  maximumLength: number,
) =>
  z
    .string()
    .trim()
    .max(maximumLength);

const publicCameraSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "กรุณาระบุชื่อกล้อง")
      .max(160),
    shortName: z
      .string()
      .trim()
      .min(2, "กรุณาระบุชื่อย่อ")
      .max(80),
    description: optionalText(500),
    category: z.enum([
      "flood",
      "traffic",
      "tourism",
    ]),
    location: z
      .string()
      .trim()
      .min(2, "กรุณาระบุจุดติดตั้ง")
      .max(200),
    latitude: z
      .number()
      .min(-90)
      .max(90)
      .nullable(),
    longitude: z
      .number()
      .min(-180)
      .max(180)
      .nullable(),
    streamPath: z
      .string()
      .trim()
      .min(1, "กรุณาระบุ Media Gateway path")
      .max(180)
      .regex(
        /^[a-zA-Z0-9/_-]+$/,
        "Media Gateway path มีรูปแบบไม่ถูกต้อง",
      ),
    status: z.enum([
      "online",
      "offline",
      "maintenance",
    ]),
    published: z.boolean(),
    sortOrder: z
      .number()
      .int()
      .min(0)
      .max(9999),
  })
  .strict();

const privateCameraSchema = z
  .object({
    siteCode: optionalText(80),
    cameraType: z.enum([
      "fixed",
      "ptz",
      "lpr",
      "thermal",
      "other",
    ]),
    brand: optionalText(100),
    model: optionalText(120),
    serialNumber: optionalText(160),
    assetNumber: optionalText(160),
    ipAddress: optionalText(255).refine(
      (value) =>
        !value ||
        /^[a-zA-Z0-9.-]+$/.test(
          value,
        ),
      "IP หรือ hostname มีรูปแบบไม่ถูกต้อง",
    ),
    rtspPort: z
      .number()
      .int()
      .min(1)
      .max(65535)
      .nullable(),
    rtspPath: optionalText(500).refine(
      (value) =>
        !value ||
        (!value.includes("@") &&
          !/^rtsps?:\/\//i.test(
            value,
          )),
      "กรุณาระบุเฉพาะ RTSP path โดยไม่ใส่ URL หรือข้อมูลเข้าสู่ระบบ",
    ),
    managementUrl: optionalText(500).refine(
      (value) => {
        if (!value) {
          return true;
        }

        try {
          const url = new URL(value);
          return (
            url.protocol === "http:" ||
            url.protocol === "https:"
          );
        } catch {
          return false;
        }
      },
      "ลิงก์จัดการกล้องต้องเป็น http หรือ https",
    ),
    nvrChannel: optionalText(80),
    resolution: optionalText(80),
    direction: optionalText(160),
    installationDate: optionalText(20).refine(
      (value) =>
        !value ||
        /^\d{4}-\d{2}-\d{2}$/.test(
          value,
        ),
      "วันที่ติดตั้งมีรูปแบบไม่ถูกต้อง",
    ),
    responsibleUnit: optionalText(160),
    credentialReference: optionalText(160),
    technicalNotes: optionalText(2000),
  })
  .strict();

const upsertSchema = z
  .object({
    action: z.literal("upsert"),
    cameraId: cameraIdSchema
      .optional(),
    publicData: publicCameraSchema,
    privateData: privateCameraSchema,
  })
  .strict();

const archiveSchema = z
  .object({
    action: z.literal("archive"),
    cameraId: cameraIdSchema,
  })
  .strict();

export const manageCameraSchema =
  z.discriminatedUnion("action", [
    upsertSchema,
    archiveSchema,
  ]);

export type ManageCameraInput =
  z.infer<typeof manageCameraSchema>;
