"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackRequestStatus = trackRequestStatus;
const node_crypto_1 = require("node:crypto");
const firestore_1 = require("firebase-admin/firestore");
const firebase_admin_1 = require("../lib/firebase-admin");
const http_error_1 = require("../lib/http-error");
const tracking_1 = require("../lib/tracking");
const track_request_1 = require("../schemas/track-request");
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
    const normalized = value
        .trim()
        .slice(0, maximumLength);
    return normalized || null;
}
function timestampToISOString(value) {
    if (value instanceof firestore_1.Timestamp) {
        return value
            .toDate()
            .toISOString();
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime())
            ? null
            : value.toISOString();
    }
    return null;
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
        message: "ไม่พบคำร้อง หรือข้อมูลยืนยันไม่ถูกต้อง",
    });
}
function createTrackingResult(trackingId, requestData) {
    const status = getOptionalString(requestData.status, 50);
    if (!status ||
        status === "draft") {
        throwTrackingNotFound();
    }
    return {
        trackingId,
        status,
        eventType: getOptionalString(requestData.eventType, 50),
        eventDate: getOptionalString(requestData.eventDate, 20),
        eventTimeStart: getOptionalString(requestData.eventTimeStart, 10),
        eventTimeEnd: getOptionalString(requestData.eventTimeEnd, 10),
        location: getOptionalString(requestData.location, 300),
        deliveryMethod: getOptionalString(requestData.deliveryMethod, 30),
        adminNote: getOptionalString(requestData.adminNote, 2000),
        createdAt: timestampToISOString(requestData.createdAt),
        submittedAt: timestampToISOString(requestData.submittedAt),
        updatedAt: timestampToISOString(requestData.updatedAt),
        statusHistory: createPublicStatusHistory(requestData.statusHistory),
    };
}
function constantTimeEqual(first, second) {
    const firstBuffer = Buffer.from(first, "utf8");
    const secondBuffer = Buffer.from(second, "utf8");
    if (firstBuffer.length !==
        secondBuffer.length) {
        return false;
    }
    return (0, node_crypto_1.timingSafeEqual)(firstBuffer, secondBuffer);
}
function getPhoneLastFour(value) {
    if (typeof value !== "string") {
        return null;
    }
    const digits = value.replace(/\D/g, "");
    if (digits.length < 4) {
        return null;
    }
    return digits.slice(-4);
}
function normalizeStoredDate(value) {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim();
    const yearFirstMatch = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (yearFirstMatch) {
        let year = Number(yearFirstMatch[1]);
        const month = Number(yearFirstMatch[2]);
        const day = Number(yearFirstMatch[3]);
        if (year > 2400) {
            year -= 543;
        }
        return (`${String(year).padStart(4, "0")}-` +
            `${String(month).padStart(2, "0")}-` +
            String(day).padStart(2, "0"));
    }
    const dayFirstMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dayFirstMatch) {
        const day = Number(dayFirstMatch[1]);
        const month = Number(dayFirstMatch[2]);
        let year = Number(dayFirstMatch[3]);
        if (year > 2400) {
            year -= 543;
        }
        return (`${String(year).padStart(4, "0")}-` +
            `${String(month).padStart(2, "0")}-` +
            String(day).padStart(2, "0"));
    }
    return null;
}
async function trackSecureRequest(input) {
    const parsedToken = (0, tracking_1.parseTrackingToken)(input.trackingToken);
    const trackingIndexSnapshot = await firebase_admin_1.adminDb
        .collection(TRACKING_INDEX_COLLECTION)
        .doc(parsedToken.trackingId)
        .get();
    if (!trackingIndexSnapshot.exists) {
        throwTrackingNotFound();
    }
    const requestId = trackingIndexSnapshot.get("requestId");
    if (typeof requestId !==
        "string" ||
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
    return createTrackingResult(parsedToken.trackingId, requestData);
}
async function trackLegacyRequest(input) {
    const requestSnapshot = await firebase_admin_1.adminDb
        .collection(REQUEST_COLLECTION)
        .where("trackingId", "==", input.trackingId)
        .limit(2)
        .get();
    /**
     * ไม่คืนข้อมูลหากไม่พบ
     * หรือพบ Tracking ID ซ้ำ
     */
    if (requestSnapshot.size !== 1) {
        throwTrackingNotFound();
    }
    const document = requestSnapshot.docs[0];
    const requestData = document.data();
    /**
     * ห้ามใช้ Legacy Verification
     * กับคำร้อง Secure V2 โดยเด็ดขาด
     */
    const schemaVersion = requestData.schemaVersion;
    const hasSecureSecret = typeof requestData
        .trackingSecretHash ===
        "string";
    if ((typeof schemaVersion ===
        "number" &&
        schemaVersion >= 2) ||
        hasSecureSecret) {
        throwTrackingNotFound();
    }
    const storedPhoneLastFour = getPhoneLastFour(requestData.phone);
    const storedEventDate = normalizeStoredDate(requestData.eventDate);
    if (!storedPhoneLastFour ||
        !storedEventDate) {
        throwTrackingNotFound();
    }
    const phoneMatches = constantTimeEqual(storedPhoneLastFour, input.phoneLast4);
    const dateMatches = constantTimeEqual(storedEventDate, input.eventDate);
    if (!phoneMatches ||
        !dateMatches) {
        throwTrackingNotFound();
    }
    return createTrackingResult(input.trackingId, requestData);
}
async function trackRequestStatus(input) {
    if ((0, track_request_1.isLegacyTrackRequestInput)(input)) {
        return trackLegacyRequest(input);
    }
    return trackSecureRequest(input);
}
//# sourceMappingURL=tracking-service.js.map