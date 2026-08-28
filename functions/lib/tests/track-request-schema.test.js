"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const track_request_1 = require("../schemas/track-request");
(0, node_test_1.default)("ยอมรับรหัสติดตามแบบปลอดภัย", () => {
    const trackingToken = "RW-20260828-ABCDEF." +
        "a".repeat(48);
    const result = track_request_1.trackRequestSchema.safeParse({
        trackingToken,
    });
    strict_1.default.equal(result.success, true);
    if (!result.success) {
        return;
    }
    strict_1.default.equal("trackingToken" in result.data, true);
});
(0, node_test_1.default)("ปรับหมายเลขคำร้องเดิมเป็นตัวพิมพ์ใหญ่", () => {
    const result = track_request_1.trackRequestSchema.safeParse({
        trackingId: " req-legacy-demo-001 ",
        phoneLast4: "4567",
        eventDate: "2025-01-15",
    });
    strict_1.default.equal(result.success, true);
    if (!result.success ||
        !(0, track_request_1.isLegacyTrackRequestInput)(result.data)) {
        strict_1.default.fail("ควรเป็นข้อมูลติดตามคำร้องเดิม");
    }
    strict_1.default.equal(result.data.trackingId, "REQ-LEGACY-DEMO-001");
    strict_1.default.equal(result.data.phoneLast4, "4567");
});
(0, node_test_1.default)("ปฏิเสธเบอร์โทรศัพท์ที่ไม่ครบ 4 หลัก", () => {
    const result = track_request_1.trackRequestSchema.safeParse({
        trackingId: "REQ-LEGACY-DEMO-001",
        phoneLast4: "567",
        eventDate: "2025-01-15",
    });
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("ปฏิเสธรูปแบบวันที่ที่ไม่ใช่ YYYY-MM-DD", () => {
    const result = track_request_1.trackRequestSchema.safeParse({
        trackingId: "REQ-LEGACY-DEMO-001",
        phoneLast4: "4567",
        eventDate: "15/01/2025",
    });
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("ปฏิเสธวันที่คำร้องเดิมที่ไม่มีอยู่จริง", () => {
    const result = track_request_1.trackRequestSchema.safeParse({
        trackingId: "REQ-LEGACY-DEMO-001",
        phoneLast4: "4567",
        eventDate: "2025-02-31",
    });
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("ยอมรับวันที่คำร้องเดิมในปีอธิกสุรทิน", () => {
    const result = track_request_1.trackRequestSchema.safeParse({
        trackingId: "REQ-LEGACY-DEMO-001",
        phoneLast4: "4567",
        eventDate: "2024-02-29",
    });
    strict_1.default.equal(result.success, true);
});
(0, node_test_1.default)("ปฏิเสธ field ที่ระบบไม่ได้อนุญาต", () => {
    const result = track_request_1.trackRequestSchema.safeParse({
        trackingId: "REQ-LEGACY-DEMO-001",
        phoneLast4: "4567",
        eventDate: "2025-01-15",
        nationalId: "ข้อมูลที่ไม่ควรถูกส่ง",
    });
    strict_1.default.equal(result.success, false);
});
//# sourceMappingURL=track-request-schema.test.js.map