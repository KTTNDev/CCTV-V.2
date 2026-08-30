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
  trackRequestSchema,
} from "../schemas/track-request";
import {
  trackRequestStatus,
} from "../services/tracking-service";

const rateLimitHashKey = defineSecret(
  "RATE_LIMIT_HASH_KEY",
);

export const trackRequest = onRequest(
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

        await enforceRateLimit({
          scope: "track-request",
          identifier:
            createClientIdentifier(
              request,
            ),
          maxAttempts: 10,
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
          trackRequestSchema.safeParse(
            request.body,
          );

        if (!validationResult.success) {
          throw createValidationHttpError(
            validationResult.error,
          );
        }

        const result =
          await trackRequestStatus(
            validationResult.data,
          );

        return {
          status: 200,
          data: result,
        };
      },
    });
  },
);
