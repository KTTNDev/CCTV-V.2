"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.createPublicApiError = createPublicApiError;
exports.normalizeUnknownError = normalizeUnknownError;
class HttpError extends Error {
    status;
    code;
    fields;
    constructor(options) {
        super(options.message);
        this.name = "HttpError";
        this.status = options.status;
        this.code = options.code;
        this.fields = options.fields;
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}
exports.HttpError = HttpError;
function createPublicApiError(error) {
    return {
        success: false,
        error: {
            code: error.code,
            message: error.message,
            ...(error.fields
                ? { fields: error.fields }
                : {}),
        },
    };
}
function normalizeUnknownError(error) {
    if (error instanceof HttpError) {
        return error;
    }
    return new HttpError({
        status: 500,
        code: "INTERNAL_ERROR",
        message: "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง",
    });
}
//# sourceMappingURL=http-error.js.map