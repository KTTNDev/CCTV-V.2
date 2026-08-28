"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeRequestSchema = void 0;
const zod_1 = require("zod");
const FIRESTORE_DOCUMENT_ID_PATTERN = /^[A-Za-z0-9]{20}$/;
exports.finalizeRequestSchema = zod_1.z
    .object({
    requestId: zod_1.z
        .string()
        .trim()
        .regex(FIRESTORE_DOCUMENT_ID_PATTERN, "รหัสคำร้องไม่ถูกต้อง"),
})
    .strict();
//# sourceMappingURL=finalize-request.js.map