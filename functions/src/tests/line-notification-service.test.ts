import assert from "node:assert/strict";
import test from "node:test";

import {
  createAdminRequestUrl,
  createLineNewRequestMessage,
} from "../services/line-notification-service";

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

test(
  "ลิงก์เจ้าหน้าที่ระบุคำร้องโดยไม่ใส่ข้อมูลส่วนบุคคลใน URL",
  () => {
    const url = new URL(
      createAdminRequestUrl(
        notification.requestId,
        "https://staff.example.go.th/portal?source=line",
      ),
    );

    assert.equal(
      url.searchParams.get("adminRequest"),
      notification.requestId,
    );
    assert.equal(
      url.searchParams.get("source"),
      "line",
    );
    assert.equal(url.pathname, "/portal");
  },
);

test(
  "Flex Message แสดงข้อมูลคัดกรองและปุ่มเปิดคำร้อง",
  () => {
    const message =
      createLineNewRequestMessage(
        notification,
        "https://db-rawaicctv.web.app/",
      );

    const serialized = JSON.stringify(message);

    assert.match(
      serialized,
      /มีคำร้อง CCTV ใหม่/,
    );
    assert.match(
      serialized,
      /รอตรวจสอบคำร้อง/,
    );
    assert.match(
      serialized,
      /RW-20260831-ABC123/,
    );
    assert.match(
      serialized,
      /adminRequest=request-doc-123/,
    );
    assert.doesNotMatch(
      serialized,
      /2026-08-31T09:50:00\.000Z/,
    );

    assert.doesNotMatch(
      serialized,
      /nationalId|passport|phone|email|attachments|storagePath/,
    );
  },
);

test(
  "Flex Message กำจัดอักขระควบคุมจากข้อความที่ส่งเข้า LINE",
  () => {
    const serialized = JSON.stringify(
      createLineNewRequestMessage({
        ...notification,
        location:
          "จุดเกิดเหตุ\n\u0000 ใกล้ชายหาด",
      }),
    );

    assert.doesNotMatch(
      serialized,
      /\\u0000/,
    );
    assert.match(
      serialized,
      /จุดเกิดเหตุ ใกล้ชายหาด/,
    );
  },
);
