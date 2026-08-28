import {
  Timestamp,
} from "firebase-admin/firestore";

import {
  adminDb,
} from "../lib/firebase-admin";
import type {
  PublicStatsInput,
} from "../schemas/public-stats";

const REQUEST_COLLECTION =
  "cctv_requests";

const ANALYTICS_COLLECTION =
  "site_analytics";

const GLOBAL_ANALYTICS_DOCUMENT =
  "global_stats";

const CACHE_LIFETIME_MS =
  60 * 1000;

const MAX_ACCIDENT_DOCUMENTS =
  500;

const PUBLIC_REQUEST_STATUSES = [
  "pending",
  "processing",
  "verifying",
  "searching",
  "waiting_for_information",
  "completed",
  "rejected",
] as const;

const PENDING_REQUEST_STATUSES = [
  "pending",
  "processing",
  "verifying",
  "searching",
  "waiting_for_information",
] as const;

export interface PublicHotspot {
  lat: number;
  lng: number;
  count: number;
  location: string;
}

export interface PublicStatsResult {
  requests: {
    total: number;
    completed: number;
    pending: number;
    successRate: number;
  };

  visitors: {
    today: number;
    total: number;
  };

  hotspots: PublicHotspot[];

  generatedAt: string;
}

interface CachedRequestStatistics {
  expiresAt: number;

  data: {
    requests:
      PublicStatsResult["requests"];

    hotspots: PublicHotspot[];
  };
}

let cachedRequestStatistics:
  CachedRequestStatistics | null =
    null;

function createBangkokDateId(
  date = new Date(),
): string {
  const dateParts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(date);

  const year = dateParts.find(
    (part) => part.type === "year",
  )?.value;

  const month = dateParts.find(
    (part) => part.type === "month",
  )?.value;

  const day = dateParts.find(
    (part) => part.type === "day",
  )?.value;

  if (!year || !month || !day) {
    throw new Error(
      "Unable to create Bangkok date ID",
    );
  }

  return `${year}-${month}-${day}`;
}

function getStoredNumber(
  value: unknown,
): number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  )
    ? value
    : 0;
}

function roundCoordinate(
  value: number,
): number {
  // ประมาณ 100 เมตร
  // ไม่คืนพิกัดระดับจุดเกิดเหตุจริง
  return Math.round(value * 1000) /
    1000;
}

function isCoordinateInServiceArea(
  latitude: number,
  longitude: number,
): boolean {
  return (
    latitude >= 7.70 &&
    latitude <= 7.90 &&
    longitude >= 98.20 &&
    longitude <= 98.45
  );
}

function createPublicHotspots(
  documents: Array<
    Record<string, unknown>
  >,
): PublicHotspot[] {
  const groupedPoints = new Map<
    string,
    {
      lat: number;
      lng: number;
      count: number;
    }
  >();

  for (const document of documents) {
    if (
      document.eventType !==
      "ACCIDENT"
    ) {
      continue;
    }

    if (
      typeof document.status !==
        "string" ||
      !PUBLIC_REQUEST_STATUSES.includes(
        document.status as
          typeof PUBLIC_REQUEST_STATUSES[number],
      )
    ) {
      continue;
    }

    const latitude =
      document.latitude;

    const longitude =
      document.longitude;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !isCoordinateInServiceArea(
        latitude,
        longitude,
      )
    ) {
      continue;
    }

    const roundedLatitude =
      roundCoordinate(latitude);

    const roundedLongitude =
      roundCoordinate(longitude);

    const pointKey =
      `${roundedLatitude}:` +
      `${roundedLongitude}`;

    const existingPoint =
      groupedPoints.get(pointKey);

    if (existingPoint) {
      existingPoint.count += 1;
      continue;
    }

    groupedPoints.set(pointKey, {
      lat: roundedLatitude,
      lng: roundedLongitude,
      count: 1,
    });
  }

  return Array.from(
    groupedPoints.values(),
  )
    .sort(
      (left, right) =>
        right.count - left.count,
    )
    .slice(0, 100)
    .map((point) => ({
      ...point,
      location:
        point.count > 1
          ? `พบรายงานอุบัติเหตุ ${point.count} รายการในบริเวณนี้`
          : "บริเวณที่เคยมีรายงานอุบัติเหตุ",
    }));
}

async function readRequestStatistics():
Promise<CachedRequestStatistics["data"]> {
  const now = Date.now();

  if (
    cachedRequestStatistics &&
    cachedRequestStatistics.expiresAt >
      now
  ) {
    return cachedRequestStatistics.data;
  }

  const requestCollection =
    adminDb.collection(
      REQUEST_COLLECTION,
    );

  const [
    totalSnapshot,
    completedSnapshot,
    pendingSnapshot,
    accidentSnapshot,
  ] = await Promise.all([
    requestCollection
      .where(
        "status",
        "in",
        [
          ...PUBLIC_REQUEST_STATUSES,
        ],
      )
      .count()
      .get(),

    requestCollection
      .where(
        "status",
        "==",
        "completed",
      )
      .count()
      .get(),

    requestCollection
      .where(
        "status",
        "in",
        [
          ...PENDING_REQUEST_STATUSES,
        ],
      )
      .count()
      .get(),

    requestCollection
      .where(
        "eventType",
        "==",
        "ACCIDENT",
      )
      .limit(
        MAX_ACCIDENT_DOCUMENTS,
      )
      .get(),
  ]);

  const total =
    totalSnapshot.data().count;

  const completed =
    completedSnapshot.data().count;

  const pending =
    pendingSnapshot.data().count;

  const successRate =
    total > 0
      ? Math.round(
          (completed / total) * 100,
        )
      : 0;

  const accidentDocuments =
    accidentSnapshot.docs.map(
      (document) =>
        document.data(),
    );

  const data = {
    requests: {
      total,
      completed,
      pending,
      successRate,
    },

    hotspots:
      createPublicHotspots(
        accidentDocuments,
      ),
  };

  cachedRequestStatistics = {
    expiresAt:
      now + CACHE_LIFETIME_MS,
    data,
  };

  return data;
}

async function readVisitorStatistics(
  recordVisit: boolean,
): Promise<
  PublicStatsResult["visitors"]
> {
  const todayId =
    createBangkokDateId();

  const dailyReference =
    adminDb
      .collection(
        ANALYTICS_COLLECTION,
      )
      .doc(todayId);

  const globalReference =
    adminDb
      .collection(
        ANALYTICS_COLLECTION,
      )
      .doc(
        GLOBAL_ANALYTICS_DOCUMENT,
      );

  if (!recordVisit) {
    const [
      dailySnapshot,
      globalSnapshot,
    ] = await Promise.all([
      dailyReference.get(),
      globalReference.get(),
    ]);

    return {
      today:
        getStoredNumber(
          dailySnapshot.get(
            "visits",
          ),
        ),

      total:
        getStoredNumber(
          globalSnapshot.get(
            "totalVisits",
          ),
        ),
    };
  }

  return adminDb.runTransaction(
    async (transaction) => {
      const dailySnapshot =
        await transaction.get(
          dailyReference,
        );

      const globalSnapshot =
        await transaction.get(
          globalReference,
        );

      const today =
        getStoredNumber(
          dailySnapshot.get(
            "visits",
          ),
        ) + 1;

      const total =
        getStoredNumber(
          globalSnapshot.get(
            "totalVisits",
          ),
        ) + 1;

      const updatedAt =
        Timestamp.now();

      transaction.set(
        dailyReference,
        {
          date: todayId,
          visits: today,
          updatedAt,
        },
        {
          merge: true,
        },
      );

      transaction.set(
        globalReference,
        {
          totalVisits: total,
          updatedAt,
        },
        {
          merge: true,
        },
      );

      return {
        today,
        total,
      };
    },
  );
}

export async function getPublicStats(
  input: PublicStatsInput,
): Promise<PublicStatsResult> {
  const [
    requestStatistics,
    visitorStatistics,
  ] = await Promise.all([
    readRequestStatistics(),

    readVisitorStatistics(
      input.recordVisit,
    ),
  ]);

  return {
    requests:
      requestStatistics.requests,

    visitors:
      visitorStatistics,

    hotspots:
      requestStatistics.hotspots,

    generatedAt:
      new Date().toISOString(),
  };
}