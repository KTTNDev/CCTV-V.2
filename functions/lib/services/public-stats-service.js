"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicStats = getPublicStats;
const firestore_1 = require("firebase-admin/firestore");
const firebase_admin_1 = require("../lib/firebase-admin");
const REQUEST_COLLECTION = "cctv_requests";
const ANALYTICS_COLLECTION = "site_analytics";
const GLOBAL_ANALYTICS_DOCUMENT = "global_stats";
const CACHE_LIFETIME_MS = 60 * 1000;
const MAX_SPATIAL_DOCUMENTS = 500;
const PUBLIC_REQUEST_STATUSES = [
    "pending",
    "processing",
    "verifying",
    "searching",
    "waiting_for_information",
    "completed",
    "rejected",
];
const PENDING_REQUEST_STATUSES = [
    "pending",
    "processing",
    "verifying",
    "searching",
    "waiting_for_information",
];
let cachedRequestStatistics = null;
function createBangkokDateId(date = new Date()) {
    const dateParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const year = dateParts.find((part) => part.type === "year")?.value;
    const month = dateParts.find((part) => part.type === "month")?.value;
    const day = dateParts.find((part) => part.type === "day")?.value;
    if (!year || !month || !day) {
        throw new Error("Unable to create Bangkok date ID");
    }
    return `${year}-${month}-${day}`;
}
function getStoredNumber(value) {
    return (typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0)
        ? value
        : 0;
}
function roundCoordinate(value) {
    // ประมาณ 100 เมตร
    // ไม่คืนพิกัดระดับจุดเกิดเหตุจริง
    return Math.round(value * 1000) /
        1000;
}
function isCoordinateInServiceArea(latitude, longitude) {
    return (latitude >= 7.70 &&
        latitude <= 7.90 &&
        longitude >= 98.20 &&
        longitude <= 98.45);
}
function createPublicHotspots(documents) {
    const groupedPoints = new Map();
    for (const document of documents) {
        if (typeof document.status !==
            "string" ||
            !PUBLIC_REQUEST_STATUSES.includes(document.status)) {
            continue;
        }
        const latitude = document.latitude;
        const longitude = document.longitude;
        if (typeof latitude !== "number" ||
            typeof longitude !== "number" ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            !isCoordinateInServiceArea(latitude, longitude)) {
            continue;
        }
        const roundedLatitude = roundCoordinate(latitude);
        const roundedLongitude = roundCoordinate(longitude);
        const pointKey = `${roundedLatitude}:` +
            `${roundedLongitude}`;
        const existingPoint = groupedPoints.get(pointKey);
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
    return Array.from(groupedPoints.values())
        .sort((left, right) => right.count - left.count)
        .slice(0, 100)
        .map((point) => ({
        ...point,
        location: point.count > 1
            ? `พบคำร้อง ${point.count} รายการในบริเวณนี้`
            : "บริเวณที่เคยมีคำร้องผ่านระบบ",
    }));
}
async function readRequestStatistics() {
    const now = Date.now();
    if (cachedRequestStatistics &&
        cachedRequestStatistics.expiresAt >
            now) {
        return cachedRequestStatistics.data;
    }
    const requestCollection = firebase_admin_1.adminDb.collection(REQUEST_COLLECTION);
    const [totalSnapshot, completedSnapshot, pendingSnapshot, spatialSnapshot,] = await Promise.all([
        requestCollection
            .where("status", "in", [
            ...PUBLIC_REQUEST_STATUSES,
        ])
            .count()
            .get(),
        requestCollection
            .where("status", "==", "completed")
            .count()
            .get(),
        requestCollection
            .where("status", "in", [
            ...PENDING_REQUEST_STATUSES,
        ])
            .count()
            .get(),
        requestCollection
            .where("status", "in", [
            ...PUBLIC_REQUEST_STATUSES,
        ])
            .limit(MAX_SPATIAL_DOCUMENTS)
            .get(),
    ]);
    const total = totalSnapshot.data().count;
    const completed = completedSnapshot.data().count;
    const pending = pendingSnapshot.data().count;
    const successRate = total > 0
        ? Math.round((completed / total) * 100)
        : 0;
    const spatialDocuments = spatialSnapshot.docs.map((document) => document.data());
    const data = {
        requests: {
            total,
            completed,
            pending,
            successRate,
        },
        hotspots: createPublicHotspots(spatialDocuments),
    };
    cachedRequestStatistics = {
        expiresAt: now + CACHE_LIFETIME_MS,
        data,
    };
    return data;
}
async function readVisitorStatistics(recordVisit) {
    const todayId = createBangkokDateId();
    const dailyReference = firebase_admin_1.adminDb
        .collection(ANALYTICS_COLLECTION)
        .doc(todayId);
    const globalReference = firebase_admin_1.adminDb
        .collection(ANALYTICS_COLLECTION)
        .doc(GLOBAL_ANALYTICS_DOCUMENT);
    if (!recordVisit) {
        const [dailySnapshot, globalSnapshot,] = await Promise.all([
            dailyReference.get(),
            globalReference.get(),
        ]);
        return {
            today: getStoredNumber(dailySnapshot.get("visits")),
            total: getStoredNumber(globalSnapshot.get("totalVisits")),
        };
    }
    return firebase_admin_1.adminDb.runTransaction(async (transaction) => {
        const dailySnapshot = await transaction.get(dailyReference);
        const globalSnapshot = await transaction.get(globalReference);
        const today = getStoredNumber(dailySnapshot.get("visits")) + 1;
        const total = getStoredNumber(globalSnapshot.get("totalVisits")) + 1;
        const updatedAt = firestore_1.Timestamp.now();
        transaction.set(dailyReference, {
            date: todayId,
            visits: today,
            updatedAt,
        }, {
            merge: true,
        });
        transaction.set(globalReference, {
            totalVisits: total,
            updatedAt,
        }, {
            merge: true,
        });
        return {
            today,
            total,
        };
    });
}
async function getPublicStats(input) {
    const [requestStatistics, visitorStatistics,] = await Promise.all([
        readRequestStatistics(),
        readVisitorStatistics(input.recordVisit),
    ]);
    return {
        requests: requestStatistics.requests,
        visitors: visitorStatistics,
        hotspots: requestStatistics.hotspots,
        generatedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=public-stats-service.js.map