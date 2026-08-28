"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackRequestStatus = trackRequestStatus;
const firestore_1 = require("firebase-admin/firestore");
const firebase_admin_1 = require("../lib/firebase-admin");
const http_error_1 = require("../lib/http-error");
const tracking_1 = require("../lib/tracking");
const REQUEST_COLLECTION = "cctv_requests";
const TRACKING_INDEX_COLLECTION = "tracking_index";
function isRecord(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value));
}
function getOptionalString(value, maximumLength) {
    if (typeof value !== "string") {
        return null;
    }
    const trimmedValue = value
        .trim()
        .slice(0, maximumLength);
    return trimmedValue || null;
}
function timestampToISOString(value) {
    if (!(value instanceof firestore_1.Timestamp)) {
        return null;
    }
    return value.toDate().toISOString();
}
function createPublicStatusHistory(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const result = [];
    for (const item of value) {
        if (!isRecord(item)) {
            continue;
        }
        const status = getOptionalString(item.status, 50);
        const note = getOptionalString(item.note, 2000);
        if (!status || !note) {
            continue;
        }
        result.push({
            status,
            note,
            timestamp: timestampToISOString(item.timestamp),
        });
    }
    return result;
}
function throwTrackingNotFound() {
    throw new http_error_1.HttpError({
        status: 404,
        code: "NOT_FOUND",
        message: "ไม่พบคำร้อง หรือรหัสติดตามไม่ถูกต้อง",
    });
}
async function trackRequestStatus(input) {
    const parsedToken = (0, tracking_1.parseTrackingToken)(input.trackingToken);
    const trackingIndexSnapshot = await firebase_admin_1.adminDb
        .collection(TRACKING_INDEX_COLLECTION)
        .doc(parsedToken.trackingId)
        .get();
    if (!trackingIndexSnapshot.exists) {
        throwTrackingNotFound();
    }
    const requestId = trackingIndexSnapshot.get("requestId");
    if (typeof requestId !== "string" ||
        !/^[A-Za-z0-9]{20}$/.test(requestId)) {
        throwTrackingNotFound();
    }
    const requestSnapshot = await firebase_admin_1.adminDb
        .collection(REQUEST_COLLECTION)
        .doc(requestId)
        .get();
    if (!requestSnapshot.exists) {
        throwTrackingNotFound();
    }
    const requestData = requestSnapshot.data();
    if (!requestData) {
        throwTrackingNotFound();
    }
    const expectedSecretHash = requestData.trackingSecretHash;
    if (typeof expectedSecretHash !==
        "string" ||
        !(0, tracking_1.verifyTrackingSecret)(parsedToken.trackingSecret, expectedSecretHash)) {
        throwTrackingNotFound();
    }
    if (requestData.trackingId !==
        parsedToken.trackingId) {
        throwTrackingNotFound();
    }
    const status = getOptionalString(requestData.status, 50);
    if (!status ||
        status === "draft") {
        throwTrackingNotFound();
    }
    return {
        trackingId: parsedToken.trackingId,
        status,
        eventType: getOptionalString(requestData.eventType, 50),
        eventDate: getOptionalString(requestData.eventDate, 10),
        eventTimeStart: getOptionalString(requestData.eventTimeStart, 5),
        eventTimeEnd: getOptionalString(requestData.eventTimeEnd, 5),
        location: getOptionalString(requestData.location, 300),
        deliveryMethod: getOptionalString(requestData.deliveryMethod, 20),
        adminNote: getOptionalString(requestData.adminNote, 2000),
        createdAt: timestampToISOString(requestData.createdAt),
        submittedAt: timestampToISOString(requestData.submittedAt),
        updatedAt: timestampToISOString(requestData.updatedAt),
        statusHistory: createPublicStatusHistory(requestData.statusHistory),
    };
}
//# sourceMappingURL=tracking-service.js.map