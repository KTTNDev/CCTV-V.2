"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestSchema = exports.uploadFileMetadataSchema = exports.allowedContentTypeSchema = exports.requestStatusSchema = exports.deliveryMethodSchema = exports.foreignerInvolvementSchema = exports.accidentSubtypeSchema = exports.eventTypeSchema = exports.applicantTypeSchema = void 0;
exports.isValidThaiNationalId = isValidThaiNationalId;
const zod_1 = require("zod");
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const PASSPORT_PATTERN = /^[A-Z0-9-]{5,20}$/i;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_SCENE_FILES = 5;
const BANGKOK_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
function parseCalendarDateToEpoch(value) {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day) ||
        year < 1900 ||
        year > 2200) {
        return null;
    }
    const epoch = Date.UTC(year, month - 1, day);
    const parsedDate = new Date(epoch);
    if (parsedDate.getUTCFullYear() !==
        year ||
        parsedDate.getUTCMonth() !==
            month - 1 ||
        parsedDate.getUTCDate() !== day) {
        return null;
    }
    return epoch;
}
function getBangkokTodayEpoch(now = new Date()) {
    const bangkokNow = new Date(now.getTime() +
        BANGKOK_UTC_OFFSET_MS);
    return Date.UTC(bangkokNow.getUTCFullYear(), bangkokNow.getUTCMonth(), bangkokNow.getUTCDate());
}
exports.applicantTypeSchema = zod_1.z.enum([
    "THAI",
    "FOREIGNER",
]);
exports.eventTypeSchema = zod_1.z.enum([
    "ACCIDENT",
    "THEFT",
    "VANDALISM",
    "DISPUTE",
    "OTHER",
]);
exports.accidentSubtypeSchema = zod_1.z.enum([
    "MC_VS_MC",
    "MC_VS_CAR",
    "CAR_VS_CAR",
    "PEDESTRIAN",
    "HIT_AND_RUN",
    "OTHER",
]);
exports.foreignerInvolvementSchema = zod_1.z.enum([
    "YES",
    "NO",
    "NOT_SURE",
]);
exports.deliveryMethodSchema = zod_1.z.enum([
    "LINE",
    "WALKIN",
]);
exports.requestStatusSchema = zod_1.z.enum([
    "draft",
    "pending",
    "verifying",
    "searching",
    "waiting_for_information",
    "completed",
    "rejected",
]);
exports.allowedContentTypeSchema = zod_1.z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
]);
exports.uploadFileMetadataSchema = zod_1.z
    .object({
    name: zod_1.z
        .string()
        .trim()
        .min(1, "ไม่พบชื่อไฟล์")
        .max(150, "ชื่อไฟล์ยาวเกินไป"),
    contentType: exports.allowedContentTypeSchema,
    size: zod_1.z
        .number()
        .int()
        .positive()
        .max(MAX_FILE_SIZE_BYTES, "ไฟล์ต้องมีขนาดไม่เกิน 10 MB"),
})
    .strict();
const optionalEmailSchema = zod_1.z.union([
    zod_1.z.literal(""),
    zod_1.z
        .string()
        .trim()
        .max(254, "อีเมลยาวเกินไป")
        .email("รูปแบบอีเมลไม่ถูกต้อง"),
]);
const optionalNationalIdSchema = zod_1.z.union([
    zod_1.z.literal(""),
    zod_1.z
        .string()
        .trim()
        .regex(/^\d{13}$/, "เลขประจำตัวประชาชนต้องมี 13 หลัก"),
]);
const optionalPassportSchema = zod_1.z.union([
    zod_1.z.literal(""),
    zod_1.z
        .string()
        .trim()
        .regex(PASSPORT_PATTERN, "หมายเลขหนังสือเดินทางไม่ถูกต้อง"),
]);
exports.createRequestSchema = zod_1.z
    .object({
    name: zod_1.z
        .string()
        .trim()
        .min(2, "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร")
        .max(150, "ชื่อยาวเกินไป"),
    applicantType: exports.applicantTypeSchema,
    nationalId: optionalNationalIdSchema,
    passportNumber: optionalPassportSchema,
    phone: zod_1.z
        .string()
        .trim()
        .transform((value) => value.replace(/[\s-]/g, ""))
        .pipe(zod_1.z
        .string()
        .regex(/^(?:\+66|0)\d{8,9}$/, "รูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง")),
    email: optionalEmailSchema,
    eventDate: zod_1.z
        .string()
        .trim()
        .regex(DATE_PATTERN, "รูปแบบวันที่ไม่ถูกต้อง"),
    eventTimeStart: zod_1.z
        .string()
        .trim()
        .regex(TIME_PATTERN, "รูปแบบเวลาเริ่มต้นไม่ถูกต้อง"),
    eventTimeEnd: zod_1.z
        .string()
        .trim()
        .regex(TIME_PATTERN, "รูปแบบเวลาสิ้นสุดไม่ถูกต้อง"),
    eventType: exports.eventTypeSchema,
    accidentSubtype: exports.accidentSubtypeSchema.optional(),
    isForeignerInvolved: exports.foreignerInvolvementSchema.optional(),
    location: zod_1.z
        .string()
        .trim()
        .min(3, "กรุณาระบุสถานที่เกิดเหตุ")
        .max(300, "รายละเอียดสถานที่ยาวเกินไป"),
    latitude: zod_1.z
        .number()
        .finite()
        .min(-90)
        .max(90),
    longitude: zod_1.z
        .number()
        .finite()
        .min(-180)
        .max(180),
    description: zod_1.z
        .string()
        .trim()
        .min(10, "กรุณาอธิบายเหตุการณ์อย่างน้อย 10 ตัวอักษร")
        .max(2000, "รายละเอียดเหตุการณ์ยาวเกินไป"),
    deliveryMethod: exports.deliveryMethodSchema,
    privacyAccepted: zod_1.z.literal(true, {
        error: "กรุณายอมรับประกาศความเป็นส่วนตัว",
    }),
    expectedFiles: zod_1.z
        .object({
        idCard: exports.uploadFileMetadataSchema,
        policeReport: exports.uploadFileMetadataSchema,
        scene: zod_1.z
            .array(exports.uploadFileMetadataSchema)
            .max(MAX_SCENE_FILES, `แนบภาพเหตุการณ์ได้ไม่เกิน ${MAX_SCENE_FILES} ไฟล์`),
    })
        .strict(),
})
    .strict()
    .superRefine((data, context) => {
    if (data.applicantType === "THAI") {
        if (!data.nationalId) {
            context.addIssue({
                code: "custom",
                path: ["nationalId"],
                message: "กรุณากรอกเลขประจำตัวประชาชน",
            });
        }
        else if (!isValidThaiNationalId(data.nationalId)) {
            context.addIssue({
                code: "custom",
                path: ["nationalId"],
                message: "เลขประจำตัวประชาชนไม่ผ่านการตรวจสอบ",
            });
        }
    }
    if (data.applicantType === "FOREIGNER" &&
        !data.passportNumber) {
        context.addIssue({
            code: "custom",
            path: ["passportNumber"],
            message: "กรุณากรอกหมายเลขหนังสือเดินทาง",
        });
    }
    if (data.eventType === "ACCIDENT" &&
        !data.accidentSubtype) {
        context.addIssue({
            code: "custom",
            path: ["accidentSubtype"],
            message: "กรุณาระบุลักษณะอุบัติเหตุ",
        });
    }
    if (data.eventType === "ACCIDENT" &&
        !data.isForeignerInvolved) {
        context.addIssue({
            code: "custom",
            path: ["isForeignerInvolved"],
            message: "กรุณาระบุว่าเหตุการณ์เกี่ยวข้องกับชาวต่างชาติหรือไม่",
        });
    }
    if (data.eventTimeEnd <= data.eventTimeStart) {
        context.addIssue({
            code: "custom",
            path: ["eventTimeEnd"],
            message: "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น",
        });
    }
    const eventDateEpoch = parseCalendarDateToEpoch(data.eventDate);
    const bangkokTodayEpoch = getBangkokTodayEpoch();
    if (eventDateEpoch === null ||
        eventDateEpoch >
            bangkokTodayEpoch) {
        context.addIssue({
            code: "custom",
            path: ["eventDate"],
            message: "วันที่เกิดเหตุต้องเป็นวันที่จริงและไม่อยู่ในอนาคต",
        });
    }
});
function isValidThaiNationalId(value) {
    if (!/^\d{13}$/.test(value)) {
        return false;
    }
    const digits = value.split("").map(Number);
    const weightedSum = digits
        .slice(0, 12)
        .reduce((sum, digit, index) => sum + digit * (13 - index), 0);
    const expectedCheckDigit = (11 - (weightedSum % 11)) % 10;
    return expectedCheckDigit === digits[12];
}
//# sourceMappingURL=request.js.map