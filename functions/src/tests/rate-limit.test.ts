import assert from "node:assert/strict";
import test from "node:test";

import {
  createClientIdentifier,
} from "../lib/rate-limit";

interface MockRequestOptions {
  ip?: string;
  forwardedFor?: string;
}

function createMockRequest(
  options: MockRequestOptions = {},
) {
  return {
    ip: options.ip,

    get(name: string):
      string | undefined {
      if (
        name.toLowerCase() ===
        "x-forwarded-for"
      ) {
        return options.forwardedFor;
      }

      return undefined;
    },
  };
}

test(
  "ใช้ IP โดยตรงเมื่อ request.ip มีค่า",
  () => {
    const identifier =
      createClientIdentifier(
        createMockRequest({
          ip: "203.0.113.10",
          forwardedFor:
            "198.51.100.20",
        }),
      );

    assert.equal(
      identifier,
      "guest:203.0.113.10",
    );
  },
);

test(
  "ใช้ X-Forwarded-For เมื่อ request.ip ไม่มีค่า",
  () => {
    const identifier =
      createClientIdentifier(
        createMockRequest({
          forwardedFor:
            "198.51.100.20, 10.0.0.1",
        }),
      );

    assert.equal(
      identifier,
      "guest:198.51.100.20",
    );
  },
);

test(
  "ข้าม request.ip ที่มีแต่ช่องว่าง",
  () => {
    const identifier =
      createClientIdentifier(
        createMockRequest({
          ip: "   ",
          forwardedFor:
            "198.51.100.30",
        }),
      );

    assert.equal(
      identifier,
      "guest:198.51.100.30",
    );
  },
);

test(
  "ผูก rate limit กับ UID ของผู้ใช้ที่เข้าสู่ระบบ",
  () => {
    const identifier =
      createClientIdentifier(
        createMockRequest({
          ip: "203.0.113.15",
        }),
        "  firebase-user-123  ",
      );

    assert.equal(
      identifier,
      "firebase-user-123:203.0.113.15",
    );
  },
);

test(
  "ใช้ค่า fallback เมื่อไม่มีข้อมูลเครือข่าย",
  () => {
    const identifier =
      createClientIdentifier(
        createMockRequest(),
      );

    assert.equal(
      identifier,
      "guest:unknown-address",
    );
  },
);