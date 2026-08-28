import { z } from "zod";

const FIRESTORE_DOCUMENT_ID_PATTERN =
  /^[A-Za-z0-9]{20}$/;

export const finalizeRequestSchema = z
  .object({
    requestId: z
      .string()
      .trim()
      .regex(
        FIRESTORE_DOCUMENT_ID_PATTERN,
        "รหัสคำร้องไม่ถูกต้อง",
      ),
  })
  .strict();

export type FinalizeRequestInput = z.infer<
  typeof finalizeRequestSchema
>;