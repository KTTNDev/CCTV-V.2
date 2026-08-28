import assert from "node:assert/strict";
import test from "node:test";

import {
  updateRequestSchema,
} from "../schemas/update-request";

const VALID_REQUEST_ID =
  "legacy-demo-request";

test(
  "ยอมรับการเปลี่ยนสถานะเป็น completed",
  () => {
    const result =
      updateRequestSchema.safeParse({
        requestId:
          VALID_REQUEST_ID,

        status: "completed",
        adminNote: "",
      });

    assert.equal(
      result.success,
      true,
    );
  },
);

test(
  "ตัดช่องว่างหน้าหลังหมายเหตุเจ้าหน้าที่",
  () => {
    const result =
      updateRequestSchema.safeParse({
        requestId:
          VALID_REQUEST_ID,

        status:
          "waiting_for_information",

        adminNote:
          "  กรุณาแนบเอกสารเพิ่มเติม  ",
      });

    assert.equal(
      result.success,
      true,
    );

    if (!result.success) {
      return;
    }

    assert.equal(
      result.data.adminNote,
      "กรุณาแนบเอกสารเพิ่มเติม",
    );
  },
);

test(
  "สถานะรอข้อมูลเพิ่มเติมต้องมีเหตุผล",
  () => {
    const result =
      updateRequestSchema.safeParse({
        requestId:
          VALID_REQUEST_ID,

        status:
          "waiting_for_information",

        adminNote: "",
      });

    assert.equal(
      result.success,
      false,
    );
  },
);

test(
  "สถานะ rejected ต้องมีเหตุผลอย่างน้อย 5 ตัวอักษร",
  () => {
    const result =
      updateRequestSchema.safeParse({
        requestId:
          VALID_REQUEST_ID,

        status: "rejected",
        adminNote: "สั้น",
      });

    assert.equal(
      result.success,
      false,
    );
  },
);

test(
  "ปฏิเสธสถานะที่ระบบไม่รองรับ",
  () => {
    const result =
      updateRequestSchema.safeParse({
        requestId:
          VALID_REQUEST_ID,

        status: "deleted",
        adminNote: "",
      });

    assert.equal(
      result.success,
      false,
    );
  },
);

test(
  "ปฏิเสธ requestId ที่มีอักขระอันตราย",
  () => {
    const result =
      updateRequestSchema.safeParse({
        requestId:
          "../cctv_requests/admin",

        status: "completed",
        adminNote: "",
      });

    assert.equal(
      result.success,
      false,
    );
  },
);

test(
  "ปฏิเสธ field ที่ไม่ได้รับอนุญาต",
  () => {
    const result =
      updateRequestSchema.safeParse({
        requestId:
          VALID_REQUEST_ID,

        status: "completed",
        adminNote: "",

        applicantName:
          "ไม่ควรแก้ผ่าน endpoint นี้",
      });

    assert.equal(
      result.success,
      false,
    );
  },
);