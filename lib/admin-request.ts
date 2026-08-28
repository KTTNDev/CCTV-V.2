import type {
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
} from "firebase/storage";

import type {
  ApplicantType,
  CCTVRequest,
  RequestTimestamp,
  TrackingStatus,
} from "../types";
import { storage } from "./firebase";

const attachmentUrlCache = new Map<
  string,
  Promise<string | null>
>();

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getString(
  value: unknown,
  fallback = "",
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
}

function getNumber(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getTimestamp(
  value: unknown,
): RequestTimestamp {
  if (
    value instanceof Date ||
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return value;
  }

  if (
    isRecord(value) &&
    typeof value.seconds === "number"
  ) {
   return value as unknown as RequestTimestamp;
  }

  if (
    isRecord(value) &&
    typeof value._seconds === "number"
  ) {
    return {
      seconds: value._seconds,
      nanoseconds:
        typeof value._nanoseconds === "number"
          ? value._nanoseconds
          : 0,
    };
  }

  return null;
}

function getApplicantType(
  data: DocumentData,
): ApplicantType {
  const value =
    data.applicantType ??
    data.isForeigner;

  if (value === "FOREIGNER") {
    return "FOREIGNER";
  }

  if (value === "THAI") {
    return "THAI";
  }

  if (
    value === true ||
    value === "true" ||
    value === "YES"
  ) {
    return "FOREIGNER";
  }

  if (
    getString(data.passportNumber) &&
    !getString(data.nationalId)
  ) {
    return "FOREIGNER";
  }

  return "THAI";
}

function isDirectUrl(
  value: string,
): boolean {
  return (
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  );
}

function getStorageDownloadUrl(
  storagePath: string,
): Promise<string | null> {
  const existing =
    attachmentUrlCache.get(storagePath);

  if (existing) {
    return existing;
  }

  const request = getDownloadURL(
    ref(storage, storagePath),
  ).catch((error: unknown) => {
    console.warn(
      `ไม่สามารถอ่านไฟล์แนบ ${storagePath}`,
      error,
    );

    return null;
  });

  attachmentUrlCache.set(
    storagePath,
    request,
  );

  return request;
}

async function resolveAttachment(
  value: unknown,
): Promise<string | null> {
  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized) {
      return null;
    }

    if (isDirectUrl(normalized)) {
      return normalized;
    }

    return getStorageDownloadUrl(
      normalized,
    );
  }

  if (!isRecord(value)) {
    return null;
  }

  const directUrl =
    getString(value.url) ||
    getString(value.downloadUrl) ||
    getString(value.downloadURL);

  if (directUrl) {
    return directUrl;
  }

  const storagePath =
    getString(value.storagePath) ||
    getString(value.path);

  if (!storagePath) {
    return null;
  }

  return getStorageDownloadUrl(
    storagePath,
  );
}

async function resolveSceneAttachments(
  value: unknown,
): Promise<string[]> {
  const items = Array.isArray(value)
    ? value
    : value
      ? [value]
      : [];

  const resolved = await Promise.all(
    items.map(resolveAttachment),
  );

  return resolved.filter(
    (url): url is string =>
      typeof url === "string" &&
      url.length > 0,
  );
}

function normalizeStatusHistory(
  value: unknown,
): TrackingStatus[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(
    (item): TrackingStatus[] => {
      if (!isRecord(item)) {
        return [];
      }

      const status = getString(
        item.status,
      );

      if (!status) {
        return [];
      }

      return [
        {
          status,
          timestamp: getTimestamp(
            item.timestamp,
          ),
          note:
            getString(item.note) ||
            getString(item.message) ||
            "อัปเดตสถานะคำร้อง",
        },
      ];
    },
  );
}

export function requestTimestampToMillis(
  value: RequestTimestamp,
): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const milliseconds =
      Date.parse(value);

    return Number.isFinite(milliseconds)
      ? milliseconds
      : 0;
  }

  if (
    value &&
    typeof value.seconds === "number"
  ) {
    return value.seconds * 1000;
  }

  return 0;
}

export async function normalizeAdminRequest(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): Promise<CCTVRequest> {
  const data = snapshot.data();

  const rawAttachments = isRecord(
    data.attachments,
  )
    ? data.attachments
    : {};

  const idCardValue =
    rawAttachments.idCard ??
    data.idCardUrl ??
    data.idCard;

  const policeReportValue =
    rawAttachments.policeReport ??
    rawAttachments.report ??
    data.policeReportUrl ??
    data.reportUrl ??
    data.report;

  const sceneValue =
    rawAttachments.scene ??
    data.sceneUrls ??
    data.sceneImages ??
    data.scene;

  const [
    idCard,
    report,
    scene,
  ] = await Promise.all([
    resolveAttachment(idCardValue),
    resolveAttachment(
      policeReportValue,
    ),
    resolveSceneAttachments(
      sceneValue,
    ),
  ]);

  const schemaVersion =
    getNumber(data.schemaVersion) ?? 1;

  const applicantType =
    getApplicantType(data);

  return {
    id: snapshot.id,

    schemaVersion,
    dataSource:
      schemaVersion >= 2
        ? "secure-v2"
        : "legacy",

    trackingId:
      getString(data.trackingId) ||
      snapshot.id,

    status:
      getString(
        data.status,
        "pending",
      ),

    createdAt: getTimestamp(
      data.createdAt,
    ),

    submittedAt: getTimestamp(
      data.submittedAt,
    ),

    updatedAt: getTimestamp(
      data.updatedAt,
    ),

    name:
      getString(data.name) ||
      getString(data.fullName) ||
      "ไม่ระบุชื่อ",

    applicantType,
    isForeigner: applicantType,

    nationalId: getString(
      data.nationalId,
    ),

    passportNumber: getString(
      data.passportNumber,
    ),

    phone: getString(data.phone),
    email: getString(data.email),

    eventDate: getString(
      data.eventDate,
    ),

    eventTimeStart: getString(
      data.eventTimeStart,
    ),

    eventTimeEnd: getString(
      data.eventTimeEnd,
    ),

    eventType: getString(
      data.eventType,
      "OTHER",
    ),

    accidentSubtype: getString(
      data.accidentSubtype,
    ),

    isForeignerInvolved:
      getString(
        data.isForeignerInvolved,
      ),

    location:
      getString(data.location) ||
      "ไม่ระบุสถานที่",

    latitude: getNumber(
      data.latitude,
    ),

    longitude: getNumber(
      data.longitude,
    ),

    description: getString(
      data.description,
    ),

    deliveryMethod: getString(
      data.deliveryMethod,
      "WALKIN",
    ),

    attachments: {
      idCard,
      report,
      scene,
    },

    statusHistory:
      normalizeStatusHistory(
        data.statusHistory,
      ),

    adminNote: getString(
      data.adminNote,
    ),
  };
}

export async function normalizeAdminRequests(
  snapshots: QueryDocumentSnapshot<DocumentData>[],
): Promise<CCTVRequest[]> {
  const requests = await Promise.all(
    snapshots.map(
      normalizeAdminRequest,
    ),
  );

  return requests.sort(
    (first, second) =>
      requestTimestampToMillis(
        second.createdAt,
      ) -
      requestTimestampToMillis(
        first.createdAt,
      ),
  );
}