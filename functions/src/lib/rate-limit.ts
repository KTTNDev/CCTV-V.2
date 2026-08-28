import { createHmac } from "node:crypto";

import { Timestamp } from "firebase-admin/firestore";

import { adminDb } from "./firebase-admin";
import { HttpError } from "./http-error";

const RATE_LIMIT_COLLECTION =
  "_system_rate_limits";

interface RateLimitRequest {
  ip?: string;
  get(name: string): string | undefined;
}

export interface RateLimitOptions {
  scope: string;
  identifier: string;
  maxAttempts: number;
  windowMs: number;
}

export interface RateLimitResult {
  remaining: number;
  resetAt: Date;
}

function getRateLimitHashKey(): string {
  const configuredKey =
    process.env.RATE_LIMIT_HASH_KEY;

  if (configuredKey) {
    return configuredKey;
  }

  if (process.env.FUNCTIONS_EMULATOR === "true") {
    return "local-emulator-rate-limit-key";
  }

  throw new Error(
    "RATE_LIMIT_HASH_KEY secret is missing",
  );
}

function createPrivateHash(
  value: string,
): string {
  return createHmac(
    "sha256",
    getRateLimitHashKey(),
  )
    .update(value, "utf8")
    .digest("hex");
}

function normalizeScope(scope: string): string {
  const normalized = scope
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 50);

  if (!normalized) {
    throw new Error(
      "Rate limit scope must not be empty",
    );
  }

  return normalized;
}

export function createClientIdentifier(
  request: RateLimitRequest,
  uid?: string,
): string {
  const forwardedFor = request
    .get("X-Forwarded-For")
    ?.split(",")[0]
    ?.trim();

  const clientAddress =
    request.ip ||
    forwardedFor ||
    "unknown-address";

  return `${uid || "guest"}:${clientAddress}`;
}

export async function enforceRateLimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const {
    identifier,
    maxAttempts,
    windowMs,
  } = options;

  if (
    !Number.isInteger(maxAttempts) ||
    maxAttempts <= 0
  ) {
    throw new Error(
      "maxAttempts must be a positive integer",
    );
  }

  if (
    !Number.isInteger(windowMs) ||
    windowMs < 1_000
  ) {
    throw new Error(
      "windowMs must be at least 1000 milliseconds",
    );
  }

  const scope = normalizeScope(options.scope);
  const now = Date.now();

  const windowStart =
    Math.floor(now / windowMs) * windowMs;

  const resetAtMilliseconds =
    windowStart + windowMs;

  const expiresAtMilliseconds =
    resetAtMilliseconds + 24 * 60 * 60 * 1000;

  const identifierHash = createPrivateHash(
    `${scope}:${identifier}`,
  );

  const documentId = createPrivateHash(
    `${scope}:${identifier}:${windowStart}`,
  );

  const rateLimitRef = adminDb
    .collection(RATE_LIMIT_COLLECTION)
    .doc(documentId);

  const nextCount = await adminDb.runTransaction(
    async (transaction) => {
      const snapshot = await transaction.get(
        rateLimitRef,
      );

      const storedCount = snapshot.exists
        ? snapshot.get("count")
        : 0;

      const currentCount =
        typeof storedCount === "number"
          ? storedCount
          : 0;

      if (currentCount >= maxAttempts) {
        throw new HttpError({
          status: 429,
          code: "RATE_LIMITED",
          message:
            "ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
        });
      }

      const updatedCount = currentCount + 1;

      transaction.set(
        rateLimitRef,
        {
          scope,
          identifierHash,
          count: updatedCount,
          windowStartedAt:
            Timestamp.fromMillis(windowStart),
          resetAt: Timestamp.fromMillis(
            resetAtMilliseconds,
          ),
          expiresAt: Timestamp.fromMillis(
            expiresAtMilliseconds,
          ),
          updatedAt: Timestamp.now(),
        },
        {
          merge: true,
        },
      );

      return updatedCount;
    },
  );

  return {
    remaining: Math.max(
      0,
      maxAttempts - nextCount,
    ),
    resetAt: new Date(resetAtMilliseconds),
  };
}