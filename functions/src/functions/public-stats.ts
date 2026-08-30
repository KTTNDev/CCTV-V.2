import {
  defineSecret,
} from "firebase-functions/params";
import {
  onRequest,
} from "firebase-functions/v2/https";

import {
  ALLOWED_CORS_ORIGINS,
  FUNCTION_REGION,
} from "../config/runtime";
import {
  requireAppCheck,
} from "../lib/auth";
import {
  handleApiRequest,
} from "../lib/http";
import { HttpError } from "../lib/http-error";
import {
  createClientIdentifier,
  enforceRateLimit,
} from "../lib/rate-limit";
import {
  createValidationHttpError,
} from "../lib/validation";
import {
  publicStatsSchema,
} from "../schemas/public-stats";
import {
  getPublicStats,
} from "../services/public-stats-service";

const rateLimitHashKey = defineSecret(
  "RATE_LIMIT_HASH_KEY",
);

export const publicStats = onRequest(
  {
    region: FUNCTION_REGION,
    memory: "256MiB",
    timeoutSeconds: 30,
    minInstances: 0,
    maxInstances: 20,
    concurrency: 40,
    cors: ALLOWED_CORS_ORIGINS,
    secrets: [rateLimitHashKey],
  },
  async (request, response) => {
    await handleApiRequest({
      request,
      response,
      allowedMethods: ["POST"],

      handler: async () => {
        await requireAppCheck(request);

        const clientIdentifier =
          createClientIdentifier(
            request,
          );

        await enforceRateLimit({
          scope: "public-stats",
          identifier:
            clientIdentifier,
          maxAttempts: 60,
          windowMs: 10 * 60 * 1000,
        });

        const contentType = request
          .get("Content-Type")
          ?.toLowerCase();

        if (
          !contentType?.startsWith(
            "application/json",
          )
        ) {
          throw new HttpError({
            status: 400,
            code: "BAD_REQUEST",
            message:
              "ระบบรองรับเฉพาะข้อมูล JSON",
          });
        }

        const validationResult =
          publicStatsSchema.safeParse(
            request.body,
          );

        if (!validationResult.success) {
          throw createValidationHttpError(
            validationResult.error,
          );
        }

        let recordVisit =
          validationResult.data
            .recordVisit;

        if (recordVisit) {
          try {
            await enforceRateLimit({
              scope:
                "record-public-visit",
              identifier:
                clientIdentifier,
              maxAttempts: 5,
              windowMs:
                24 * 60 * 60 * 1000,
            });
          } catch (error) {
            if (
              error instanceof
                HttpError &&
              error.code ===
                "RATE_LIMITED"
            ) {
              // ยังคืนสถิติให้ตามปกติ
              // แต่ไม่นับยอดซ้ำเพิ่มเติม
              recordVisit = false;
            } else {
              throw error;
            }
          }
        }

        const result =
          await getPublicStats({
            recordVisit,
          });

        return {
          status: 200,
          data: result,
        };
      },
    });
  },
);
