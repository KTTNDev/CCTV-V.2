import {
  logger,
} from "firebase-functions";
import {
  defineSecret,
} from "firebase-functions/params";
import {
  onDocumentCreated,
} from "firebase-functions/v2/firestore";
import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import type {
  DocumentReference,
} from "firebase-admin/firestore";

import { adminDb } from "../lib/firebase-admin";
import {
  LineMessagingApiError,
  sendLineNewRequestNotification,
} from "../services/line-notification-service";

const MAX_ATTEMPTS = 5;

const lineChannelAccessToken =
  defineSecret(
    "LINE_CHANNEL_ACCESS_TOKEN",
  );

const lineAdminUserId =
  defineSecret(
    "LINE_ADMIN_USER_ID",
  );

const lineNotificationTargetId =
  defineSecret(
    "LINE_NOTIFICATION_TARGET_ID",
  );

interface ClaimedNotificationJob {
  requestId: string;
  trackingId: string;
  eventType: string;
  eventDate: string;
  eventTimeStart: string;
  eventTimeEnd: string;
  location: string;
  submittedAt: string;
  retryKey: string;
  attempt: number;
}

interface StoredError {
  code: string;
  status: number | null;
  message: string;
  lineRequestId: string | null;
  occurredAt: Timestamp;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getString(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .slice(0, maximumLength);

  return normalized || null;
}

function getAttempts(
  value: unknown,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    return 0;
  }

  return value;
}

function getTimestampIso(
  value: unknown,
): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return getString(value, 40);
}

function isUuid(
  value: string,
): boolean {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  ).test(value);
}

function parseNotificationJob(
  data: Record<string, unknown>,
  attempt: number,
): ClaimedNotificationJob | null {
  const requestId =
    getString(
      data.requestId,
      128,
    );

  const trackingId =
    getString(
      data.trackingId,
      128,
    );

  const eventType =
    getString(
      data.eventType,
      50,
    );

  const eventDate =
    getString(
      data.eventDate,
      20,
    );

  const eventTimeStart =
    getString(
      data.eventTimeStart,
      10,
    );

  const eventTimeEnd =
    getString(
      data.eventTimeEnd,
      10,
    );

  const location =
    getString(
      data.location,
      300,
    );

  const submittedAt =
    getTimestampIso(
      data.submittedAt ??
        data.createdAt,
    );

  const retryKey =
    getString(
      data.retryKey,
      64,
    );

  if (
    !requestId ||
    !trackingId ||
    !eventType ||
    !eventDate ||
    !eventTimeStart ||
    !eventTimeEnd ||
    !location ||
    !submittedAt ||
    !retryKey ||
    !isUuid(retryKey)
  ) {
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

async function claimNotificationJob(
  reference: DocumentReference,
): Promise<
  ClaimedNotificationJob | null
> {
  return adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          reference,
        );

      if (!snapshot.exists) {
        return null;
      }

      const data =
        snapshot.data();

      if (!isRecord(data)) {
        return null;
      }

      const status =
        getString(
          data.status,
          30,
        );

      if (
        status === "sent" ||
        status === "dead_letter"
      ) {
        return null;
      }

      const previousAttempts =
        getAttempts(
          data.attempts,
        );

      if (
        previousAttempts >=
        MAX_ATTEMPTS
      ) {
        transaction.update(
          reference,
          {
            status:
              "dead_letter",

            updatedAt:
              Timestamp.now(),
          },
        );

        return null;
      }

      const attempt =
        previousAttempts + 1;

      const parsedJob =
        parseNotificationJob(
          data,
          attempt,
        );

      if (!parsedJob) {
        transaction.update(
          reference,
          {
            status:
              "dead_letter",

            attempts:
              attempt,

            lastError: {
              code:
                "INVALID_JOB",

              status: null,

              message:
                "Notification job payload is invalid",

              lineRequestId:
                null,

              occurredAt:
                Timestamp.now(),
            },

            updatedAt:
              Timestamp.now(),
          },
        );

        return null;
      }

      transaction.update(
        reference,
        {
          status:
            "processing",

          attempts:
            attempt,

          lastAttemptAt:
            Timestamp.now(),

          updatedAt:
            Timestamp.now(),
        },
      );

      return parsedJob;
    },
  );
}

function createStoredError(
  error: unknown,
): StoredError {
  if (
    error instanceof
    LineMessagingApiError
  ) {
    return {
      code:
        "LINE_API_ERROR",

      status:
        error.status,

      message:
        error.message
          .trim()
          .slice(0, 300),

      lineRequestId:
        error.lineRequestId,

      occurredAt:
        Timestamp.now(),
    };
  }

  if (
    error instanceof Error
  ) {
    const isTimeout =
      error.name ===
        "AbortError";

    const isMissingSecret =
      error.message.includes(
        "secret is missing",
      );

    return {
      code:
        isTimeout
          ? "TIMEOUT"
          : isMissingSecret
            ? "CONFIGURATION_ERROR"
            : "NETWORK_OR_UNKNOWN_ERROR",

      status: null,

      message:
        isMissingSecret
          ? "LINE notification secret is missing"
          : error.message
              .trim()
              .slice(0, 300),

      lineRequestId:
        null,

      occurredAt:
        Timestamp.now(),
    };
  }

  return {
    code:
      "UNKNOWN_ERROR",

    status: null,

    message:
      "Unknown notification error",

    lineRequestId:
      null,

    occurredAt:
      Timestamp.now(),
  };
}

function shouldRetry(
  error: unknown,
): boolean {
  if (
    error instanceof
    LineMessagingApiError
  ) {
    return (
      error.status === 429 ||
      error.status >= 500
    );
  }

  if (
    error instanceof Error &&
    error.message.includes(
      "secret is missing",
    )
  ) {
    return false;
  }

  // Network error หรือ Timeout
  return true;
}

export const processNotificationOutbox =
  onDocumentCreated(
    {
      document:
        "notification_outbox/{jobId}",

      region:
        "asia-southeast1",

      memory:
        "256MiB",

      timeoutSeconds:
        30,

      minInstances:
        0,

      maxInstances:
        5,

      concurrency:
        10,

      retry:
        true,

      secrets: [
        lineChannelAccessToken,
        lineAdminUserId,
        lineNotificationTargetId,
      ],
    },

    async (event) => {
      const snapshot =
        event.data;

      if (!snapshot) {
        logger.warn(
          "Notification event has no snapshot",
          {
            jobId:
              event.params.jobId,
          },
        );

        return;
      }

      const reference =
        snapshot.ref;

      const job =
        await claimNotificationJob(
          reference,
        );

      if (!job) {
        return;
      }

      try {
        const result =
          await sendLineNewRequestNotification(
            {
              trackingId:
                job.trackingId,

              requestId:
                job.requestId,

              eventType:
                job.eventType,

              eventDate:
                job.eventDate,

              eventTimeStart:
                job.eventTimeStart,

              eventTimeEnd:
                job.eventTimeEnd,

              location:
                job.location,

              submittedAt:
                job.submittedAt,

              retryKey:
                job.retryKey,
            },
          );

        await reference.update({
          status: "sent",

          sentAt:
            Timestamp.now(),

          lineRequestId:
            result.lineRequestId,

          lastError:
            FieldValue.delete(),

          updatedAt:
            Timestamp.now(),
        });

        logger.info(
          "LINE notification sent",
          {
            jobId:
              event.params.jobId,

            requestId:
              job.requestId,

            attempt:
              job.attempt,
          },
        );
      } catch (error) {
        const storedError =
          createStoredError(error);

        const retryAllowed =
          shouldRetry(error) &&
          job.attempt <
            MAX_ATTEMPTS;

        await reference.update({
          status:
            retryAllowed
              ? "failed"
              : "dead_letter",

          lastError:
            storedError,

          failedAt:
            Timestamp.now(),

          updatedAt:
            Timestamp.now(),
        });

        logger.warn(
          "LINE notification failed",
          {
            jobId:
              event.params.jobId,

            requestId:
              job.requestId,

            attempt:
              job.attempt,

            errorCode:
              storedError.code,

            status:
              storedError.status,

            willRetry:
              retryAllowed,
          },
        );

        if (retryAllowed) {
          throw error;
        }
      }
    },
  );
