import assert from "node:assert/strict";
import test from "node:test";

import {
  isLegacyTrackRequestInput,
  trackRequestSchema,
} from "../schemas/track-request";

test(
  "ยอมรับรหัสติดตามแบบปลอดภัย",
  () => {
    const trackingToken =
      "RW-20260828-ABCDEF." +
      "a".repeat(48);

    const result =
      trackRequestSchema.safeParse({
        trackingToken,
      });

    assert.equal(
      result.success,
      true,
    );

    if (!result.success) {
      return;
    }

    assert.equal(
      "trackingToken" in result.data,
      true,
    );
  },
);

test(
  "ปรับหมายเลขคำร้องเดิมเป็นตัวพิมพ์ใหญ่",
  () => {
    const result =
      trackRequestSchema.safeParse({
        trackingId:
          " req-legacy-demo-001 ",
        phoneLast4: "4567",
        eventDate: "2025-01-15",
      });

    assert.equal(
      result.success,
      true,
    );

    if (
      !result.success ||
      !isLegacyTrackRequestInput(
        result.data,
      )
    ) {
      assert.fail(
        "ควรเป็นข้อมูลติดตามคำร้องเดิม",
      );
    }

    assert.equal(
      result.data.trackingId,
      "REQ-LEGACY-DEMO-001",
    );

    assert.equal(
      result.data.phoneLast4,
      "4567",
    );
  },
);

test(
  "ปฏิเสธเบอร์โทรศัพท์ที่ไม่ครบ 4 หลัก",
  () => {
    const result =
      trackRequestSchema.safeParse({
        trackingId:
          "REQ-LEGACY-DEMO-001",
        phoneLast4: "567",
        eventDate: "2025-01-15",
      });

    assert.equal(
      result.success,
      false,
    );
  },
);

test(
  "ปฏิเสธรูปแบบวันที่ที่ไม่ใช่ YYYY-MM-DD",
  () => {
    const result =
      trackRequestSchema.safeParse({
        trackingId:
          "REQ-LEGACY-DEMO-001",
        phoneLast4: "4567",
        eventDate: "15/01/2025",
      });

    assert.equal(
      result.success,
      false,
    );
  },
);
test(
  "ปฏิเสธวันที่คำร้องเดิมที่ไม่มีอยู่จริง",
  () => {
    const result =
      trackRequestSchema.safeParse({
        trackingId:
          "REQ-LEGACY-DEMO-001",
        phoneLast4: "4567",
        eventDate: "2025-02-31",
      });

    assert.equal(
      result.success,
      false,
    );
  },
);

test(
  "ยอมรับวันที่คำร้องเดิมในปีอธิกสุรทิน",
  () => {
    const result =
      trackRequestSchema.safeParse({
        trackingId:
          "REQ-LEGACY-DEMO-001",
        phoneLast4: "4567",
        eventDate: "2024-02-29",
      });

    assert.equal(
      result.success,
      true,
    );
  },
);
test(
  "ปฏิเสธ field ที่ระบบไม่ได้อนุญาต",
  () => {
    const result =
      trackRequestSchema.safeParse({
        trackingId:
          "REQ-LEGACY-DEMO-001",
        phoneLast4: "4567",
        eventDate: "2025-01-15",
        nationalId:
          "ข้อมูลที่ไม่ควรถูกส่ง",
      });

    assert.equal(
      result.success,
      false,
    );
  },
);