"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRequestByAdmin = updateRequestByAdmin;
const firestore_1 = require("firebase-admin/firestore");
const firebase_admin_1 = require("../lib/firebase-admin");
const http_error_1 = require("../lib/http-error");
const REQUEST_COLLECTION = "cctv_requests";
const AUDIT_LOG_COLLECTION = "audit_logs";
function getOptionalString(value, maximumLength) {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value
        .trim()
        .slice(0, maximumLength);
    return normalized || null;
}
function createHistoryNote(status, adminNote) {
    if (adminNote) {
        return adminNote;
    }
    const statusLabels = {
        pending: "เปลี่ยนสถานะเป็นรอตรวจสอบ",
        verifying: "เจ้าหน้าที่กำลังตรวจสอบเอกสาร",
        searching: "เจ้าหน้าที่กำลังค้นหาภาพจากกล้องวงจรปิด",
        waiting_for_information: "รอข้อมูลเพิ่มเติมจากผู้ยื่นคำร้อง",
        completed: "ดำเนินการคำร้องเสร็จสิ้นแล้ว",
        rejected: "คำร้องไม่ได้รับการอนุมัติ",
    };
    return statusLabels[status];
}
async function updateRequestByAdmin(options) {
    const { input, user, apiRequestId, } = options;
    const requestReference = firebase_admin_1.adminDb
        .collection(REQUEST_COLLECTION)
        .doc(input.requestId);
    const auditReference = firebase_admin_1.adminDb
        .collection(AUDIT_LOG_COLLECTION)
        .doc();
    const updatedAt = firestore_1.Timestamp.now();
    return firebase_admin_1.adminDb.runTransaction(async (transaction) => {
        const requestSnapshot = await transaction.get(requestReference);
        if (!requestSnapshot.exists) {
            throw new http_error_1.HttpError({
                status: 404,
                code: "NOT_FOUND",
                message: "ไม่พบคำร้องที่ต้องการแก้ไข",
            });
        }
        const requestData = requestSnapshot.data();
        if (!requestData) {
            throw new Error("Request document has no data");
        }
        const previousStatus = getOptionalString(requestData.status, 50);
        if (!previousStatus) {
            throw new http_error_1.HttpError({
                status: 409,
                code: "CONFLICT",
                message: "คำร้องนี้ไม่มีข้อมูลสถานะที่ถูกต้อง",
            });
        }
        if (previousStatus ===
            "draft") {
            throw new http_error_1.HttpError({
                status: 409,
                code: "CONFLICT",
                message: "ไม่สามารถจัดการคำร้องที่ยังส่งไม่สำเร็จ",
            });
        }
        const trackingId = getOptionalString(requestData.trackingId, 128);
        const historyNote = createHistoryNote(input.status, input.adminNote);
        const historyItem = {
            status: input.status,
            timestamp: updatedAt,
            note: historyNote,
        };
        const actor = {
            uid: user.uid,
            email: user.email,
            role: user.role ??
                "legacy-admin",
        };
        transaction.update(requestReference, {
            status: input.status,
            adminNote: input.adminNote,
            statusHistory: firestore_1.FieldValue.arrayUnion(historyItem),
            updatedAt,
            lastUpdatedBy: actor,
        });
        transaction.create(auditReference, {
            schemaVersion: 1,
            action: "request.status_updated",
            requestId: input.requestId,
            trackingId,
            previousStatus,
            newStatus: input.status,
            note: historyNote,
            actor,
            apiRequestId,
            createdAt: updatedAt,
        });
        return {
            requestId: input.requestId,
            trackingId,
            previousStatus,
            status: input.status,
            adminNote: input.adminNote,
            updatedAt: updatedAt
                .toDate()
                .toISOString(),
        };
    });
}
//# sourceMappingURL=update-request-service.js.map