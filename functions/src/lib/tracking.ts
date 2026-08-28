import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

import { HttpError } from "./http-error";

const TRACKING_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const TRACKING_SUFFIX_LENGTH = 6;
const TRACKING_SECRET_BYTES = 32;

const TRACKING_ID_PATTERN =
  /^RW-\d{8}-[A-HJ-NP-Z2-9]{6}$/;

export interface TrackingCredentials {
  trackingId: string;
  trackingSecret: string;
  trackingToken: string;
  trackingSecretHash: string;
}

export interface ParsedTrackingToken {
  trackingId: string;
  trackingSecret: string;
}

function createBangkokDateSegment(
  date: Date,
): string {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(date);

  const year = parts.find(
    (part) => part.type === "year",
  )?.value;

  const month = parts.find(
    (part) => part.type === "month",
  )?.value;

  const day = parts.find(
    (part) => part.type === "day",
  )?.value;

  if (!year || !month || !day) {
    throw new Error(
      "Unable to generate Bangkok date segment",
    );
  }

  return `${year}${month}${day}`;
}

function createTrackingSuffix(): string {
  let result = "";

  for (
    let index = 0;
    index < TRACKING_SUFFIX_LENGTH;
    index += 1
  ) {
    result += TRACKING_ALPHABET[
      randomInt(0, TRACKING_ALPHABET.length)
    ];
  }

  return result;
}

export function hashTrackingSecret(
  trackingSecret: string,
): string {
  return createHash("sha256")
    .update(trackingSecret, "utf8")
    .digest("hex");
}

export function generateTrackingCredentials(
  date = new Date(),
): TrackingCredentials {
  const dateSegment =
    createBangkokDateSegment(date);

  const suffix = createTrackingSuffix();

  const trackingId =
    `RW-${dateSegment}-${suffix}`;

  const trackingSecret = randomBytes(
    TRACKING_SECRET_BYTES,
  ).toString("base64url");

  const trackingToken =
    `${trackingId}.${trackingSecret}`;

  return {
    trackingId,
    trackingSecret,
    trackingToken,
    trackingSecretHash:
      hashTrackingSecret(trackingSecret),
  };
}

export function parseTrackingToken(
  value: unknown,
): ParsedTrackingToken {
  if (typeof value !== "string") {
    throw new HttpError({
      status: 400,
      code: "INVALID_INPUT",
      message: "กรุณากรอกรหัสติดตามคำร้อง",
      fields: {
        trackingToken: [
          "รหัสติดตามคำร้องไม่ถูกต้อง",
        ],
      },
    });
  }

  const trimmedValue = value.trim();

  if (
    trimmedValue.length < 40 ||
    trimmedValue.length > 120
  ) {
    throwInvalidTrackingToken();
  }

  const separatorIndex =
    trimmedValue.indexOf(".");

  if (
    separatorIndex <= 0 ||
    separatorIndex !==
      trimmedValue.lastIndexOf(".")
  ) {
    throwInvalidTrackingToken();
  }

  const trackingId = trimmedValue
    .slice(0, separatorIndex)
    .toUpperCase();

  const trackingSecret = trimmedValue.slice(
    separatorIndex + 1,
  );

  if (
    !TRACKING_ID_PATTERN.test(trackingId) ||
    !/^[A-Za-z0-9_-]{40,60}$/.test(
      trackingSecret,
    )
  ) {
    throwInvalidTrackingToken();
  }

  return {
    trackingId,
    trackingSecret,
  };
}

export function verifyTrackingSecret(
  trackingSecret: string,
  expectedHash: string,
): boolean {
  if (!/^[a-f0-9]{64}$/i.test(expectedHash)) {
    return false;
  }

  const actualHashBuffer = Buffer.from(
    hashTrackingSecret(trackingSecret),
    "hex",
  );

  const expectedHashBuffer = Buffer.from(
    expectedHash,
    "hex",
  );

  if (
    actualHashBuffer.length !==
    expectedHashBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    actualHashBuffer,
    expectedHashBuffer,
  );
}

function throwInvalidTrackingToken(): never {
  throw new HttpError({
    status: 400,
    code: "INVALID_INPUT",
    message: "รูปแบบรหัสติดตามคำร้องไม่ถูกต้อง",
    fields: {
      trackingToken: [
        "กรุณาตรวจสอบรหัสติดตามแล้วลองใหม่",
      ],
    },
  });
}