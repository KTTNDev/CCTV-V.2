"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const update_request_1 = require("../schemas/update-request");
const VALID_REQUEST_ID = "legacy-demo-request";
(0, node_test_1.default)("ยอมรับการเปลี่ยนสถานะเป็น completed", () => {
    const result = update_request_1.updateRequestSchema.safeParse({
        requestId: VALID_REQUEST_ID,
        status: "completed",
        adminNote: "",
    });
    strict_1.default.equal(result.success, true);
});
(0, node_test_1.default)("ตัดช่องว่างหน้าหลังหมายเหตุเจ้าหน้าที่", () => {
    const result = update_request_1.updateRequestSchema.safeParse({
        requestId: VALID_REQUEST_ID,
        status: "waiting_for_information",
        adminNote: "  กรุณาแนบเอกสารเพิ่มเติม  ",
    });
    strict_1.default.equal(result.success, true);
    if (!result.success) {
        return;
    }
    strict_1.default.equal(result.data.adminNote, "กรุณาแนบเอกสารเพิ่มเติม");
});
(0, node_test_1.default)("สถานะรอข้อมูลเพิ่มเติมต้องมีเหตุผล", () => {
    const result = update_request_1.updateRequestSchema.safeParse({
        requestId: VALID_REQUEST_ID,
        status: "waiting_for_information",
        adminNote: "",
    });
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("สถานะ rejected ต้องมีเหตุผลอย่างน้อย 5 ตัวอักษร", () => {
    const result = update_request_1.updateRequestSchema.safeParse({
        requestId: VALID_REQUEST_ID,
        status: "rejected",
        adminNote: "สั้น",
    });
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("ปฏิเสธสถานะที่ระบบไม่รองรับ", () => {
    const result = update_request_1.updateRequestSchema.safeParse({
        requestId: VALID_REQUEST_ID,
        status: "deleted",
        adminNote: "",
    });
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("ปฏิเสธ requestId ที่มีอักขระอันตราย", () => {
    const result = update_request_1.updateRequestSchema.safeParse({
        requestId: "../cctv_requests/admin",
        status: "completed",
        adminNote: "",
    });
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("ปฏิเสธ field ที่ไม่ได้รับอนุญาต", () => {
    const result = update_request_1.updateRequestSchema.safeParse({
        requestId: VALID_REQUEST_ID,
        status: "completed",
        adminNote: "",
        applicantName: "ไม่ควรแก้ผ่าน endpoint นี้",
    });
    strict_1.default.equal(result.success, false);
});
//# sourceMappingURL=update-request-schema.test.js.map