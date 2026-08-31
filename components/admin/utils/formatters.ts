import {
  Car,
  FileQuestion,
  Hammer,
  ShieldAlert,
  Users,
} from "lucide-react";

import type {
  RequestTimestamp,
} from "../../../types";

export const COLORS = [
  "#3b82f6",
  "#43b99a",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#64748b",
];

export const EVENT_TYPE_TH:
  Record<string, string> = {
    ACCIDENT:
      "🚗 อุบัติเหตุจราจร",
    THEFT:
      "🔓 โจรกรรม / ลักทรัพย์",
    VANDALISM:
      "🔨 ทำลายทรัพย์สิน",
    DISPUTE:
      "⚖️ ข้อพิพาท / ทะเลาะวิวาท",
    OTHER:
      "📋 อื่นๆ",
  };

export const STATUS_TH:
  Record<string, string> = {
    draft:
      "📝 กำลังกรอกคำร้อง",
    pending:
      "⏳ รอตรวจสอบ",

    // สถานะจากระบบเดิม
    processing:
      "⚙️ กำลังดำเนินการ",

    verifying:
      "📄 ตรวจเอกสาร",
    searching:
      "🔍 กำลังหาภาพ",
    waiting_for_information:
      "📨 รอข้อมูลเพิ่มเติม",
    completed:
      "✅ เสร็จสิ้น",
    rejected:
      "❌ ปฏิเสธ",
  };

export const ACCIDENT_SUBTYPE_TH:
  Record<string, string> = {
    MC_VS_MC:
      "🏍️ จยย. ชน จยย.",
    MC_VS_CAR:
      "🚗 จยย. ชน รถยนต์",
    CAR_VS_CAR:
      "🚘 รถยนต์ ชน รถยนต์",
    PEDESTRIAN:
      "🚶 ชนคนเดินเท้า",
    HIT_AND_RUN:
      "🏃 ชนแล้วหนี",
    OTHER:
      "📋 อื่นๆ",
  };

export function extractDriveFileId(
  url: string,
): string | null {
  if (!url) {
    return null;
  }

  const match = url.match(
    /(?:file\/d\/|open\?id=|uc\?.*id=)([\w-]+)/,
  );

  return match?.[1] ?? null;
}

export function getDirectDriveLink(
  url: string | undefined | null,
): string {
  const normalizedUrl = url ?? "";

  const fileId =
    extractDriveFileId(
      normalizedUrl,
    );

  if (fileId) {
    return (
      "https://drive.google.com/" +
      `thumbnail?id=${fileId}&sz=w1000`
    );
  }

  return normalizedUrl;
}

export function getMiniThumbnailLink(
  url: string | undefined | null,
): string {
  const normalizedUrl = url ?? "";

  const fileId =
    extractDriveFileId(
      normalizedUrl,
    );

  if (fileId) {
    return (
      "https://drive.google.com/" +
      `thumbnail?id=${fileId}&sz=w150`
    );
  }

  return normalizedUrl;
}

function createValidDate(
  year: number,
  month: number,
  day: number,
): Date | null {
  const date = new Date(
    year,
    month,
    day,
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function formatEventDate(
  dateString?: string,
): string {
  if (!dateString) {
    return "-";
  }

  try {
    let date: Date | null = null;

    if (
      /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(
        dateString,
      )
    ) {
      const [
        yearValue,
        monthValue,
        dayValue,
      ] = dateString
        .split(/[/-]/)
        .map(Number);

      const year =
        yearValue > 2400
          ? yearValue - 543
          : yearValue;

      date = createValidDate(
        year,
        monthValue - 1,
        dayValue,
      );
    } else if (
      /^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(
        dateString,
      )
    ) {
      const [
        dayValue,
        monthValue,
        yearValue,
      ] = dateString
        .split(/[/-]/)
        .map(Number);

      const year =
        yearValue > 2400
          ? yearValue - 543
          : yearValue;

      date = createValidDate(
        year,
        monthValue - 1,
        dayValue,
      );
    } else {
      const parsed =
        new Date(dateString);

      if (
        !Number.isNaN(
          parsed.getTime(),
        )
      ) {
        date = parsed;
      }
    }

    if (!date) {
      return dateString;
    }

    return date.toLocaleDateString(
      "th-TH",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      },
    );
  } catch {
    return dateString;
  }
}

export function formatPhoneNumber(
  phone?: string,
): string {
  if (!phone) {
    return "-";
  }

  const cleaned =
    phone.replace(/\D/g, "");

  if (cleaned.length === 10) {
    return (
      `${cleaned.slice(0, 3)}-` +
      `${cleaned.slice(3, 6)}-` +
      cleaned.slice(6)
    );
  }

  if (cleaned.length === 9) {
    return (
      `${cleaned.slice(0, 2)}-` +
      `${cleaned.slice(2, 5)}-` +
      cleaned.slice(5)
    );
  }

  return phone;
}

export function formatNationalId(
  id?: string,
): string {
  if (!id) {
    return "-";
  }

  const cleaned =
    id.replace(/\D/g, "");

  if (cleaned.length !== 13) {
    return id;
  }

  return (
    `${cleaned.slice(0, 1)}-` +
    `${cleaned.slice(1, 5)}-` +
    `${cleaned.slice(5, 10)}-` +
    `${cleaned.slice(10, 12)}-` +
    cleaned.slice(12)
  );
}

function timestampToDate(
  timestamp: RequestTimestamp | unknown,
): Date | null {
  if (timestamp instanceof Date) {
    return Number.isNaN(
      timestamp.getTime(),
    )
      ? null
      : timestamp;
  }

  if (typeof timestamp === "number") {
    const date = new Date(timestamp);

    return Number.isNaN(
      date.getTime(),
    )
      ? null
      : date;
  }

  if (typeof timestamp === "string") {
    const date = new Date(timestamp);

    return Number.isNaN(
      date.getTime(),
    )
      ? null
      : date;
  }

  if (
    typeof timestamp === "object" &&
    timestamp !== null
  ) {
    const value =
      timestamp as {
        seconds?: unknown;
        _seconds?: unknown;
        toDate?: unknown;
      };

    if (
      typeof value.toDate ===
      "function"
    ) {
      const date = (
        value.toDate as () => Date
      )();

      return Number.isNaN(
        date.getTime(),
      )
        ? null
        : date;
    }

    const seconds =
      typeof value.seconds ===
      "number"
        ? value.seconds
        : typeof value._seconds ===
            "number"
          ? value._seconds
          : null;

    if (seconds !== null) {
      return new Date(
        seconds * 1000,
      );
    }
  }

  return null;
}

export function formatSubmitDate(
  timestamp:
    | RequestTimestamp
    | unknown,
): string {
  const date =
    timestampToDate(timestamp);

  if (!date) {
    return "N/A";
  }

  return date.toLocaleDateString(
    "th-TH",
    {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    },
  );
}

export function formatDateTime(
  timestamp:
    | RequestTimestamp
    | unknown,
): string {
  const date =
    timestampToDate(timestamp);

  if (!date) {
    return "-";
  }

  return date.toLocaleString(
    "th-TH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}

export function getEventIcon(
  type: string,
) {
  switch (type) {
    case "ACCIDENT":
      return Car;

    case "THEFT":
      return ShieldAlert;

    case "VANDALISM":
      return Hammer;

    case "DISPUTE":
      return Users;

    default:
      return FileQuestion;
  }
}
