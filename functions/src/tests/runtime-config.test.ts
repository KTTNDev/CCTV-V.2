import assert from "node:assert/strict";
import test from "node:test";

import {
  ALLOWED_CORS_ORIGINS,
  FUNCTION_REGION,
} from "../config/runtime";

function isOriginAllowed(
  origin: string,
): boolean {
  return ALLOWED_CORS_ORIGINS.some(
    (allowedOrigin) =>
      typeof allowedOrigin === "string"
        ? allowedOrigin === origin
        : allowedOrigin.test(origin),
  );
}

test(
  "Functions ทั้งระบบใช้ region ใกล้ประเทศไทย",
  () => {
    assert.equal(
      FUNCTION_REGION,
      "asia-southeast1",
    );
  },
);

test(
  "CORS ยอมรับ localhost และ Firebase Hosting domains",
  () => {
    assert.equal(
      isOriginAllowed(
        "http://localhost:3000",
      ),
      true,
    );
    assert.equal(
      isOriginAllowed(
        "http://127.0.0.1:5000",
      ),
      true,
    );
    assert.equal(
      isOriginAllowed(
        "https://db-rawaicctv.web.app",
      ),
      true,
    );
    assert.equal(
      isOriginAllowed(
        "https://db-rawaicctv.firebaseapp.com",
      ),
      true,
    );
  },
);

test(
  "CORS ปฏิเสธโดเมนภายนอกและโดเมนเลียนแบบ",
  () => {
    assert.equal(
      isOriginAllowed(
        "https://example.com",
      ),
      false,
    );
    assert.equal(
      isOriginAllowed(
        "https://db-rawaicctv.web.app.evil.example",
      ),
      false,
    );
  },
);
