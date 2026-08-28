"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const http_error_1 = require("../lib/http-error");
const tracking_1 = require("../lib/tracking");
(0, node_test_1.default)("สร้าง tracking ID ตามวันที่ประเทศไทย", () => {
    const credentials = (0, tracking_1.generateTrackingCredentials)(new Date("2026-08-27T18:00:00.000Z"));
    strict_1.default.match(credentials.trackingId, /^RW-20260828-[A-HJ-NP-Z2-9]{6}$/);
    strict_1.default.equal(credentials.trackingToken, `${credentials.trackingId}.${credentials.trackingSecret}`);
    strict_1.default.equal(credentials.trackingSecretHash, (0, tracking_1.hashTrackingSecret)(credentials.trackingSecret));
});
(0, node_test_1.default)("tracking secret มี entropy และรูปแบบที่เหมาะสม", () => {
    const first = (0, tracking_1.generateTrackingCredentials)();
    const second = (0, tracking_1.generateTrackingCredentials)();
    strict_1.default.notEqual(first.trackingSecret, second.trackingSecret);
    strict_1.default.match(first.trackingSecret, /^[A-Za-z0-9_-]{40,60}$/);
    strict_1.default.match(first.trackingSecretHash, /^[a-f0-9]{64}$/);
});
(0, node_test_1.default)("แยก tracking token และ normalize tracking ID", () => {
    const credentials = (0, tracking_1.generateTrackingCredentials)();
    const lowerCaseToken = `${credentials.trackingId.toLowerCase()}.` +
        credentials.trackingSecret;
    const parsed = (0, tracking_1.parseTrackingToken)(`  ${lowerCaseToken}  `);
    strict_1.default.equal(parsed.trackingId, credentials.trackingId);
    strict_1.default.equal(parsed.trackingSecret, credentials.trackingSecret);
});
(0, node_test_1.default)("ตรวจ tracking secret ที่ถูกต้อง", () => {
    const credentials = (0, tracking_1.generateTrackingCredentials)();
    strict_1.default.equal((0, tracking_1.verifyTrackingSecret)(credentials.trackingSecret, credentials
        .trackingSecretHash), true);
});
(0, node_test_1.default)("ปฏิเสธ tracking secret ที่ถูกแก้ไข", () => {
    const credentials = (0, tracking_1.generateTrackingCredentials)();
    strict_1.default.equal((0, tracking_1.verifyTrackingSecret)(`${credentials.trackingSecret}x`, credentials
        .trackingSecretHash), false);
    strict_1.default.equal((0, tracking_1.verifyTrackingSecret)(credentials.trackingSecret, "invalid-hash"), false);
});
(0, node_test_1.default)("ปฏิเสธ tracking token ที่มีรูปแบบผิด", () => {
    const invalidTokens = [
        "",
        "short",
        "RW-20260828-ABCDEF",
        "RW-20260828-ABCDEF.secret.extra",
        "INVALID-20260828-ABCDEF." +
            "a".repeat(43),
    ];
    for (const token of invalidTokens) {
        strict_1.default.throws(() => (0, tracking_1.parseTrackingToken)(token), (error) => error instanceof http_error_1.HttpError &&
            error.status === 400 &&
            error.code ===
                "INVALID_INPUT");
    }
});
(0, node_test_1.default)("ปฏิเสธ tracking token ที่ไม่ใช่ string", () => {
    strict_1.default.throws(() => (0, tracking_1.parseTrackingToken)(null), (error) => error instanceof http_error_1.HttpError &&
        error.status === 400 &&
        error.code ===
            "INVALID_INPUT");
});
//# sourceMappingURL=tracking-security.test.js.map