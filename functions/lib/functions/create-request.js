"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequest = void 0;
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const runtime_1 = require("../config/runtime");
const auth_1 = require("../lib/auth");
const http_1 = require("../lib/http");
const http_error_1 = require("../lib/http-error");
const rate_limit_1 = require("../lib/rate-limit");
const validation_1 = require("../lib/validation");
const request_1 = require("../schemas/request");
const request_service_1 = require("../services/request-service");
const rateLimitHashKey = (0, params_1.defineSecret)("RATE_LIMIT_HASH_KEY");
exports.createRequest = (0, https_1.onRequest)({
    region: runtime_1.FUNCTION_REGION,
    memory: "256MiB",
    timeoutSeconds: 30,
    minInstances: 0,
    maxInstances: 20,
    concurrency: 40,
    cors: runtime_1.ALLOWED_CORS_ORIGINS,
    secrets: [rateLimitHashKey],
}, async (request, response) => {
    await (0, http_1.handleApiRequest)({
        request,
        response,
        allowedMethods: ["POST"],
        handler: async () => {
            await (0, auth_1.requireAppCheck)(request);
            const user = await (0, auth_1.requireAuthenticatedUser)(request);
            await (0, rate_limit_1.enforceRateLimit)({
                scope: "create-request",
                identifier: (0, rate_limit_1.createClientIdentifier)(request, user.uid),
                maxAttempts: 5,
                windowMs: 10 * 60 * 1000,
            });
            const contentType = request
                .get("Content-Type")
                ?.toLowerCase();
            if (!contentType?.startsWith("application/json")) {
                throw new http_error_1.HttpError({
                    status: 400,
                    code: "BAD_REQUEST",
                    message: "ระบบรองรับเฉพาะข้อมูล JSON",
                });
            }
            const validationResult = request_1.createRequestSchema.safeParse(request.body);
            if (!validationResult.success) {
                throw (0, validation_1.createValidationHttpError)(validationResult.error);
            }
            const draft = await (0, request_service_1.createDraftRequest)(validationResult.data, user);
            return {
                status: 201,
                data: draft,
            };
        },
    });
});
//# sourceMappingURL=create-request.js.map