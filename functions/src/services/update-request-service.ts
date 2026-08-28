import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

import type {
  AuthenticatedUser,
} from "../lib/auth";
import { adminDb } from "../lib/firebase-admin";
import { HttpError } from "../lib/http-error";
import type {
  AdminRequestStatus,
  UpdateRequestInput,
} from "../schemas/update-request";

const REQUEST_COLLECTION =
  "cctv_requests";

const AUDIT_LOG_COLLECTION =
  "audit_logs";

interface UpdateRequestOptions {
  input: UpdateRequestInput;
  user: AuthenticatedUser;
  apiRequestId: string;
}

export interface UpdateRequestResult {
  requestId: string;
  trackingId: string | null;

  previousStatus: string;
  status: AdminRequestStatus;

  adminNote: string;
  updatedAt: string;
}

function getOptionalString(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value
      .trim()
      .slice(
        0,
        maximumLength,
      );

  return normalized || null;
}

function createHistoryNote(
  status: AdminRequestStatus,
  adminNote: string,
): string {
  if (adminNote) {
    return adminNote;
  }

  const statusLabels:
    Record<
      AdminRequestStatus,
      string
    > = {
      pending:
        "เปลี่ยนสถานะเป็นรอตรวจสอบ",

      verifying:
        "เจ้าหน้าที่กำลังตรวจสอบเอกสาร",

      searching:
        "เจ้าหน้าที่กำลังค้นหาภาพจากกล้องวงจรปิด",

      waiting_for_information:
        "รอข้อมูลเพิ่มเติมจากผู้ยื่นคำร้อง",

      completed:
        "ดำเนินการคำร้องเสร็จสิ้นแล้ว",

      rejected:
        "คำร้องไม่ได้รับการอนุมัติ",
    };

  return statusLabels[status];
}

export async function updateRequestByAdmin(
  options: UpdateRequestOptions,
): Promise<UpdateRequestResult> {
  const {
    input,
    user,
    apiRequestId,
  } = options;

  const requestReference =
    adminDb
      .collection(
        REQUEST_COLLECTION,
      )
      .doc(input.requestId);

  const auditReference =
    adminDb
      .collection(
        AUDIT_LOG_COLLECTION,
      )
      .doc();

  const updatedAt =
    Timestamp.now();

  return adminDb.runTransaction(
    async (transaction) => {
      const requestSnapshot =
        await transaction.get(
          requestReference,
        );

      if (
        !requestSnapshot.exists
      ) {
        throw new HttpError({
          status: 404,
          code: "NOT_FOUND",
          message:
            "ไม่พบคำร้องที่ต้องการแก้ไข",
        });
      }

      const requestData =
        requestSnapshot.data();

      if (!requestData) {
        throw new Error(
          "Request document has no data",
        );
      }

      const previousStatus =
        getOptionalString(
          requestData.status,
          50,
        );

      if (!previousStatus) {
        throw new HttpError({
          status: 409,
          code: "CONFLICT",
          message:
            "คำร้องนี้ไม่มีข้อมูลสถานะที่ถูกต้อง",
        });
      }

      if (
        previousStatus ===
        "draft"
      ) {
        throw new HttpError({
          status: 409,
          code: "CONFLICT",
          message:
            "ไม่สามารถจัดการคำร้องที่ยังส่งไม่สำเร็จ",
        });
      }

      const trackingId =
        getOptionalString(
          requestData.trackingId,
          128,
        );

      const historyNote =
        createHistoryNote(
          input.status,
          input.adminNote,
        );

      const historyItem = {
        status: input.status,
        timestamp: updatedAt,
        note: historyNote,
      };

      const actor = {
        uid: user.uid,
        email: user.email,
        role:
          user.role ??
          "legacy-admin",
      };

      transaction.update(
        requestReference,
        {
          status: input.status,
          adminNote:
            input.adminNote,

          statusHistory:
            FieldValue.arrayUnion(
              historyItem,
            ),

          updatedAt,

          lastUpdatedBy: actor,
        },
      );

      transaction.create(
        auditReference,
        {
          schemaVersion: 1,

          action:
            "request.status_updated",

          requestId:
            input.requestId,

          trackingId,

          previousStatus,
          newStatus:
            input.status,

          note: historyNote,

          actor,

          apiRequestId,

          createdAt:
            updatedAt,
        },
      );

      return {
        requestId:
          input.requestId,

        trackingId,

        previousStatus,

        status:
          input.status,

        adminNote:
          input.adminNote,

        updatedAt:
          updatedAt
            .toDate()
            .toISOString(),
      };
    },
  );
}