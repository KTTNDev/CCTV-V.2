"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackRequestSchema = exports.legacyTrackRequestSchema = exports.secureTrackRequestSchema = void 0;
exports.isLegacyTrackRequestInput = isLegacyTrackRequestInput;
const zod_1 = require("zod");
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
function isValidCalendarDate(value) {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        return false;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1900 ||
        year > 2200) {
        return false;
    }
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    return (parsedDate.getUTCFullYear() ===
        year &&
        parsedDate.getUTCMonth() ===
            month - 1 &&
        parsedDate.getUTCDate() === day);
}
exports.secureTrackRequestSchema = zod_1.z
    .object({
    trackingToken: zod_1.z
        .string()
        .trim()
        .min(40, "รหัสติดตามคำร้องสั้นเกินไป")
        .max(120, "รหัสติดตามคำร้องยาวเกินไป"),
})
    .strict();
exports.legacyTrackRequestSchema = zod_1.z
    .object({
    trackingId: zod_1.z
        .string()
        .trim()
        .toUpperCase()
        .min(4, "หมายเลขติดตามสั้นเกินไป")
        .max(128, "หมายเลขติดตามยาวเกินไป")
        .regex(/^[A-Z0-9_-]+$/, "รูปแบบหมายเลขติดตามไม่ถูกต้อง"),
    phoneLast4: zod_1.z
        .string()
        .trim()
        .regex(/^\d{4}$/, "กรุณากรอกเบอร์โทร 4 หลักท้าย"),
    eventDate: zod_1.z
        .string()
        .trim()
        .regex(DATE_PATTERN, "รูปแบบวันที่เกิดเหตุไม่ถูกต้อง")
        .refine(isValidCalendarDate, "วันที่เกิดเหตุไม่มีอยู่จริง"),
})
    .strict();
exports.trackRequestSchema = zod_1.z.union([
    exports.secureTrackRequestSchema,
    exports.legacyTrackRequestSchema,
]);
function isLegacyTrackRequestInput(input) {
    return ("trackingId" in input &&
        "phoneLast4" in input &&
        "eventDate" in input);
}
//# sourceMappingURL=track-request.js.map