"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processNotificationOutbox = void 0;
const firebase_functions_1 = require("firebase-functions");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const firebase_admin_1 = require("../lib/firebase-admin");
const line_notification_service_1 = require("../services/line-notification-service");
const MAX_ATTEMPTS = 5;
const lineChannelAccessToken = (0, params_1.defineSecret)("LINE_CHANNEL_ACCESS_TOKEN");
const lineAdminUserId = (0, params_1.defineSecret)("LINE_ADMIN_USER_ID");
const lineNotificationTargetId = (0, params_1.defineSecret)("LINE_NOTIFICATION_TARGET_ID");
function isRecord(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value));
}
function getString(value, maximumLength) {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value
        .trim()
        .slice(0, maximumLength);
    return normalized || null;
}
function getAttempts(value) {
    if (typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < 0) {
        return 0;
    }
    return value;
}
function getTimestampIso(value) {
    if (value instanceof firestore_2.Timestamp) {
        return value.toDate().toISOString();
    }
    return getString(value, 40);
}
function isUuid(value) {
    return (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i).test(value);
}
function parseNotificationJob(data, attempt) {
    const requestId = getString(data.requestId, 128);
    const trackingId = getString(data.trackingId, 128);
    const eventType = getString(data.eventType, 50);
    const eventDate = getString(data.eventDate, 20);
    const eventTimeStart = getString(data.eventTimeStart, 10);
    const eventTimeEnd = getString(data.eventTimeEnd, 10);
    const location = getString(data.location, 300);
    const submittedAt = getTimestampIso(data.submittedAt ??
        data.createdAt);
    const retryKey = getString(data.retryKey, 64);
    if (!requestId ||
        !trackingId ||
        !eventType ||
        !eventDate ||
        !eventTimeStart ||
        !eventTimeEnd ||
        !location ||
        !submittedAt ||
        !retryKey ||
        !isUuid(retryKey)) {
        return null;
    }
    return {
        requestId,
        trackingId,
        eventType,
        eventDate,
        eventTimeStart,
        eventTimeEnd,
        location,
        submittedAt,
        retryKey,
        attempt,
    };
}
async function claimNotificationJob(reference) {
    return firebase_admin_1.adminDb.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
            return null;
        }
        const data = snapshot.data();
        if (!isRecord(data)) {
            return null;
        }
        const status = getString(data.status, 30);
        if (status === "sent" ||
            status === "dead_letter") {
            return null;
        }
        const previousAttempts = getAttempts(data.attempts);
        if (previousAttempts >=
            MAX_ATTEMPTS) {
            transaction.update(reference, {
                status: "dead_letter",
                updatedAt: firestore_2.Timestamp.now(),
            });
            return null;
        }
        const attempt = previousAttempts + 1;
        const parsedJob = parseNotificationJob(data, attempt);
        if (!parsedJob) {
            transaction.update(reference, {
                status: "dead_letter",
                attempts: attempt,
                lastError: {
                    code: "INVALID_JOB",
                    status: null,
                    message: "Notification job payload is invalid",
                    lineRequestId: null,
                    occurredAt: firestore_2.Timestamp.now(),
                },
                updatedAt: firestore_2.Timestamp.now(),
            });
            return null;
        }
        transaction.update(reference, {
            status: "processing",
            attempts: attempt,
            lastAttemptAt: firestore_2.Timestamp.now(),
            updatedAt: firestore_2.Timestamp.now(),
        });
        return parsedJob;
    });
}
function createStoredError(error) {
    if (error instanceof
        line_notification_service_1.LineMessagingApiError) {
        return {
            code: "LINE_API_ERROR",
            status: error.status,
            message: error.message
                .trim()
                .slice(0, 300),
            lineRequestId: error.lineRequestId,
            occurredAt: firestore_2.Timestamp.now(),
        };
    }
    if (error instanceof Error) {
        const isTimeout = error.name ===
            "AbortError";
        const isMissingSecret = error.message.includes("secret is missing");
        return {
            code: isTimeout
                ? "TIMEOUT"
                : isMissingSecret
                    ? "CONFIGURATION_ERROR"
                    : "NETWORK_OR_UNKNOWN_ERROR",
            status: null,
            message: isMissingSecret
                ? "LINE notification secret is missing"
                : error.message
                    .trim()
                    .slice(0, 300),
            lineRequestId: null,
            occurredAt: firestore_2.Timestamp.now(),
        };
    }
    return {
        code: "UNKNOWN_ERROR",
        status: null,
        message: "Unknown notification error",
        lineRequestId: null,
        occurredAt: firestore_2.Timestamp.now(),
    };
}
function shouldRetry(error) {
    if (error instanceof
        line_notification_service_1.LineMessagingApiError) {
        return (error.status === 429 ||
            error.status >= 500);
    }
    if (error instanceof Error &&
        error.message.includes("secret is missing")) {
        return false;
    }
    // Network error หรือ Timeout
    return true;
}
exports.processNotificationOutbox = (0, firestore_1.onDocumentCreated)({
    document: "notification_outbox/{jobId}",
    region: "asia-southeast1",
    memory: "256MiB",
    timeoutSeconds: 30,
    minInstances: 0,
    maxInstances: 5,
    concurrency: 10,
    retry: true,
    secrets: [
        lineChannelAccessToken,
        lineAdminUserId,
        lineNotificationTargetId,
    ],
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        firebase_functions_1.logger.warn("Notification event has no snapshot", {
            jobId: event.params.jobId,
        });
        return;
    }
    const reference = snapshot.ref;
    const job = await claimNotificationJob(reference);
    if (!job) {
        return;
    }
    try {
        const result = await (0, line_notification_service_1.sendLineNewRequestNotification)({
            trackingId: job.trackingId,
            requestId: job.requestId,
            eventType: job.eventType,
            eventDate: job.eventDate,
            eventTimeStart: job.eventTimeStart,
            eventTimeEnd: job.eventTimeEnd,
            location: job.location,
            submittedAt: job.submittedAt,
            retryKey: job.retryKey,
        });
        await reference.update({
            status: "sent",
            sentAt: firestore_2.Timestamp.now(),
            lineRequestId: result.lineRequestId,
            lastError: firestore_2.FieldValue.delete(),
            updatedAt: firestore_2.Timestamp.now(),
        });
        firebase_functions_1.logger.info("LINE notification sent", {
            jobId: event.params.jobId,
            requestId: job.requestId,
            attempt: job.attempt,
        });
    }
    catch (error) {
        const storedError = createStoredError(error);
        const retryAllowed = shouldRetry(error) &&
            job.attempt <
                MAX_ATTEMPTS;
        await reference.update({
            status: retryAllowed
                ? "failed"
                : "dead_letter",
            lastError: storedError,
            failedAt: firestore_2.Timestamp.now(),
            updatedAt: firestore_2.Timestamp.now(),
        });
        firebase_functions_1.logger.warn("LINE notification failed", {
            jobId: event.params.jobId,
            requestId: job.requestId,
            attempt: job.attempt,
            errorCode: storedError.code,
            status: storedError.status,
            willRetry: retryAllowed,
        });
        if (retryAllowed) {
            throw error;
        }
    }
});
//# sourceMappingURL=process-notification-outbox.js.map