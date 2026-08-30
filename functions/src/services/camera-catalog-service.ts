import { Timestamp } from "firebase-admin/firestore";

import type { AuthenticatedUser } from "../lib/auth";
import { adminDb } from "../lib/firebase-admin";
import { HttpError } from "../lib/http-error";
import type { ManageCameraInput } from "../schemas/manage-camera";

const PUBLIC_COLLECTION =
  "public_cameras";
const PRIVATE_COLLECTION =
  "camera_private_configs";
const AUDIT_COLLECTION =
  "audit_logs";

interface ManageCameraOptions {
  input: ManageCameraInput;
  user: AuthenticatedUser;
  apiRequestId: string;
}

export interface ManageCameraResult {
  cameraId: string;
  action: "created" | "updated" | "archived";
  updatedAt: string;
}

function createActor(
  user: AuthenticatedUser,
) {
  return {
    uid: user.uid,
    email: user.email,
    role:
      user.role ??
      "legacy-admin",
  };
}

export async function manageCameraCatalog(
  options: ManageCameraOptions,
): Promise<ManageCameraResult> {
  const {
    input,
    user,
    apiRequestId,
  } = options;
  const updatedAt = Timestamp.now();
  const actor = createActor(user);

  if (input.action === "archive") {
    const publicReference =
      adminDb
        .collection(
          PUBLIC_COLLECTION,
        )
        .doc(input.cameraId);
    const privateReference =
      adminDb
        .collection(
          PRIVATE_COLLECTION,
        )
        .doc(input.cameraId);
    const auditReference =
      adminDb
        .collection(
          AUDIT_COLLECTION,
        )
        .doc();

    await adminDb.runTransaction(
      async (transaction) => {
        const snapshot =
          await transaction.get(
            publicReference,
          );

        if (!snapshot.exists) {
          throw new HttpError({
            status: 404,
            code: "NOT_FOUND",
            message:
              "ไม่พบกล้องที่ต้องการเก็บเข้าคลัง",
          });
        }

        transaction.update(
          publicReference,
          {
            published: false,
            status: "maintenance",
            archived: true,
            archivedAt: updatedAt,
            updatedAt,
          },
        );

        transaction.set(
          privateReference,
          {
            archived: true,
            archivedAt: updatedAt,
            updatedAt,
            lastUpdatedBy: actor,
          },
          { merge: true },
        );

        transaction.create(
          auditReference,
          {
            schemaVersion: 1,
            action:
              "camera.archived",
            cameraId:
              input.cameraId,
            actor,
            apiRequestId,
            createdAt: updatedAt,
          },
        );
      },
    );

    return {
      cameraId: input.cameraId,
      action: "archived",
      updatedAt:
        updatedAt
          .toDate()
          .toISOString(),
    };
  }

  const cameraId =
    input.cameraId ??
    adminDb
      .collection(
        PUBLIC_COLLECTION,
      )
      .doc().id;
  const publicReference =
    adminDb
      .collection(
        PUBLIC_COLLECTION,
      )
      .doc(cameraId);
  const privateReference =
    adminDb
      .collection(
        PRIVATE_COLLECTION,
      )
      .doc(cameraId);
  const auditReference =
    adminDb
      .collection(
        AUDIT_COLLECTION,
      )
      .doc();

  const wasCreated =
    await adminDb.runTransaction(
      async (transaction) => {
        const existing =
          await transaction.get(
            publicReference,
          );
        const createdAt =
          existing.exists
            ? existing.data()
                ?.createdAt ??
              updatedAt
            : updatedAt;

        transaction.set(
          publicReference,
          {
            schemaVersion: 1,
            ...input.publicData,
            archived: false,
            createdAt,
            updatedAt,
          },
        );

        transaction.set(
          privateReference,
          {
            schemaVersion: 1,
            cameraId,
            ...input.privateData,
            archived: false,
            createdAt,
            updatedAt,
            lastUpdatedBy: actor,
          },
        );

        transaction.create(
          auditReference,
          {
            schemaVersion: 1,
            action: existing.exists
              ? "camera.updated"
              : "camera.created",
            cameraId,
            actor,
            apiRequestId,
            createdAt: updatedAt,
          },
        );

        return !existing.exists;
      },
    );

  return {
    cameraId,
    action: wasCreated
      ? "created"
      : "updated",
    updatedAt:
      updatedAt
        .toDate()
        .toISOString(),
  };
}
