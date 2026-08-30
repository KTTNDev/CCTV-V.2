"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const runtime_1 = require("../config/runtime");
function isOriginAllowed(origin) {
    return runtime_1.ALLOWED_CORS_ORIGINS.some((allowedOrigin) => typeof allowedOrigin === "string"
        ? allowedOrigin === origin
        : allowedOrigin.test(origin));
}
(0, node_test_1.default)("Functions ทั้งระบบใช้ region ใกล้ประเทศไทย", () => {
    strict_1.default.equal(runtime_1.FUNCTION_REGION, "asia-southeast1");
});
(0, node_test_1.default)("CORS ยอมรับ localhost และ Firebase Hosting domains", () => {
    strict_1.default.equal(isOriginAllowed("http://localhost:3000"), true);
    strict_1.default.equal(isOriginAllowed("http://127.0.0.1:5000"), true);
    strict_1.default.equal(isOriginAllowed("https://db-rawaicctv.web.app"), true);
    strict_1.default.equal(isOriginAllowed("https://db-rawaicctv.firebaseapp.com"), true);
});
(0, node_test_1.default)("CORS ปฏิเสธโดเมนภายนอกและโดเมนเลียนแบบ", () => {
    strict_1.default.equal(isOriginAllowed("https://example.com"), false);
    strict_1.default.equal(isOriginAllowed("https://db-rawaicctv.web.app.evil.example"), false);
});
//# sourceMappingURL=runtime-config.test.js.map