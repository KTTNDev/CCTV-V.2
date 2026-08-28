"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeDraftRequest = finalizeDraftRequest;
const firestore_1 = require("firebase-admin/firestore");
const firebase_admin_1 = require("../lib/firebase-admin");
const http_error_1 = require("../lib/http-error");
const REQUEST_COLLECTION = "cctv_requests";
const TRACKING_INDEX_COLLECTION = "tracking_index";
function isRecord(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value));
}
function isUploadKind(value) {
    return (value === "id-card" ||
        value === "police-report" ||
        value === "scene");
}
function isStoredUploadTarget(value) {
    if (!isRecord(value)) {
        return false;
    }
    return (typeof value.id === "string" &&
        value.id.length > 0 &&
        isUploadKind(value.kind) &&
        typeof value.originalName === "string" &&
        value.originalName.length > 0 &&
        typeof value.contentType === "string" &&
        typeof value.size === "number" &&
        Number.isInteger(value.size) &&
        value.size > 0 &&
        typeof value.storagePath === "string" &&
        value.storagePath.length > 0 &&
        value.status === "pending");
}
function getUploadTargets(requestId, requestData) {
    const uploads = requestData.uploads;
    if (!Array.isArray(uploads) ||
        !uploads.every(isStoredUploadTarget)) {
        throw new Error("Request contains invalid upload targets");
    }
    const idCardTargets = uploads.filter((target) => target.kind === "id-card");
    const policeReportTargets = uploads.filter((target) => target.kind === "police-report");
    const sceneTargets = uploads.filter((target) => target.kind === "scene");
    if (idCardTargets.length !== 1 ||
        policeReportTargets.length !== 1 ||
        sceneTargets.length > 5) {
        throw new Error("Request contains an invalid upload target set");
    }
    const targetIds = new Set(uploads.map((target) => target.id));
    const storagePaths = new Set(uploads.map((target) => target.storagePath));
    if (targetIds.size !== uploads.length ||
        storagePaths.size !== uploads.length) {
        throw new Error("Request contains duplicated upload targets");
    }
    for (const target of uploads) {
        const fileName = target.storagePath
            .split("/")
            .at(-1);
        const expectedPrefix = `requests/${requestId}/uploads/` +
            `${target.kind}/`;
        if (!fileName ||
            !target.storagePath.startsWith(expectedPrefix)) {
            throw new Error("Request contains an invalid storage path");
        }
    }
    return uploads;
}
function getTimestamp(value) {
    return value instanceof firestore_1.Timestamp
        ? value
        : null;
}
function assertRequestOwner(requestData, user) {
    if (requestData.ownerUid !== user.uid) {
        throw new http_error_1.HttpError({
            status: 403,
            code: "FORBIDDEN",
            message: "คุณไม่มีสิทธิ์ดำเนินการกับคำร้องนี้",
        });
    }
}
function assertDraftIsActive(requestData) {
    if (requestData.status !== "draft") {
        throw new http_error_1.HttpError({
            status: 409,
            code: "CONFLICT",
            message: "คำร้องนี้ไม่ได้อยู่ในสถานะรออัปโหลด",
        });
    }
    const draftExpiresAt = getTimestamp(requestData.draftExpiresAt);
    if (!draftExpiresAt ||
        draftExpiresAt.toMillis() <= Date.now()) {
        throw new http_error_1.HttpError({
            status: 409,
            code: "CONFLICT",
            message: "คำร้องหมดเวลาอัปโหลดแล้ว กรุณาเริ่มทำรายการใหม่",
        });
    }
}
function isStorageNotFoundError(error) {
    if (!isRecord(error)) {
        return false;
    }
    return (error.code === 404 ||
        error.code === "404");
}
async function verifyUploadedFile(target) {
    const file = firebase_admin_1.adminStorage
        .bucket()
        .file(target.storagePath);
    try {
        const [metadata] = await file.getMetadata();
        const uploadedSize = Number(metadata.size);
        if (!Number.isFinite(uploadedSize) ||
            uploadedSize !== target.size ||
            metadata.contentType !==
                target.contentType) {
            throw new http_error_1.HttpError({
                status: 409,
                code: "UPLOAD_INCOMPLETE",
                message: `ข้อมูลไฟล์ ${target.originalName} ` +
                    "ไม่ตรงกับข้อมูลที่แจ้งไว้",
            });
        }
    }
    catch (error) {
        if (error instanceof http_error_1.HttpError) {
            throw error;
        }
        if (isStorageNotFoundError(error)) {
            throw new http_error_1.HttpError({
                status: 409,
                code: "UPLOAD_INCOMPLETE",
                message: `ยังอัปโหลดไฟล์ ` +
                    `${target.originalName} ไม่สำเร็จ`,
            });
        }
        throw error;
    }
}
async function verifyAllUploadedFiles(targets) {
    await Promise.all(targets.map(verifyUploadedFile));
}
function createStoredAttachment(target) {
    return {
        uploadId: target.id,
        kind: target.kind,
        originalName: target.originalName,
        contentType: target.contentType,
        size: target.size,
        storagePath: target.storagePath,
    };
}
function createAttachments(targets) {
    const idCard = targets.find((target) => target.kind === "id-card");
    const policeReport = targets.find((target) => target.kind === "police-report");
    if (!idCard || !policeReport) {
        throw new Error("Required upload targets are missing");
    }
    return {
        idCard: createStoredAttachment(idCard),
        policeReport: createStoredAttachment(policeReport),
        scene: targets
            .filter((target) => target.kind === "scene")
            .map(createStoredAttachment),
    };
}
function createUploadedTargets(targets, uploadedAt) {
    return targets.map((target) => ({
        ...target,
        status: "uploaded",
        uploadedAt,
    }));
}
function createUploadedAuthorizations(targets, uploadedAt) {
    const authorizations = {};
    for (const target of targets) {
        const fileName = target.storagePath
            .split("/")
            .at(-1);
        if (!fileName) {
            throw new Error("Unable to determine upload file name");
        }
        authorizations[fileName] = {
            ...target,
            status: "uploaded",
            uploadedAt,
        };
    }
    return authorizations;
}
function createExistingResult(requestId, requestData) {
    const trackingId = requestData.trackingId;
    if (typeof trackingId !== "string") {
        throw new Error("Request tracking ID is missing");
    }
    const submittedAt = getTimestamp(requestData.submittedAt) ??
        getTimestamp(requestData.updatedAt) ??
        firestore_1.Timestamp.now();
    return {
        requestId,
        trackingId,
        status: "pending",
        submittedAt: submittedAt.toDate().toISOString(),
    };
}
async function finalizeDraftRequest(input, user) {
    const requestRef = firebase_admin_1.adminDb
        .collection(REQUEST_COLLECTION)
        .doc(input.requestId);
    const initialSnapshot = await requestRef.get();
    if (!initialSnapshot.exists) {
        throw new http_error_1.HttpError({
            status: 404,
            code: "NOT_FOUND",
            message: "ไม่พบคำร้องที่ต้องการ",
        });
    }
    const initialData = initialSnapshot.data();
    if (!initialData) {
        throw new Error("Request document has no data");
    }
    assertRequestOwner(initialData, user);
    if (initialData.status === "pending") {
        return createExistingResult(input.requestId, initialData);
    }
    assertDraftIsActive(initialData);
    const uploadTargets = getUploadTargets(input.requestId, initialData);
    await verifyAllUploadedFiles(uploadTargets);
    const transactionResult = await firebase_admin_1.adminDb.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(requestRef);
        if (!currentSnapshot.exists) {
            throw new http_error_1.HttpError({
                status: 404,
                code: "NOT_FOUND",
                message: "ไม่พบคำร้องที่ต้องการ",
            });
        }
        const currentData = currentSnapshot.data();
        if (!currentData) {
            throw new Error("Request document has no data");
        }
        assertRequestOwner(currentData, user);
        if (currentData.status === "pending") {
            return createExistingResult(input.requestId, currentData);
        }
        assertDraftIsActive(currentData);
        const currentTargets = getUploadTargets(input.requestId, currentData);
        const submittedAt = firestore_1.Timestamp.now();
        const trackingId = currentData.trackingId;
        if (typeof trackingId !== "string") {
            throw new Error("Request tracking ID is missing");
        }
        const trackingIndexRef = firebase_admin_1.adminDb
            .collection(TRACKING_INDEX_COLLECTION)
            .doc(trackingId);
        transaction.update(requestRef, {
            status: "pending",
            uploads: createUploadedTargets(currentTargets, submittedAt),
            uploadAuthorizations: createUploadedAuthorizations(currentTargets, submittedAt),
            attachments: createAttachments(currentTargets),
            statusHistory: [
                {
                    status: "pending",
                    timestamp: submittedAt,
                    note: "ได้รับคำร้องและไฟล์แนบครบถ้วนแล้ว",
                },
            ],
            submittedAt,
            updatedAt: submittedAt,
        });
        transaction.set(trackingIndexRef, {
            requestId: input.requestId,
            status: "pending",
            submittedAt,
            updatedAt: submittedAt,
        }, {
            merge: true,
        });
        return {
            requestId: input.requestId,
            trackingId,
            status: "pending",
            submittedAt: submittedAt
                .toDate()
                .toISOString(),
        };
    });
    return transactionResult;
}
//# sourceMappingURL=finalize-request-service.js.map