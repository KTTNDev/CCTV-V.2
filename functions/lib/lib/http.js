"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleApiRequest = handleApiRequest;
const node_crypto_1 = require("node:crypto");
const firebase_functions_1 = require("firebase-functions");
const http_error_1 = require("./http-error");
function createRequestId(request) {
    const suppliedRequestId = request.get("X-Request-Id");
    if (suppliedRequestId &&
        /^[a-zA-Z0-9_-]{8,80}$/.test(suppliedRequestId)) {
        return suppliedRequestId;
    }
    return (0, node_crypto_1.randomUUID)();
}
function setCommonHeaders(response) {
    response.set("Content-Type", "application/json; charset=utf-8");
    response.set("Cache-Control", "no-store");
    response.set("Pragma", "no-cache");
    response.set("X-Content-Type-Options", "nosniff");
    response.set("Referrer-Policy", "no-referrer");
}
function writeErrorLog(requestId, request, error, originalError) {
    const metadata = {
        requestId,
        method: request.method,
        status: error.status,
        code: error.code,
    };
    if (error.status >= 500) {
        firebase_functions_1.logger.error("Unhandled API error", originalError instanceof Error
            ? {
                ...metadata,
                errorName: originalError.name,
                stack: originalError.stack,
            }
            : metadata);
        return;
    }
    firebase_functions_1.logger.warn("API request rejected", metadata);
}
async function handleApiRequest(options) {
    const { request, response, allowedMethods, handler, } = options;
    const requestId = createRequestId(request);
    setCommonHeaders(response);
    try {
        const method = request.method.toUpperCase();
        if (!allowedMethods.includes(method)) {
            response.set("Allow", allowedMethods.join(", "));
            throw new http_error_1.HttpError({
                status: 405,
                code: "METHOD_NOT_ALLOWED",
                message: "HTTP method นี้ไม่รองรับ",
            });
        }
        const result = await handler({ requestId });
        const responseBody = {
            success: true,
            data: result.data,
            requestId,
        };
        response
            .status(result.status ?? 200)
            .json(responseBody);
    }
    catch (originalError) {
        const error = (0, http_error_1.normalizeUnknownError)(originalError);
        writeErrorLog(requestId, request, error, originalError);
        response.status(error.status).json({
            ...(0, http_error_1.createPublicApiError)(error),
            requestId,
        });
    }
}
//# sourceMappingURL=http.js.map