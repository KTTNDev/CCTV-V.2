"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const rate_limit_1 = require("../lib/rate-limit");
function createMockRequest(options = {}) {
    return {
        ip: options.ip,
        get(name) {
            if (name.toLowerCase() ===
                "x-forwarded-for") {
                return options.forwardedFor;
            }
            return undefined;
        },
    };
}
(0, node_test_1.default)("ใช้ IP โดยตรงเมื่อ request.ip มีค่า", () => {
    const identifier = (0, rate_limit_1.createClientIdentifier)(createMockRequest({
        ip: "203.0.113.10",
        forwardedFor: "198.51.100.20",
    }));
    strict_1.default.equal(identifier, "guest:203.0.113.10");
});
(0, node_test_1.default)("ใช้ X-Forwarded-For เมื่อ request.ip ไม่มีค่า", () => {
    const identifier = (0, rate_limit_1.createClientIdentifier)(createMockRequest({
        forwardedFor: "198.51.100.20, 10.0.0.1",
    }));
    strict_1.default.equal(identifier, "guest:198.51.100.20");
});
(0, node_test_1.default)("ข้าม request.ip ที่มีแต่ช่องว่าง", () => {
    const identifier = (0, rate_limit_1.createClientIdentifier)(createMockRequest({
        ip: "   ",
        forwardedFor: "198.51.100.30",
    }));
    strict_1.default.equal(identifier, "guest:198.51.100.30");
});
(0, node_test_1.default)("ผูก rate limit กับ UID ของผู้ใช้ที่เข้าสู่ระบบ", () => {
    const identifier = (0, rate_limit_1.createClientIdentifier)(createMockRequest({
        ip: "203.0.113.15",
    }), "  firebase-user-123  ");
    strict_1.default.equal(identifier, "firebase-user-123:203.0.113.15");
});
(0, node_test_1.default)("ใช้ค่า fallback เมื่อไม่มีข้อมูลเครือข่าย", () => {
    const identifier = (0, rate_limit_1.createClientIdentifier)(createMockRequest());
    strict_1.default.equal(identifier, "guest:unknown-address");
});
//# sourceMappingURL=rate-limit.test.js.map