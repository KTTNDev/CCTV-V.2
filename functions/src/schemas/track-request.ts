import { z } from "zod";

export const trackRequestSchema = z
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

export type TrackRequestInput = z.infer<
  typeof trackRequestSchema
>;