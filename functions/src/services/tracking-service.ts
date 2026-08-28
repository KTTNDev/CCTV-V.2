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
import type {
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

  const trimmedValue = value
    .trim()
    .slice(0, maximumLength);

  return trimmedValue || null;
}

function timestampToISOString(
  value: unknown,
): string | null {
  if (!(value instanceof Timestamp)) {
    return null;
  }

  return value.toDate().toISOString();
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
      "ไม่พบคำร้อง หรือรหัสติดตามไม่ถูกต้อง",
  });
}

export async function trackRequestStatus(
  input: TrackRequestInput,
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
      .doc(parsedToken.trackingId)
      .get();

  if (!trackingIndexSnapshot.exists) {
    throwTrackingNotFound();
  }

  const requestId =
    trackingIndexSnapshot.get(
      "requestId",
    );

  if (
    typeof requestId !== "string" ||
    !/^[A-Za-z0-9]{20}$/.test(
      requestId,
    )
  ) {
    throwTrackingNotFound();
  }

  const requestSnapshot =
    await adminDb
      .collection(REQUEST_COLLECTION)
      .doc(requestId)
      .get();

  if (!requestSnapshot.exists) {
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
    trackingId:
      parsedToken.trackingId,

    status,

    eventType:
      getOptionalString(
        requestData.eventType,
        50,
      ),

    eventDate:
      getOptionalString(
        requestData.eventDate,
        10,
      ),

    eventTimeStart:
      getOptionalString(
        requestData.eventTimeStart,
        5,
      ),

    eventTimeEnd:
      getOptionalString(
        requestData.eventTimeEnd,
        5,
      ),

    location:
      getOptionalString(
        requestData.location,
        300,
      ),

    deliveryMethod:
      getOptionalString(
        requestData.deliveryMethod,
        20,
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