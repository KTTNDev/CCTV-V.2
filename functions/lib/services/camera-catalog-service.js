"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageCameraCatalog = manageCameraCatalog;
const firestore_1 = require("firebase-admin/firestore");
const firebase_admin_1 = require("../lib/firebase-admin");
const http_error_1 = require("../lib/http-error");
const PUBLIC_COLLECTION = "public_cameras";
const PRIVATE_COLLECTION = "camera_private_configs";
const AUDIT_COLLECTION = "audit_logs";
function createActor(user) {
    return {
        uid: user.uid,
        email: user.email,
        role: user.role ??
            "legacy-admin",
    };
}
async function manageCameraCatalog(options) {
    const { input, user, apiRequestId, } = options;
    const updatedAt = firestore_1.Timestamp.now();
    const actor = createActor(user);
    if (input.action === "archive") {
        const publicReference = firebase_admin_1.adminDb
            .collection(PUBLIC_COLLECTION)
            .doc(input.cameraId);
        const privateReference = firebase_admin_1.adminDb
            .collection(PRIVATE_COLLECTION)
            .doc(input.cameraId);
        const auditReference = firebase_admin_1.adminDb
            .collection(AUDIT_COLLECTION)
            .doc();
        await firebase_admin_1.adminDb.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(publicReference);
            if (!snapshot.exists) {
                throw new http_error_1.HttpError({
                    status: 404,
                    code: "NOT_FOUND",
                    message: "ไม่พบกล้องที่ต้องการเก็บเข้าคลัง",
                });
            }
            transaction.update(publicReference, {
                published: false,
                status: "maintenance",
                archived: true,
                archivedAt: updatedAt,
                updatedAt,
            });
            transaction.set(privateReference, {
                archived: true,
                archivedAt: updatedAt,
                updatedAt,
                lastUpdatedBy: actor,
            }, { merge: true });
            transaction.create(auditReference, {
                schemaVersion: 1,
                action: "camera.archived",
                cameraId: input.cameraId,
                actor,
                apiRequestId,
                createdAt: updatedAt,
            });
        });
        return {
            cameraId: input.cameraId,
            action: "archived",
            updatedAt: updatedAt
                .toDate()
                .toISOString(),
        };
    }
    const cameraId = input.cameraId ??
        firebase_admin_1.adminDb
            .collection(PUBLIC_COLLECTION)
            .doc().id;
    const publicReference = firebase_admin_1.adminDb
        .collection(PUBLIC_COLLECTION)
        .doc(cameraId);
    const privateReference = firebase_admin_1.adminDb
        .collection(PRIVATE_COLLECTION)
        .doc(cameraId);
    const auditReference = firebase_admin_1.adminDb
        .collection(AUDIT_COLLECTION)
        .doc();
    const wasCreated = await firebase_admin_1.adminDb.runTransaction(async (transaction) => {
        const existing = await transaction.get(publicReference);
        const createdAt = existing.exists
            ? existing.data()
                ?.createdAt ??
                updatedAt
            : updatedAt;
        transaction.set(publicReference, {
            schemaVersion: 1,
            ...input.publicData,
            archived: false,
            createdAt,
            updatedAt,
        });
        transaction.set(privateReference, {
            schemaVersion: 1,
            cameraId,
            ...input.privateData,
            archived: false,
            createdAt,
            updatedAt,
            lastUpdatedBy: actor,
        });
        transaction.create(auditReference, {
            schemaVersion: 1,
            action: existing.exists
                ? "camera.updated"
                : "camera.created",
            cameraId,
            actor,
            apiRequestId,
            createdAt: updatedAt,
        });
        return !existing.exists;
    });
    return {
        cameraId,
        action: wasCreated
            ? "created"
            : "updated",
        updatedAt: updatedAt
            .toDate()
            .toISOString(),
    };
}
//# sourceMappingURL=camera-catalog-service.js.map