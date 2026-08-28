import { z } from "zod";

export const adminRequestStatusSchema =
  z.enum([
    "pending",
    "verifying",
    "searching",
    "waiting_for_information",
    "completed",
    "rejected",
  ]);

export const updateRequestSchema = z
  .object({
    requestId: z
      .string()
      .trim()
      .min(
        1,
        "ไม่พบรหัสคำร้อง",
      )
      .max(
        128,
        "รหัสคำร้องยาวเกินไป",
      )
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "รหัสคำร้องมีรูปแบบไม่ถูกต้อง",
      ),

    status:
      adminRequestStatusSchema,

    adminNote: z
      .string()
      .trim()
      .max(
        2000,
        "หมายเหตุต้องไม่เกิน 2,000 ตัวอักษร",
      ),
  })
  .strict()
  .superRefine(
    (data, context) => {
      if (
        (
          data.status ===
            "waiting_for_information" ||
          data.status ===
            "rejected"
        ) &&
        data.adminNote.length < 5
      ) {
        context.addIssue({
          code: "custom",
          path: ["adminNote"],
          message:
            "สถานะนี้ต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร",
        });
      }
    },
  );

export type AdminRequestStatus =
  z.infer<
    typeof adminRequestStatusSchema
  >;

export type UpdateRequestInput =
  z.infer<
    typeof updateRequestSchema
  >;