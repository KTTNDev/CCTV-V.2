"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const request_1 = require("../schemas/request");
const VALID_NATIONAL_ID = "1101700203450";
const VALID_FILE = {
    name: "document.jpg",
    contentType: "image/jpeg",
    size: 1024,
};
function createValidRequest() {
    return {
        name: "ผู้ทดสอบระบบ",
        applicantType: "THAI",
        nationalId: VALID_NATIONAL_ID,
        passportNumber: "",
        phone: "081-234-5678",
        email: "",
        eventDate: "2025-01-15",
        eventTimeStart: "10:00",
        eventTimeEnd: "10:30",
        eventType: "OTHER",
        location: "ตำบลราไวย์ จังหวัดภูเก็ต",
        latitude: 7.779,
        longitude: 98.325,
        description: "ข้อมูลจำลองสำหรับทดสอบระบบเท่านั้น",
        deliveryMethod: "WALKIN",
        privacyAccepted: true,
        expectedFiles: {
            idCard: {
                ...VALID_FILE,
                name: "id-card.jpg",
            },
            policeReport: {
                ...VALID_FILE,
                name: "police-report.jpg",
            },
            scene: [],
        },
    };
}
(0, node_test_1.default)("ยอมรับข้อมูลคำร้องที่ถูกต้อง", () => {
    const result = request_1.createRequestSchema.safeParse(createValidRequest());
    strict_1.default.equal(result.success, true);
    if (!result.success) {
        return;
    }
    strict_1.default.equal(result.data.phone, "0812345678");
});
(0, node_test_1.default)("ตรวจสอบเลขประจำตัวประชาชนไทย", () => {
    strict_1.default.equal((0, request_1.isValidThaiNationalId)(VALID_NATIONAL_ID), true);
    strict_1.default.equal((0, request_1.isValidThaiNationalId)("1101700203451"), false);
});
(0, node_test_1.default)("ปฏิเสธเลขประจำตัวประชาชนที่ไม่ผ่าน checksum", () => {
    const request = createValidRequest();
    request.nationalId =
        "1101700203451";
    const result = request_1.createRequestSchema.safeParse(request);
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("ผู้ยื่นต่างชาติต้องระบุหมายเลขหนังสือเดินทาง", () => {
    const request = createValidRequest();
    request.applicantType =
        "FOREIGNER";
    request.nationalId = "";
    request.passportNumber = "";
    const result = request_1.createRequestSchema.safeParse(request);
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น", () => {
    const request = createValidRequest();
    request.eventTimeStart =
        "11:00";
    request.eventTimeEnd =
        "10:00";
    const result = request_1.createRequestSchema.safeParse(request);
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("ปฏิเสธวันที่เกิดเหตุในอนาคต", () => {
    const request = createValidRequest();
    request.eventDate =
        "2999-01-01";
    const result = request_1.createRequestSchema.safeParse(request);
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("ปฏิเสธวันที่ที่ไม่มีอยู่จริงในปฏิทิน", () => {
    const request = createValidRequest();
    request.eventDate =
        "2025-02-31";
    const result = request_1.createRequestSchema.safeParse(request);
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("ยอมรับวันที่ 29 กุมภาพันธ์ในปีอธิกสุรทิน", () => {
    const request = createValidRequest();
    request.eventDate =
        "2024-02-29";
    const result = request_1.createRequestSchema.safeParse(request);
    strict_1.default.equal(result.success, true);
});
(0, node_test_1.default)("แนบภาพเหตุการณ์ได้ไม่เกิน 5 ไฟล์", () => {
    const request = createValidRequest();
    const expectedFiles = request.expectedFiles;
    expectedFiles.scene =
        Array.from({
            length: 6,
        }, (_, index) => ({
            ...VALID_FILE,
            name: `scene-${index + 1}.jpg`,
        }));
    const result = request_1.createRequestSchema.safeParse(request);
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("ปฏิเสธชนิดไฟล์ที่ไม่อนุญาต", () => {
    const request = createValidRequest();
    const expectedFiles = request.expectedFiles;
    expectedFiles.idCard = {
        name: "dangerous.exe",
        contentType: "application/x-msdownload",
        size: 1024,
    };
    const result = request_1.createRequestSchema.safeParse(request);
    strict_1.default.equal(result.success, false);
});
//# sourceMappingURL=request-schema.test.js.map