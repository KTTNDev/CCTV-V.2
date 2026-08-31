"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const line_notification_service_1 = require("../services/line-notification-service");
const notification = {
    requestId: "request-doc-123",
    trackingId: "RW-20260831-ABC123",
    eventType: "ACCIDENT",
    eventDate: "2569-08-31",
    eventTimeStart: "09:15",
    eventTimeEnd: "09:45",
    location: "ถนนวิเศษ ตำบลราไวย์",
    submittedAt: "2026-08-31T09:50:00.000Z",
    retryKey: "f7f31fc7-c9b5-4fd9-822f-b0aa6161c57c",
};
(0, node_test_1.default)("ลิงก์เจ้าหน้าที่ระบุคำร้องโดยไม่ใส่ข้อมูลส่วนบุคคลใน URL", () => {
    const url = new URL((0, line_notification_service_1.createAdminRequestUrl)(notification.requestId, "https://staff.example.go.th/portal?source=line"));
    strict_1.default.equal(url.searchParams.get("adminRequest"), notification.requestId);
    strict_1.default.equal(url.searchParams.get("source"), "line");
    strict_1.default.equal(url.pathname, "/portal");
});
(0, node_test_1.default)("Flex Message แสดงข้อมูลคัดกรองและปุ่มเปิดคำร้อง", () => {
    const message = (0, line_notification_service_1.createLineNewRequestMessage)(notification, "https://db-rawaicctv.web.app/");
    const serialized = JSON.stringify(message);
    strict_1.default.match(serialized, /มีคำร้อง CCTV ใหม่/);
    strict_1.default.match(serialized, /รอตรวจสอบคำร้อง/);
    strict_1.default.match(serialized, /RW-20260831-ABC123/);
    strict_1.default.match(serialized, /adminRequest=request-doc-123/);
    strict_1.default.doesNotMatch(serialized, /2026-08-31T09:50:00\.000Z/);
    strict_1.default.doesNotMatch(serialized, /nationalId|passport|phone|email|attachments|storagePath/);
});
(0, node_test_1.default)("Flex Message กำจัดอักขระควบคุมจากข้อความที่ส่งเข้า LINE", () => {
    const serialized = JSON.stringify((0, line_notification_service_1.createLineNewRequestMessage)({
        ...notification,
        location: "จุดเกิดเหตุ\n\u0000 ใกล้ชายหาด",
    }));
    strict_1.default.doesNotMatch(serialized, /\\u0000/);
    strict_1.default.match(serialized, /จุดเกิดเหตุ ใกล้ชายหาด/);
});
//# sourceMappingURL=line-notification-service.test.js.map