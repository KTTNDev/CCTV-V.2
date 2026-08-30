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
  requireAuthenticatedUser,
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
  finalizeRequestSchema,
} from "../schemas/finalize-request";
import {
  finalizeDraftRequest,
} from "../services/finalize-request-service";

const rateLimitHashKey = defineSecret(
  "RATE_LIMIT_HASH_KEY",
);

export const finalizeRequest = onRequest(
    {
    region: FUNCTION_REGION,
    memory: "256MiB",
    timeoutSeconds: 60,
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

        const user =
          await requireAuthenticatedUser(
            request,
          );

        await enforceRateLimit({
          scope: "finalize-request",
          identifier:
            createClientIdentifier(
              request,
              user.uid,
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
          finalizeRequestSchema.safeParse(
            request.body,
          );

        if (!validationResult.success) {
          throw createValidationHttpError(
            validationResult.error,
          );
        }

        const result =
          await finalizeDraftRequest(
            validationResult.data,
            user,
          );

        return {
          status: 200,
          data: result,
        };
      },
    });
  },
);
