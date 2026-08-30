import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";

import {
  ALLOWED_CORS_ORIGINS,
  FUNCTION_REGION,
} from "../config/runtime";
import {
  requireAdministrator,
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
  manageCameraSchema,
} from "../schemas/manage-camera";
import {
  manageCameraCatalog,
} from "../services/camera-catalog-service";

const rateLimitHashKey =
  defineSecret(
    "RATE_LIMIT_HASH_KEY",
  );

export const manageCamera =
  onRequest(
    {
      region: FUNCTION_REGION,
      memory: "256MiB",
      timeoutSeconds: 30,
      minInstances: 0,
      maxInstances: 10,
      concurrency: 40,
      cors:
        ALLOWED_CORS_ORIGINS,
      secrets: [rateLimitHashKey],
    },
    async (request, response) => {
      await handleApiRequest({
        request,
        response,
        allowedMethods: ["POST"],
        handler: async ({
          requestId,
        }) => {
          await requireAppCheck(
            request,
          );
          const user =
            await requireAdministrator(
              request,
            );

          await enforceRateLimit({
            scope:
              "admin-manage-camera",
            identifier:
              createClientIdentifier(
                request,
                user.uid,
              ),
            maxAttempts: 120,
            windowMs:
              10 * 60 * 1000,
          });

          const contentType =
            request
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

          const validation =
            manageCameraSchema.safeParse(
              request.body,
            );

          if (!validation.success) {
            throw createValidationHttpError(
              validation.error,
            );
          }

          const result =
            await manageCameraCatalog({
              input: validation.data,
              user,
              apiRequestId:
                requestId,
            });

          return {
            status: 200,
            data: result,
          };
        },
      });
    },
  );
