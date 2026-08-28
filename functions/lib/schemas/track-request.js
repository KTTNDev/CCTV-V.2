"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackRequestSchema = void 0;
const zod_1 = require("zod");
exports.trackRequestSchema = zod_1.z
    .object({
    trackingToken: zod_1.z
        .string()
        .trim()
        .min(40, "รหัสติดตามคำร้องสั้นเกินไป")
        .max(120, "รหัสติดตามคำร้องยาวเกินไป"),
})
    .strict();
//# sourceMappingURL=track-request.js.map