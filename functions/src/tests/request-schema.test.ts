import assert from "node:assert/strict";
import test from "node:test";

import {
  createRequestSchema,
  isValidThaiNationalId,
} from "../schemas/request";

const VALID_NATIONAL_ID =
  "1101700203450";

const VALID_FILE = {
  name: "document.jpg",
  contentType: "image/jpeg",
  size: 1024,
};

function createValidRequest(): Record<
  string,
  unknown
> {
  return {
    name: "ผู้ทดสอบระบบ",
    applicantType: "THAI",

    nationalId:
      VALID_NATIONAL_ID,

    passportNumber: "",

    phone: "081-234-5678",
    email: "",

    eventDate: "2025-01-15",
    eventTimeStart: "10:00",
    eventTimeEnd: "10:30",

    eventType: "OTHER",

    location:
      "ตำบลราไวย์ จังหวัดภูเก็ต",

    latitude: 7.779,
    longitude: 98.325,

    description:
      "ข้อมูลจำลองสำหรับทดสอบระบบเท่านั้น",

    deliveryMethod: "WALKIN",
    privacyAccepted: true,

    expectedFiles: {
      idCard: {
        ...VALID_FILE,
        name: "id-card.jpg",
      },

      policeReport: {
        ...VALID_FILE,
        name: "police-report.jpg",
      },

      scene: [],
    },
  };
}

test(
  "ยอมรับข้อมูลคำร้องที่ถูกต้อง",
  () => {
    const result =
      createRequestSchema.safeParse(
        createValidRequest(),
      );

    assert.equal(
      result.success,
      true,
    );

    if (!result.success) {
      return;
    }

    assert.equal(
      result.data.phone,
      "0812345678",
    );
  },
);

test(
  "ตรวจสอบเลขประจำตัวประชาชนไทย",
  () => {
    assert.equal(
      isValidThaiNationalId(
        VALID_NATIONAL_ID,
      ),
      true,
    );

    assert.equal(
      isValidThaiNationalId(
        "1101700203451",
      ),
      false,
    );
  },
);

test(
  "ปฏิเสธเลขประจำตัวประชาชนที่ไม่ผ่าน checksum",
  () => {
    const request =
      createValidRequest();

    request.nationalId =
      "1101700203451";

    const result =
      createRequestSchema.safeParse(
        request,
      );

    assert.equal(
      result.success,
      false,
    );
  },
);

test(
  "ผู้ยื่นต่างชาติต้องระบุหมายเลขหนังสือเดินทาง",
  () => {
    const request =
      createValidRequest();

    request.applicantType =
      "FOREIGNER";

    request.nationalId = "";
    request.passportNumber = "";

    const result =
      createRequestSchema.safeParse(
        request,
      );

    assert.equal(
      result.success,
      false,
    );
  },
);

test(
  "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น",
  () => {
    const request =
      createValidRequest();

    request.eventTimeStart =
      "11:00";

    request.eventTimeEnd =
      "10:00";

    const result =
      createRequestSchema.safeParse(
        request,
      );

    assert.equal(
      result.success,
      false,
    );
  },
);

test(
  "ปฏิเสธวันที่เกิดเหตุในอนาคต",
  () => {
    const request =
      createValidRequest();

    request.eventDate =
      "2999-01-01";

    const result =
      createRequestSchema.safeParse(
        request,
      );

    assert.equal(
      result.success,
      false,
    );
  },
);
test(
  "ปฏิเสธวันที่ที่ไม่มีอยู่จริงในปฏิทิน",
  () => {
    const request =
      createValidRequest();

    request.eventDate =
      "2025-02-31";

    const result =
      createRequestSchema.safeParse(
        request,
      );

    assert.equal(
      result.success,
      false,
    );
  },
);

test(
  "ยอมรับวันที่ 29 กุมภาพันธ์ในปีอธิกสุรทิน",
  () => {
    const request =
      createValidRequest();

    request.eventDate =
      "2024-02-29";

    const result =
      createRequestSchema.safeParse(
        request,
      );

    assert.equal(
      result.success,
      true,
    );
  },
);

test(
  "แนบภาพเหตุการณ์ได้ไม่เกิน 5 ไฟล์",
  () => {
    const request =
      createValidRequest();

    const expectedFiles =
      request.expectedFiles as {
        scene: Array<
          Record<string, unknown>
        >;
      };

    expectedFiles.scene =
      Array.from(
        {
          length: 6,
        },
        (_, index) => ({
          ...VALID_FILE,
          name:
            `scene-${index + 1}.jpg`,
        }),
      );

    const result =
      createRequestSchema.safeParse(
        request,
      );

    assert.equal(
      result.success,
      false,
    );
  },
);

test(
  "ปฏิเสธชนิดไฟล์ที่ไม่อนุญาต",
  () => {
    const request =
      createValidRequest();

    const expectedFiles =
      request.expectedFiles as {
        idCard:
          Record<string, unknown>;
      };

    expectedFiles.idCard = {
      name: "dangerous.exe",
      contentType:
        "application/x-msdownload",
      size: 1024,
    };

    const result =
      createRequestSchema.safeParse(
        request,
      );

    assert.equal(
      result.success,
      false,
    );
  },
);