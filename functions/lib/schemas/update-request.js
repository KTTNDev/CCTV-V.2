"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRequestSchema = exports.adminRequestStatusSchema = void 0;
const zod_1 = require("zod");
exports.adminRequestStatusSchema = zod_1.z.enum([
    "pending",
    "verifying",
    "searching",
    "waiting_for_information",
    "completed",
    "rejected",
]);
exports.updateRequestSchema = zod_1.z
    .object({
    requestId: zod_1.z
        .string()
        .trim()
        .min(1, "ไม่พบรหัสคำร้อง")
        .max(128, "รหัสคำร้องยาวเกินไป")
        .regex(/^[A-Za-z0-9_-]+$/, "รหัสคำร้องมีรูปแบบไม่ถูกต้อง"),
    status: exports.adminRequestStatusSchema,
    adminNote: zod_1.z
        .string()
        .trim()
        .max(2000, "หมายเหตุต้องไม่เกิน 2,000 ตัวอักษร"),
})
    .strict()
    .superRefine((data, context) => {
    if ((data.status ===
        "waiting_for_information" ||
        data.status ===
            "rejected") &&
        data.adminNote.length < 5) {
        context.addIssue({
            code: "custom",
            path: ["adminNote"],
            message: "สถานะนี้ต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร",
        });
    }
});
//# sourceMappingURL=update-request.js.map