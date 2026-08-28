"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackRequest = void 0;
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../lib/auth");
const http_1 = require("../lib/http");
const http_error_1 = require("../lib/http-error");
const rate_limit_1 = require("../lib/rate-limit");
const validation_1 = require("../lib/validation");
const track_request_1 = require("../schemas/track-request");
const tracking_service_1 = require("../services/tracking-service");
const rateLimitHashKey = (0, params_1.defineSecret)("RATE_LIMIT_HASH_KEY");
exports.trackRequest = (0, https_1.onRequest)({
    region: "asia-southeast1",
    memory: "256MiB",
    timeoutSeconds: 30,
    minInstances: 0,
    maxInstances: 20,
    concurrency: 40,
    cors: [
        /^http:\/\/localhost(?::\d+)?$/,
        /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
        "https://db-rawaicctv.web.app",
        "https://db-rawaicctv.firebaseapp.com",
    ],
    secrets: [rateLimitHashKey],
}, async (request, response) => {
    await (0, http_1.handleApiRequest)({
        request,
        response,
        allowedMethods: ["POST"],
        handler: async () => {
            await (0, auth_1.requireAppCheck)(request);
            await (0, rate_limit_1.enforceRateLimit)({
                scope: "track-request",
                identifier: (0, rate_limit_1.createClientIdentifier)(request),
                maxAttempts: 10,
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
            const validationResult = track_request_1.trackRequestSchema.safeParse(request.body);
            if (!validationResult.success) {
                throw (0, validation_1.createValidationHttpError)(validationResult.error);
            }
            const result = await (0, tracking_service_1.trackRequestStatus)(validationResult.data);
            return {
                status: 200,
                data: result,
            };
        },
    });
});
//# sourceMappingURL=track-request.js.map