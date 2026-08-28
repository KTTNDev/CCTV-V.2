import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_EMAIL_ALLOWLIST,
  isAllowlistedAdminEmail,
  normalizeEmail,
  STAFF_ROLES,
} from "../lib/auth";

test(
  "normalize อีเมลเป็นตัวพิมพ์เล็กและตัดช่องว่าง",
  () => {
    assert.equal(
      normalizeEmail(
        "  Rawai.CCTV@Gmail.Com  ",
      ),
      "rawai.cctv@gmail.com",
    );
  },
);

test(
  "normalize ค่าอีเมลว่างเป็น null",
  () => {
    assert.equal(
      normalizeEmail("   "),
      null,
    );

    assert.equal(
      normalizeEmail(null),
      null,
    );
  },
);

test(
  "ยอมรับอีเมล Admin โดยไม่สนตัวพิมพ์ใหญ่เล็ก",
  () => {
    assert.equal(
      isAllowlistedAdminEmail(
        " RAWAI.CCTV@GMAIL.COM ",
      ),
      true,
    );
  },
);

test(
  "ปฏิเสธอีเมลที่ไม่อยู่ใน allowlist",
  () => {
    assert.equal(
      isAllowlistedAdminEmail(
        "unknown@example.com",
      ),
      false,
    );

    assert.equal(
      isAllowlistedAdminEmail(null),
      false,
    );
  },
);

test(
  "allowlist ต้องไม่มีอีเมลซ้ำ",
  () => {
    const uniqueEmails =
      new Set(
        ADMIN_EMAIL_ALLOWLIST,
      );

    assert.equal(
      uniqueEmails.size,
      ADMIN_EMAIL_ALLOWLIST.length,
    );
  },
);

test(
  "กำหนดบทบาทเจ้าหน้าที่ครบตามนโยบาย",
  () => {
    assert.deepEqual(
      [...STAFF_ROLES],
      [
        "admin",
        "officer",
        "auditor",
      ],
    );
  },
);