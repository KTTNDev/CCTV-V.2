import {
  timingSafeEqual,
} from "node:crypto";
import {
  Timestamp,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "../lib/firebase-admin";
import { HttpError } from "../lib/http-error";
import {
  parseTrackingToken,
  verifyTrackingSecret,
} from "../lib/tracking";
import {
  isLegacyTrackRequestInput,
} from "../schemas/track-request";
import type {
  LegacyTrackRequestInput,
  SecureTrackRequestInput,
  TrackRequestInput,
} from "../schemas/track-request";

const REQUEST_COLLECTION =
  "cctv_requests";

const TRACKING_INDEX_COLLECTION =
  "tracking_index";

export interface PublicStatusHistoryItem {
  status: string;
  note: string;
  timestamp: string | null;
}

export interface TrackRequestResult {
  trackingId: string;
  status: string;

  eventType: string | null;
  eventDate: string | null;
  eventTimeStart: string | null;
  eventTimeEnd: string | null;
  location: string | null;
  deliveryMethod: string | null;

  adminNote: string | null;

  createdAt: string | null;
  submittedAt: string | null;
  updatedAt: string | null;

  statusHistory:
    PublicStatusHistoryItem[];
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getOptionalString(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .slice(0, maximumLength);

  return normalized || null;
}

function timestampToISOString(
  value: unknown,
): string | null {
  if (
    value instanceof Timestamp
  ) {
    return value
      .toDate()
      .toISOString();
  }

  if (value instanceof Date) {
    return Number.isNaN(
      value.getTime(),
    )
      ? null
      : value.toISOString();
  }

  return null;
}

function createPublicStatusHistory(
  value: unknown,
): PublicStatusHistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result:
    PublicStatusHistoryItem[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const status =
      getOptionalString(
        item.status,
        50,
      );

    const note =
      getOptionalString(
        item.note,
        2000,
      );

    if (!status || !note) {
      continue;
    }

    result.push({
      status,
      note,

      timestamp:
        timestampToISOString(
          item.timestamp,
        ),
    });
  }

  return result;
}

function throwTrackingNotFound(): never {
  throw new HttpError({
    status: 404,
    code: "NOT_FOUND",
    message:
      "ไม่พบคำร้อง หรือข้อมูลยืนยันไม่ถูกต้อง",
  });
}

function createTrackingResult(
  trackingId: string,
  requestData:
    Record<string, unknown>,
): TrackRequestResult {
  const status =
    getOptionalString(
      requestData.status,
      50,
    );

  if (
    !status ||
    status === "draft"
  ) {
    throwTrackingNotFound();
  }

  return {
    trackingId,
    status,

    eventType:
      getOptionalString(
        requestData.eventType,
        50,
      ),

    eventDate:
      getOptionalString(
        requestData.eventDate,
        20,
      ),

    eventTimeStart:
      getOptionalString(
        requestData.eventTimeStart,
        10,
      ),

    eventTimeEnd:
      getOptionalString(
        requestData.eventTimeEnd,
        10,
      ),

    location:
      getOptionalString(
        requestData.location,
        300,
      ),

    deliveryMethod:
      getOptionalString(
        requestData.deliveryMethod,
        30,
      ),

    adminNote:
      getOptionalString(
        requestData.adminNote,
        2000,
      ),

    createdAt:
      timestampToISOString(
        requestData.createdAt,
      ),

    submittedAt:
      timestampToISOString(
        requestData.submittedAt,
      ),

    updatedAt:
      timestampToISOString(
        requestData.updatedAt,
      ),

    statusHistory:
      createPublicStatusHistory(
        requestData.statusHistory,
      ),
  };
}

function constantTimeEqual(
  first: string,
  second: string,
): boolean {
  const firstBuffer =
    Buffer.from(
      first,
      "utf8",
    );

  const secondBuffer =
    Buffer.from(
      second,
      "utf8",
    );

  if (
    firstBuffer.length !==
    secondBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    firstBuffer,
    secondBuffer,
  );
}

function getPhoneLastFour(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const digits =
    value.replace(/\D/g, "");

  if (digits.length < 4) {
    return null;
  }

  return digits.slice(-4);
}

function normalizeStoredDate(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim();

  const yearFirstMatch =
    normalized.match(
      /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/,
    );

  if (yearFirstMatch) {
    let year =
      Number(
        yearFirstMatch[1],
      );

    const month =
      Number(
        yearFirstMatch[2],
      );

    const day =
      Number(
        yearFirstMatch[3],
      );

    if (year > 2400) {
      year -= 543;
    }

    return (
      `${String(year).padStart(4, "0")}-` +
      `${String(month).padStart(2, "0")}-` +
      String(day).padStart(2, "0")
    );
  }

  const dayFirstMatch =
    normalized.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
    );

  if (dayFirstMatch) {
    const day =
      Number(
        dayFirstMatch[1],
      );

    const month =
      Number(
        dayFirstMatch[2],
      );

    let year =
      Number(
        dayFirstMatch[3],
      );

    if (year > 2400) {
      year -= 543;
    }

    return (
      `${String(year).padStart(4, "0")}-` +
      `${String(month).padStart(2, "0")}-` +
      String(day).padStart(2, "0")
    );
  }

  return null;
}

async function trackSecureRequest(
  input:
    SecureTrackRequestInput,
): Promise<TrackRequestResult> {
  const parsedToken =
    parseTrackingToken(
      input.trackingToken,
    );

  const trackingIndexSnapshot =
    await adminDb
      .collection(
        TRACKING_INDEX_COLLECTION,
      )
      .doc(
        parsedToken.trackingId,
      )
      .get();

  if (
    !trackingIndexSnapshot.exists
  ) {
    throwTrackingNotFound();
  }

  const requestId =
    trackingIndexSnapshot.get(
      "requestId",
    );

  if (
    typeof requestId !==
      "string" ||
    !/^[A-Za-z0-9]{20}$/.test(
      requestId,
    )
  ) {
    throwTrackingNotFound();
  }

  const requestSnapshot =
    await adminDb
      .collection(
        REQUEST_COLLECTION,
      )
      .doc(requestId)
      .get();

  if (
    !requestSnapshot.exists
  ) {
    throwTrackingNotFound();
  }

  const requestData =
    requestSnapshot.data();

  if (!requestData) {
    throwTrackingNotFound();
  }

  const expectedSecretHash =
    requestData.trackingSecretHash;

  if (
    typeof expectedSecretHash !==
      "string" ||
    !verifyTrackingSecret(
      parsedToken.trackingSecret,
      expectedSecretHash,
    )
  ) {
    throwTrackingNotFound();
  }

  if (
    requestData.trackingId !==
    parsedToken.trackingId
  ) {
    throwTrackingNotFound();
  }

  return createTrackingResult(
    parsedToken.trackingId,
    requestData,
  );
}

async function trackLegacyRequest(
  input:
    LegacyTrackRequestInput,
): Promise<TrackRequestResult> {
  const requestSnapshot =
    await adminDb
      .collection(
        REQUEST_COLLECTION,
      )
      .where(
        "trackingId",
        "==",
        input.trackingId,
      )
      .limit(2)
      .get();

  /**
   * ไม่คืนข้อมูลหากไม่พบ
   * หรือพบ Tracking ID ซ้ำ
   */
  if (
    requestSnapshot.size !== 1
  ) {
    throwTrackingNotFound();
  }

  const document =
    requestSnapshot.docs[0];

  const requestData =
    document.data();

  /**
   * ห้ามใช้ Legacy Verification
   * กับคำร้อง Secure V2 โดยเด็ดขาด
   */
  const schemaVersion =
    requestData.schemaVersion;

  const hasSecureSecret =
    typeof requestData
      .trackingSecretHash ===
    "string";

  if (
    (
      typeof schemaVersion ===
        "number" &&
      schemaVersion >= 2
    ) ||
    hasSecureSecret
  ) {
    throwTrackingNotFound();
  }

  const storedPhoneLastFour =
    getPhoneLastFour(
      requestData.phone,
    );

  const storedEventDate =
    normalizeStoredDate(
      requestData.eventDate,
    );

  if (
    !storedPhoneLastFour ||
    !storedEventDate
  ) {
    throwTrackingNotFound();
  }

  const phoneMatches =
    constantTimeEqual(
      storedPhoneLastFour,
      input.phoneLast4,
    );

  const dateMatches =
    constantTimeEqual(
      storedEventDate,
      input.eventDate,
    );

  if (
    !phoneMatches ||
    !dateMatches
  ) {
    throwTrackingNotFound();
  }

  return createTrackingResult(
    input.trackingId,
    requestData,
  );
}

export async function trackRequestStatus(
  input: TrackRequestInput,
): Promise<TrackRequestResult> {
  if (
    isLegacyTrackRequestInput(
      input,
    )
  ) {
    return trackLegacyRequest(
      input,
    );
  }

  return trackSecureRequest(
    input,
  );
}