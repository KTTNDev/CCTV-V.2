import assert from "node:assert/strict";
import test from "node:test";

import {
  HttpError,
} from "../lib/http-error";

import {
  generateTrackingCredentials,
  hashTrackingSecret,
  parseTrackingToken,
  verifyTrackingSecret,
} from "../lib/tracking";

test(
  "สร้าง tracking ID ตามวันที่ประเทศไทย",
  () => {
    const credentials =
      generateTrackingCredentials(
        new Date(
          "2026-08-27T18:00:00.000Z",
        ),
      );

    assert.match(
      credentials.trackingId,
      /^RW-20260828-[A-HJ-NP-Z2-9]{6}$/,
    );

    assert.equal(
      credentials.trackingToken,
      `${credentials.trackingId}.${credentials.trackingSecret}`,
    );

    assert.equal(
      credentials.trackingSecretHash,
      hashTrackingSecret(
        credentials.trackingSecret,
      ),
    );
  },
);

test(
  "tracking secret มี entropy และรูปแบบที่เหมาะสม",
  () => {
    const first =
      generateTrackingCredentials();

    const second =
      generateTrackingCredentials();

    assert.notEqual(
      first.trackingSecret,
      second.trackingSecret,
    );

    assert.match(
      first.trackingSecret,
      /^[A-Za-z0-9_-]{40,60}$/,
    );

    assert.match(
      first.trackingSecretHash,
      /^[a-f0-9]{64}$/,
    );
  },
);

test(
  "แยก tracking token และ normalize tracking ID",
  () => {
    const credentials =
      generateTrackingCredentials();

    const lowerCaseToken =
      `${credentials.trackingId.toLowerCase()}.` +
      credentials.trackingSecret;

    const parsed =
      parseTrackingToken(
        `  ${lowerCaseToken}  `,
      );

    assert.equal(
      parsed.trackingId,
      credentials.trackingId,
    );

    assert.equal(
      parsed.trackingSecret,
      credentials.trackingSecret,
    );
  },
);

test(
  "ตรวจ tracking secret ที่ถูกต้อง",
  () => {
    const credentials =
      generateTrackingCredentials();

    assert.equal(
      verifyTrackingSecret(
        credentials.trackingSecret,
        credentials
          .trackingSecretHash,
      ),
      true,
    );
  },
);

test(
  "ปฏิเสธ tracking secret ที่ถูกแก้ไข",
  () => {
    const credentials =
      generateTrackingCredentials();

    assert.equal(
      verifyTrackingSecret(
        `${credentials.trackingSecret}x`,
        credentials
          .trackingSecretHash,
      ),
      false,
    );

    assert.equal(
      verifyTrackingSecret(
        credentials.trackingSecret,
        "invalid-hash",
      ),
      false,
    );
  },
);

test(
  "ปฏิเสธ tracking token ที่มีรูปแบบผิด",
  () => {
    const invalidTokens = [
      "",
      "short",
      "RW-20260828-ABCDEF",
      "RW-20260828-ABCDEF.secret.extra",
      "INVALID-20260828-ABCDEF." +
        "a".repeat(43),
    ];

    for (
      const token of invalidTokens
    ) {
      assert.throws(
        () =>
          parseTrackingToken(token),

        (error: unknown) =>
          error instanceof HttpError &&
          error.status === 400 &&
          error.code ===
            "INVALID_INPUT",
      );
    }
  },
);

test(
  "ปฏิเสธ tracking token ที่ไม่ใช่ string",
  () => {
    assert.throws(
      () =>
        parseTrackingToken(null),

      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 400 &&
        error.code ===
          "INVALID_INPUT",
    );
  },
);