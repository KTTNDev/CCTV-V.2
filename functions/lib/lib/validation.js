"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createValidationFields = createValidationFields;
exports.createValidationHttpError = createValidationHttpError;
const http_error_1 = require("./http-error");
function createFieldPath(issue) {
    if (issue.path.length === 0) {
        return "form";
    }
    return issue.path
        .map((segment) => String(segment))
        .join(".");
}
function createValidationFields(error) {
    const fields = {};
    for (const issue of error.issues) {
        const fieldPath = createFieldPath(issue);
        const messages = fields[fieldPath] ?? [];
        if (!messages.includes(issue.message)) {
            messages.push(issue.message);
        }
        fields[fieldPath] = messages;
    }
    return fields;
}
function createValidationHttpError(error) {
    return new http_error_1.HttpError({
        status: 400,
        code: "INVALID_INPUT",
        message: "ข้อมูลบางส่วนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
        fields: createValidationFields(error),
    });
}
//# sourceMappingURL=validation.js.map