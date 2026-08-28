"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDraftRequest = createDraftRequest;
const node_crypto_1 = require("node:crypto");
const firestore_1 = require("firebase-admin/firestore");
const firebase_admin_1 = require("../lib/firebase-admin");
const tracking_1 = require("../lib/tracking");
const REQUEST_COLLECTION = "cctv_requests";
const TRACKING_INDEX_COLLECTION = "tracking_index";
const DRAFT_LIFETIME_MS = 60 * 60 * 1000;
const TRACKING_COLLISION_RETRIES = 5;
const PRIVACY_NOTICE_VERSION = "2026-08-27";
const EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
};
class TrackingIdCollisionError extends Error {
    constructor() {
        super("Tracking ID collision");
        this.name = "TrackingIdCollisionError";
    }
}
function sanitizeOriginalFileName(value) {
    return value
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .replace(/[\\/]/g, "_")
        .trim()
        .slice(0, 150);
}
function createUploadTarget(requestId, kind, metadata) {
    const id = (0, node_crypto_1.randomUUID)();
    const extension = EXTENSION_BY_CONTENT_TYPE[metadata.contentType];
    return {
        id,
        kind,
        originalName: sanitizeOriginalFileName(metadata.name),
        contentType: metadata.contentType,
        size: metadata.size,
        storagePath: `requests/${requestId}/uploads/` +
            `${kind}/${id}.${extension}`,
    };
}
function createUploadTargets(requestId, input) {
    return [
        createUploadTarget(requestId, "id-card", input.expectedFiles.idCard),
        createUploadTarget(requestId, "police-report", input.expectedFiles.policeReport),
        ...input.expectedFiles.scene.map((metadata) => createUploadTarget(requestId, "scene", metadata)),
    ];
}
function createStoredUploadTargets(targets) {
    return targets.map((target) => ({
        ...target,
        status: "pending",
    }));
}
async function createDraftRequest(input, user) {
    const requestRef = firebase_admin_1.adminDb
        .collection(REQUEST_COLLECTION)
        .doc();
    const uploadTargets = createUploadTargets(requestRef.id, input);
    const createdAt = firestore_1.Timestamp.now();
    const draftExpiresAt = firestore_1.Timestamp.fromMillis(createdAt.toMillis() + DRAFT_LIFETIME_MS);
    for (let attempt = 0; attempt < TRACKING_COLLISION_RETRIES; attempt += 1) {
        const tracking = (0, tracking_1.generateTrackingCredentials)();
        const trackingIndexRef = firebase_admin_1.adminDb
            .collection(TRACKING_INDEX_COLLECTION)
            .doc(tracking.trackingId);
        try {
            await firebase_admin_1.adminDb.runTransaction(async (transaction) => {
                const trackingSnapshot = await transaction.get(trackingIndexRef);
                if (trackingSnapshot.exists) {
                    throw new TrackingIdCollisionError();
                }
                transaction.set(requestRef, {
                    schemaVersion: 2,
                    ownerUid: user.uid,
                    sourceAuthProvider: user.token.firebase
                        ?.sign_in_provider ??
                        "unknown",
                    status: "draft",
                    trackingId: tracking.trackingId,
                    trackingSecretHash: tracking.trackingSecretHash,
                    name: input.name,
                    applicantType: input.applicantType,
                    nationalId: input.nationalId || null,
                    passportNumber: input.passportNumber || null,
                    phone: input.phone,
                    email: input.email || null,
                    eventDate: input.eventDate,
                    eventTimeStart: input.eventTimeStart,
                    eventTimeEnd: input.eventTimeEnd,
                    eventType: input.eventType,
                    accidentSubtype: input.accidentSubtype ?? null,
                    isForeignerInvolved: input.isForeignerInvolved ??
                        null,
                    location: input.location,
                    latitude: input.latitude,
                    longitude: input.longitude,
                    description: input.description,
                    deliveryMethod: input.deliveryMethod,
                    privacyConsent: {
                        accepted: true,
                        version: PRIVACY_NOTICE_VERSION,
                        acceptedAt: createdAt,
                    },
                    uploads: createStoredUploadTargets(uploadTargets),
                    uploadAuthorizations: createUploadAuthorizations(uploadTargets),
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
                transaction.set(trackingIndexRef, {
                    requestId: requestRef.id,
                    createdAt,
                    draftExpiresAt,
                });
            });
            return {
                requestId: requestRef.id,
                trackingId: tracking.trackingId,
                trackingToken: tracking.trackingToken,
                draftExpiresAt: draftExpiresAt
                    .toDate()
                    .toISOString(),
                uploadTargets,
            };
        }
        catch (error) {
            if (error instanceof
                TrackingIdCollisionError) {
                continue;
            }
            throw error;
        }
    }
    throw new Error("Unable to allocate a unique tracking ID");
}
function createUploadAuthorizations(targets) {
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
            status: "pending",
        };
    }
    return authorizations;
}
//# sourceMappingURL=request-service.js.map