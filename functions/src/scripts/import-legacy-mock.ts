import { readFile } from "node:fs/promises";

import { initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";

const REQUEST_COLLECTION = "cctv_requests";
const DEFAULT_EMULATOR_HOST = "127.0.0.1:8080";
const DEFAULT_PROJECT_ID = "db-rawaicctv";
const BATCH_SIZE = 350;

type MockStatus =
  | "pending"
  | "verifying"
  | "searching"
  | "waiting_for_information"
  | "completed"
  | "rejected";

interface ParsedDateTime {
  date: string;
  time: string;
  instant: Date;
}

function getArgumentValue(
  name: string,
): string | null {
  const prefix = `--${name}=`;
  const argument = process.argv.find(
    (value) => value.startsWith(prefix),
  );

  return argument
    ? argument.slice(prefix.length).trim()
    : null;
}

function requireEmulator(): string {
  if (!process.argv.includes("--emulator")) {
    throw new Error(
      "คำสั่งนี้อนุญาตเฉพาะ Firestore Emulator กรุณาระบุ --emulator",
    );
  }

  const host =
    getArgumentValue("emulator-host") ??
    DEFAULT_EMULATOR_HOST;

  if (
    !/^(?:127\.0\.0\.1|localhost):\d{2,5}$/.test(
      host,
    )
  ) {
    throw new Error(
      "Refusing non-local Firestore host: " +
        host,
    );
  }

  process.env.FIRESTORE_EMULATOR_HOST = host;
  return host;
}

/** RFC 4180 parser ที่รองรับ comma, quote และ newline ภายใน cell */
export function parseCsv(
  source: string,
): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const input = source.replace(/^\uFEFF/, "");

  for (
    let index = 0;
    index < input.length;
    index += 1
  ) {
    const character = input[index];

    if (inQuotes) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }

      continue;
    }

    if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (inQuotes) {
    throw new Error(
      "CSV contains an unclosed quoted field",
    );
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(
    (candidate) =>
      candidate.some(
        (value) => value.trim() !== "",
      ),
  );
}

function toRecords(
  rows: string[][],
): Array<Record<string, string>> {
  const [headerRow, ...dataRows] = rows;

  if (!headerRow) {
    return [];
  }

  const headers = headerRow.map(
    (header) => header.trim(),
  );

  return dataRows.map((values) => {
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      if (header) {
        record[header] =
          values[index]?.trim() ?? "";
      }
    });

    return record;
  });
}

function createThaiInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  milliseconds = 0,
): Date | null {
  const date = new Date(
    `${String(year).padStart(4, "0")}-` +
      `${String(month).padStart(2, "0")}-` +
      `${String(day).padStart(2, "0")}T` +
      `${String(hour).padStart(2, "0")}:` +
      `${String(minute).padStart(2, "0")}:` +
      `${String(second).padStart(2, "0")}.` +
      `${String(milliseconds).padStart(3, "0")}+07:00`,
  );

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function parseEventDateTime(
  value: string,
): ParsedDateTime | null {
  const match = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");
  const instant = createThaiInstant(
    year,
    month,
    day,
    hour,
    minute,
    second,
  );

  if (!instant) {
    return null;
  }

  return {
    date:
      `${String(year).padStart(4, "0")}-` +
      `${String(month).padStart(2, "0")}-` +
      String(day).padStart(2, "0"),
    time:
      `${String(hour).padStart(2, "0")}:` +
      String(minute).padStart(2, "0"),
    instant,
  };
}

function parseSubmittedAt(
  value: string,
): Date | null {
  const match = value.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})(?::(\d{1,3}))?/,
  );

  if (!match) {
    return null;
  }

  return createThaiInstant(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
    Number(match[7] ?? "0"),
  );
}

function parseCoordinates(
  value: string,
): {
  latitude: number | null;
  longitude: number | null;
} {
  const match = value.match(
    /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
  );

  if (!match) {
    return {
      latitude: null,
      longitude: null,
    };
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return {
      latitude: null,
      longitude: null,
    };
  }

  return {
    latitude,
    longitude,
  };
}

function mapEventType(
  value: string,
): string {
  if (value.includes("ลักทรัพย์")) {
    return "THEFT";
  }

  if (value.includes("ทำร้าย")) {
    return "DISPUTE";
  }

  if (value.includes("อุบัติเหตุ")) {
    return "ACCIDENT";
  }

  return "OTHER";
}

function getMockStatus(
  index: number,
): MockStatus {
  const bucket = (index * 37) % 100;

  if (bucket < 9) return "pending";
  if (bucket < 16) return "verifying";
  if (bucket < 24) return "searching";
  if (bucket < 29) {
    return "waiting_for_information";
  }
  if (bucket < 88) return "completed";
  return "rejected";
}

function addMinutesToTime(
  time: string,
  minutesToAdd: number,
): string {
  const [hour, minute] = time
    .split(":")
    .map(Number);
  const totalMinutes =
    (hour * 60 + minute + minutesToAdd) %
    (24 * 60);

  return (
    String(
      Math.floor(totalMinutes / 60),
    ).padStart(2, "0") +
    ":" +
    String(totalMinutes % 60).padStart(
      2,
      "0",
    )
  );
}

function getStatusNote(
  status: MockStatus,
): string {
  const notes: Record<MockStatus, string> = {
    pending:
      "ข้อมูลจำลอง: รอเจ้าหน้าที่รับเรื่อง",
    verifying:
      "ข้อมูลจำลอง: กำลังตรวจสอบเอกสาร",
    searching:
      "ข้อมูลจำลอง: กำลังค้นหาภาพจากกล้อง",
    waiting_for_information:
      "ข้อมูลจำลอง: รอข้อมูลเพิ่มเติมจากผู้ยื่น",
    completed:
      "ข้อมูลจำลอง: ดำเนินการเสร็จสิ้น",
    rejected:
      "ข้อมูลจำลอง: ไม่สามารถดำเนินการได้",
  };

  return notes[status];
}

function createMockDocument(
  record: Record<string, string>,
  index: number,
): Record<string, unknown> {
  const sequence = index + 1;
  const event =
    parseEventDateTime(
      record["วัน เวลา ที่เกิดเหตุ"] ??
        "",
    ) ?? {
      date: "2021-01-01",
      time: "09:00",
      instant:
        createThaiInstant(
          2021,
          1,
          1,
          9,
          0,
        ) ?? new Date(0),
    };

  const submittedDate =
    parseSubmittedAt(
      record["ประทับเวลา"] ?? "",
    ) ??
    new Date(
      event.instant.getTime() +
        60 * 60 * 1_000,
    );

  const submittedAt =
    Timestamp.fromDate(submittedDate);
  const status = getMockStatus(index);
  const updatedAt = Timestamp.fromMillis(
    submittedAt.toMillis() +
      (status === "pending" ? 0 : 2 * 60 * 60 * 1_000),
  );

  const coordinates = parseCoordinates(
    record[
      "ตำแหน่ง lat long ที่เกิดเหตุ"
    ] ?? "",
  );

  const paddedSequence = String(
    sequence,
  ).padStart(4, "0");

  const statusHistory = [
    {
      status: "pending",
      timestamp: submittedAt,
      note:
        "ข้อมูลจำลอง: รับคำร้องเข้าสู่ระบบ",
    },
  ];

  if (status !== "pending") {
    statusHistory.push({
      status,
      timestamp: updatedAt,
      note: getStatusNote(status),
    });
  }

  const originalOutcome =
    record["ผลการตรวจสอบ"] === "พบ"
      ? "พบภาพ"
      : "ไม่พบภาพ";

  return {
    schemaVersion: 1,
    isMockData: true,
    mockSource: "anonymized-legacy-csv",
    mockSequence: sequence,
    trackingId: `MOCK-LEGACY-${paddedSequence}`,
    status,
    createdAt: submittedAt,
    submittedAt,
    updatedAt,
    name: `ผู้ทดสอบระบบ ${paddedSequence}`,
    applicantType: "THAI",
    isForeigner: "THAI",
    nationalId: "0000000000000",
    passportNumber: "",
    phone: "0000000000",
    email:
      `mock-${paddedSequence}@example.invalid`,
    eventDate: event.date,
    eventTimeStart: event.time,
    eventTimeEnd: addMinutesToTime(
      event.time,
      30,
    ),
    eventType: mapEventType(
      record["เหตุที่แจ้ง"] ?? "",
    ),
    accidentSubtype: "",
    isForeignerInvolved: "",
    location:
      `จุดทดสอบจำลอง ${paddedSequence}`,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    description:
      "รายละเอียดถูกแทนด้วยข้อมูลจำลองเพื่อทดสอบหน้าจอและรายงาน",
    deliveryMethod: "WALKIN",
    attachments: {
      idCard: null,
      policeReport: null,
      scene: [],
    },
    statusHistory,
    adminNote:
      `ข้อมูลจำลองปกปิดตัวตนแล้ว • ผลตรวจเดิม: ${originalOutcome}`,
  };
}

async function main(): Promise<void> {
  const emulatorHost = requireEmulator();
  const csvPath = getArgumentValue("csv");
  const projectId =
    getArgumentValue("project") ??
    DEFAULT_PROJECT_ID;
  const maximumRows = Number(
    getArgumentValue("max") ?? "1000",
  );

  if (!csvPath) {
    throw new Error(
      "กรุณาระบุไฟล์ด้วย --csv=PATH",
    );
  }

  if (
    !Number.isInteger(maximumRows) ||
    maximumRows < 1 ||
    maximumRows > 2_000
  ) {
    throw new Error(
      "--max ต้องเป็นจำนวนเต็ม 1-2000",
    );
  }

  const source = await readFile(
    csvPath,
    "utf8",
  );
  const records = toRecords(
    parseCsv(source),
  ).slice(0, maximumRows);

  if (records.length === 0) {
    throw new Error(
      "ไม่พบแถวข้อมูลใน CSV",
    );
  }

  const app = initializeApp({
    projectId,
  });
  const db = getFirestore(app);
  const statusCounts =
    new Map<string, number>();
  let coordinateCount = 0;

  for (
    let offset = 0;
    offset < records.length;
    offset += BATCH_SIZE
  ) {
    const batch = db.batch();
    const chunk = records.slice(
      offset,
      offset + BATCH_SIZE,
    );

    chunk.forEach((record, chunkIndex) => {
      const index = offset + chunkIndex;
      const document = createMockDocument(
        record,
        index,
      );
      const status = String(document.status);

      statusCounts.set(
        status,
        (statusCounts.get(status) ?? 0) + 1,
      );

      if (
        typeof document.latitude === "number" &&
        typeof document.longitude === "number"
      ) {
        coordinateCount += 1;
      }

      batch.set(
        db
          .collection(REQUEST_COLLECTION)
          .doc(
            `mock-legacy-${String(
              index + 1,
            ).padStart(4, "0")}`,
          ),
        document,
      );
    });

    await batch.commit();
  }

  console.log(
    "นำเข้า mock data สำเร็จ (Emulator เท่านั้น)",
  );
  console.log(
    `Emulator: ${emulatorHost}`,
  );
  console.log(
    `จำนวนรายการ: ${records.length}`,
  );
  console.log(
    `รายการที่มีพิกัด: ${coordinateCount}`,
  );
  console.log("สถานะจำลอง:");

  for (const [status, count] of statusCounts) {
    console.log(`- ${status}: ${count}`);
  }

  const verificationSnapshot = await db
    .collection(REQUEST_COLLECTION)
    .where("isMockData", "==", true)
    .get();

  const privacyViolations =
    verificationSnapshot.docs.filter(
      (snapshot) => {
        const data = snapshot.data();

        return (
          typeof data.name !== "string" ||
          !/^ผู้ทดสอบระบบ \d{4}$/.test(
            data.name,
          ) ||
          data.nationalId !==
            "0000000000000" ||
          data.phone !== "0000000000" ||
          typeof data.email !== "string" ||
          !data.email.endsWith(
            "@example.invalid",
          )
        );
      },
    );

  if (
    verificationSnapshot.size <
      records.length ||
    privacyViolations.length > 0
  ) {
    throw new Error(
      "Mock data verification failed: " +
        `documents=${verificationSnapshot.size}, ` +
        `privacyViolations=${privacyViolations.length}`,
    );
  }

  console.log(
    `ตรวจยืนยัน mock documents: ${verificationSnapshot.size}`,
  );
  console.log(
    `รายการผิดรูปแบบข้อมูลจำลอง: ${privacyViolations.length}`,
  );

  console.log(
    "ไม่มีชื่อ เลขบัตร โทรศัพท์ ที่อยู่ รายละเอียด หรือ URL เอกสารจริงถูกนำเข้า",
  );

  await db.terminate();
}

main().catch((error: unknown) => {
  console.error(
    "นำเข้า mock data ไม่สำเร็จ:",
    error,
  );
  process.exitCode = 1;
});
