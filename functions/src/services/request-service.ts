import { randomUUID } from "node:crypto";

import { Timestamp } from "firebase-admin/firestore";

import type { AuthenticatedUser } from "../lib/auth";
import { adminDb } from "../lib/firebase-admin";
import {
  generateTrackingCredentials,
} from "../lib/tracking";
import type {
  CreateRequestInput,
  UploadFileMetadata,
} from "../schemas/request";

const REQUEST_COLLECTION = "cctv_requests";
const TRACKING_INDEX_COLLECTION = "tracking_index";

const DRAFT_LIFETIME_MS = 60 * 60 * 1000;
const TRACKING_COLLISION_RETRIES = 5;

const PRIVACY_NOTICE_VERSION = "2026-08-27";

const EXTENSION_BY_CONTENT_TYPE: Record<
  UploadFileMetadata["contentType"],
  string
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export type UploadKind =
  | "id-card"
  | "police-report"
  | "scene";

export interface UploadTarget {
  id: string;
  kind: UploadKind;
  originalName: string;
  contentType: UploadFileMetadata["contentType"];
  size: number;
  storagePath: string;
}

interface StoredUploadTarget extends UploadTarget {
  status: "pending";
}

export interface CreateDraftResult {
  requestId: string;
  trackingId: string;
  trackingToken: string;
  draftExpiresAt: string;
  uploadTargets: UploadTarget[];
}

class TrackingIdCollisionError extends Error {
  constructor() {
    super("Tracking ID collision");
    this.name = "TrackingIdCollisionError";
  }
}

function sanitizeOriginalFileName(
  value: string,
): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\\/]/g, "_")
    .trim()
    .slice(0, 150);
}

function createUploadTarget(
  requestId: string,
  kind: UploadKind,
  metadata: UploadFileMetadata,
): UploadTarget {
  const id = randomUUID();

  const extension =
    EXTENSION_BY_CONTENT_TYPE[
      metadata.contentType
    ];

  return {
    id,
    kind,
    originalName: sanitizeOriginalFileName(
      metadata.name,
    ),
    contentType: metadata.contentType,
    size: metadata.size,
    storagePath:
      `requests/${requestId}/uploads/` +
      `${kind}/${id}.${extension}`,
  };
}

function createUploadTargets(
  requestId: string,
  input: CreateRequestInput,
): UploadTarget[] {
  return [
    createUploadTarget(
      requestId,
      "id-card",
      input.expectedFiles.idCard,
    ),
    createUploadTarget(
      requestId,
      "police-report",
      input.expectedFiles.policeReport,
    ),
    ...input.expectedFiles.scene.map(
      (metadata) =>
        createUploadTarget(
          requestId,
          "scene",
          metadata,
        ),
    ),
  ];
}

function createStoredUploadTargets(
  targets: UploadTarget[],
): StoredUploadTarget[] {
  return targets.map((target) => ({
    ...target,
    status: "pending",
  }));
}

export async function createDraftRequest(
  input: CreateRequestInput,
  user: AuthenticatedUser,
): Promise<CreateDraftResult> {
  const requestRef = adminDb
    .collection(REQUEST_COLLECTION)
    .doc();

  const uploadTargets = createUploadTargets(
    requestRef.id,
    input,
  );

  const createdAt = Timestamp.now();

  const draftExpiresAt = Timestamp.fromMillis(
    createdAt.toMillis() + DRAFT_LIFETIME_MS,
  );

  for (
    let attempt = 0;
    attempt < TRACKING_COLLISION_RETRIES;
    attempt += 1
  ) {
    const tracking =
      generateTrackingCredentials();

    const trackingIndexRef = adminDb
      .collection(TRACKING_INDEX_COLLECTION)
      .doc(tracking.trackingId);

    try {
      await adminDb.runTransaction(
        async (transaction) => {
          const trackingSnapshot =
            await transaction.get(
              trackingIndexRef,
            );

          if (trackingSnapshot.exists) {
            throw new TrackingIdCollisionError();
          }

          transaction.set(requestRef, {
            schemaVersion: 2,

            ownerUid: user.uid,
            sourceAuthProvider:
              user.token.firebase
                ?.sign_in_provider ??
              "unknown",

            status: "draft",
            trackingId: tracking.trackingId,
            trackingSecretHash:
              tracking.trackingSecretHash,

            name: input.name,
            applicantType:
              input.applicantType,
            nationalId:
              input.nationalId || null,
            passportNumber:
              input.passportNumber || null,
            phone: input.phone,
            email: input.email || null,

            eventDate: input.eventDate,
            eventTimeStart:
              input.eventTimeStart,
            eventTimeEnd: input.eventTimeEnd,
            eventType: input.eventType,
            accidentSubtype:
              input.accidentSubtype ?? null,
            isForeignerInvolved:
              input.isForeignerInvolved ??
              null,

            location: input.location,
            latitude: input.latitude,
            longitude: input.longitude,
            description: input.description,
            deliveryMethod:
              input.deliveryMethod,

            privacyConsent: {
              accepted: true,
              version:
                PRIVACY_NOTICE_VERSION,
              acceptedAt: createdAt,
            },

          uploads:createStoredUploadTargets(uploadTargets),
            uploadAuthorizations:createUploadAuthorizations(uploadTargets),


        attachments: {
              idCard: null,
              policeReport: null,
              scene: [],
            },

            statusHistory: [],
            adminNote: null,

            createdAt,
            updatedAt: createdAt,
            submittedAt: null,
            draftExpiresAt,
          });

          transaction.set(
            trackingIndexRef,
            {
              requestId: requestRef.id,
              createdAt,
              draftExpiresAt,
            },
          );
        },
      );

      return {
        requestId: requestRef.id,
        trackingId: tracking.trackingId,
        trackingToken:
          tracking.trackingToken,
        draftExpiresAt:
          draftExpiresAt
            .toDate()
            .toISOString(),
        uploadTargets,
      };
    } catch (error) {
      if (
        error instanceof
        TrackingIdCollisionError
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Unable to allocate a unique tracking ID",
  );
}
function createUploadAuthorizations(
  targets: UploadTarget[],
): Record<string, StoredUploadTarget> {
  const authorizations: Record<
    string,
    StoredUploadTarget
  > = {};

  for (const target of targets) {
    const fileName = target.storagePath
      .split("/")
      .at(-1);

    if (!fileName) {
      throw new Error(
        "Unable to determine upload file name",
      );
    }

    authorizations[fileName] = {
      ...target,
      status: "pending",
    };
  }

  return authorizations;
}