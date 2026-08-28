"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClientIdentifier = createClientIdentifier;
exports.enforceRateLimit = enforceRateLimit;
const node_crypto_1 = require("node:crypto");
const firestore_1 = require("firebase-admin/firestore");
const firebase_admin_1 = require("./firebase-admin");
const http_error_1 = require("./http-error");
const RATE_LIMIT_COLLECTION = "_system_rate_limits";
function getRateLimitHashKey() {
    const configuredKey = process.env.RATE_LIMIT_HASH_KEY;
    if (configuredKey) {
        return configuredKey;
    }
    if (process.env.FUNCTIONS_EMULATOR === "true") {
        return "local-emulator-rate-limit-key";
    }
    throw new Error("RATE_LIMIT_HASH_KEY secret is missing");
}
function createPrivateHash(value) {
    return (0, node_crypto_1.createHmac)("sha256", getRateLimitHashKey())
        .update(value, "utf8")
        .digest("hex");
}
function normalizeScope(scope) {
    const normalized = scope
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_")
        .slice(0, 50);
    if (!normalized) {
        throw new Error("Rate limit scope must not be empty");
    }
    return normalized;
}
function createClientIdentifier(request, uid) {
    const directAddress = request.ip?.trim();
    const forwardedAddress = request
        .get("X-Forwarded-For")
        ?.split(",")[0]
        ?.trim();
    const clientAddress = directAddress ||
        forwardedAddress ||
        "unknown-address";
    const normalizedUid = uid?.trim() || "guest";
    return (`${normalizedUid}:` +
        clientAddress);
}
async function enforceRateLimit(options) {
    const { identifier, maxAttempts, windowMs, } = options;
    if (!Number.isInteger(maxAttempts) ||
        maxAttempts <= 0) {
        throw new Error("maxAttempts must be a positive integer");
    }
    if (!Number.isInteger(windowMs) ||
        windowMs < 1_000) {
        throw new Error("windowMs must be at least 1000 milliseconds");
    }
    const scope = normalizeScope(options.scope);
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetAtMilliseconds = windowStart + windowMs;
    const expiresAtMilliseconds = resetAtMilliseconds + 24 * 60 * 60 * 1000;
    const identifierHash = createPrivateHash(`${scope}:${identifier}`);
    const documentId = createPrivateHash(`${scope}:${identifier}:${windowStart}`);
    const rateLimitRef = firebase_admin_1.adminDb
        .collection(RATE_LIMIT_COLLECTION)
        .doc(documentId);
    const nextCount = await firebase_admin_1.adminDb.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(rateLimitRef);
        const storedCount = snapshot.exists
            ? snapshot.get("count")
            : 0;
        const currentCount = typeof storedCount === "number"
            ? storedCount
            : 0;
        if (currentCount >= maxAttempts) {
            throw new http_error_1.HttpError({
                status: 429,
                code: "RATE_LIMITED",
                message: "ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
            });
        }
        const updatedCount = currentCount + 1;
        transaction.set(rateLimitRef, {
            scope,
            identifierHash,
            count: updatedCount,
            windowStartedAt: firestore_1.Timestamp.fromMillis(windowStart),
            resetAt: firestore_1.Timestamp.fromMillis(resetAtMilliseconds),
            expiresAt: firestore_1.Timestamp.fromMillis(expiresAtMilliseconds),
            updatedAt: firestore_1.Timestamp.now(),
        }, {
            merge: true,
        });
        return updatedCount;
    });
    return {
        remaining: Math.max(0, maxAttempts - nextCount),
        resetAt: new Date(resetAtMilliseconds),
    };
}
//# sourceMappingURL=rate-limit.js.map