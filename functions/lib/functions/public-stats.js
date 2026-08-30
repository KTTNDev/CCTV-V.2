"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicStats = void 0;
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const runtime_1 = require("../config/runtime");
const auth_1 = require("../lib/auth");
const http_1 = require("../lib/http");
const http_error_1 = require("../lib/http-error");
const rate_limit_1 = require("../lib/rate-limit");
const validation_1 = require("../lib/validation");
const public_stats_1 = require("../schemas/public-stats");
const public_stats_service_1 = require("../services/public-stats-service");
const rateLimitHashKey = (0, params_1.defineSecret)("RATE_LIMIT_HASH_KEY");
exports.publicStats = (0, https_1.onRequest)({
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
            const clientIdentifier = (0, rate_limit_1.createClientIdentifier)(request);
            await (0, rate_limit_1.enforceRateLimit)({
                scope: "public-stats",
                identifier: clientIdentifier,
                maxAttempts: 60,
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
            const validationResult = public_stats_1.publicStatsSchema.safeParse(request.body);
            if (!validationResult.success) {
                throw (0, validation_1.createValidationHttpError)(validationResult.error);
            }
            let recordVisit = validationResult.data
                .recordVisit;
            if (recordVisit) {
                try {
                    await (0, rate_limit_1.enforceRateLimit)({
                        scope: "record-public-visit",
                        identifier: clientIdentifier,
                        maxAttempts: 5,
                        windowMs: 24 * 60 * 60 * 1000,
                    });
                }
                catch (error) {
                    if (error instanceof
                        http_error_1.HttpError &&
                        error.code ===
                            "RATE_LIMITED") {
                        // ยังคืนสถิติให้ตามปกติ
                        // แต่ไม่นับยอดซ้ำเพิ่มเติม
                        recordVisit = false;
                    }
                    else {
                        throw error;
                    }
                }
            }
            const result = await (0, public_stats_service_1.getPublicStats)({
                recordVisit,
            });
            return {
                status: 200,
                data: result,
            };
        },
    });
});
//# sourceMappingURL=public-stats.js.map