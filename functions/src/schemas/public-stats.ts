import { z } from "zod";

export const publicStatsSchema = z
  .object({
    recordVisit: z
      .boolean()
      .optional()
      .default(false),
  })
  .strict();

export type PublicStatsInput = z.infer<
  typeof publicStatsSchema
>;