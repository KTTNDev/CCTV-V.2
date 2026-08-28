"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const auth_1 = require("../lib/auth");
(0, node_test_1.default)("normalize อีเมลเป็นตัวพิมพ์เล็กและตัดช่องว่าง", () => {
    strict_1.default.equal((0, auth_1.normalizeEmail)("  Rawai.CCTV@Gmail.Com  "), "rawai.cctv@gmail.com");
});
(0, node_test_1.default)("normalize ค่าอีเมลว่างเป็น null", () => {
    strict_1.default.equal((0, auth_1.normalizeEmail)("   "), null);
    strict_1.default.equal((0, auth_1.normalizeEmail)(null), null);
});
(0, node_test_1.default)("ยอมรับอีเมล Admin โดยไม่สนตัวพิมพ์ใหญ่เล็ก", () => {
    strict_1.default.equal((0, auth_1.isAllowlistedAdminEmail)(" RAWAI.CCTV@GMAIL.COM "), true);
});
(0, node_test_1.default)("ปฏิเสธอีเมลที่ไม่อยู่ใน allowlist", () => {
    strict_1.default.equal((0, auth_1.isAllowlistedAdminEmail)("unknown@example.com"), false);
    strict_1.default.equal((0, auth_1.isAllowlistedAdminEmail)(null), false);
});
(0, node_test_1.default)("allowlist ต้องไม่มีอีเมลซ้ำ", () => {
    const uniqueEmails = new Set(auth_1.ADMIN_EMAIL_ALLOWLIST);
    strict_1.default.equal(uniqueEmails.size, auth_1.ADMIN_EMAIL_ALLOWLIST.length);
});
(0, node_test_1.default)("กำหนดบทบาทเจ้าหน้าที่ครบตามนโยบาย", () => {
    strict_1.default.deepEqual([...auth_1.STAFF_ROLES], [
        "admin",
        "officer",
        "auditor",
    ]);
});
//# sourceMappingURL=auth-policy.test.js.map