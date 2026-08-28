"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const REQUEST_COLLECTION = "cctv_requests";
const TRACKING_ID_PATTERN = /^[A-Z0-9_-]{4,128}$/;
const DEFAULT_EMULATOR_HOST = "127.0.0.1:8080";
function getArgumentValue(name) {
    const prefix = `--${name}=`;
    const argument = process.argv.find((value) => value.startsWith(prefix));
    return argument
        ? argument.slice(prefix.length).trim()
        : null;
}
function getOptionalString(value) {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim();
    return normalized || null;
}
function normalizePhone(value) {
    const phone = getOptionalString(value);
    if (!phone) {
        return null;
    }
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 4
        ? digits
        : null;
}
function normalizeEventDate(value) {
    const eventDate = getOptionalString(value);
    if (!eventDate) {
        return null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
        return eventDate;
    }
    const legacyMatch = eventDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!legacyMatch) {
        return null;
    }
    const day = Number(legacyMatch[1]);
    const month = Number(legacyMatch[2]);
    let year = Number(legacyMatch[3]);
    if (year > 2400) {
        year -= 543;
    }
    if (!Number.isInteger(day) ||
        !Number.isInteger(month) ||
        !Number.isInteger(year) ||
        day < 1 ||
        day > 31 ||
        month < 1 ||
        month > 12 ||
        year < 1900 ||
        year > 2200) {
        return null;
    }
    return [
        String(year).padStart(4, "0"),
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0"),
    ].join("-");
}
async function main() {
    const projectId = getArgumentValue("project");
    const useEmulator = process.argv.includes("--emulator");
    const applyChanges = process.argv.includes("--apply");
    if (!projectId) {
        throw new Error("กรุณาระบุ Firebase project ด้วย " +
            "--project=PROJECT_ID");
    }
    if (useEmulator) {
        process.env
            .FIRESTORE_EMULATOR_HOST =
            getArgumentValue("emulator-host") ?? DEFAULT_EMULATOR_HOST;
    }
    const appOptions = {
        projectId,
    };
    if (!useEmulator) {
        appOptions.credential =
            (0, app_1.applicationDefault)();
    }
    const app = (0, app_1.initializeApp)(appOptions);
    const db = (0, firestore_1.getFirestore)(app);
    console.log(applyChanges
        ? "โหมด APPLY: อนุญาตให้ปรับ schemaVersion"
        : "โหมด DRY-RUN: ไม่มีการแก้ฐานข้อมูล");
    console.log(useEmulator
        ? `เป้าหมาย Emulator: ${process.env
            .FIRESTORE_EMULATOR_HOST}`
        : `เป้าหมาย Firebase จริง: ${projectId}`);
    const snapshot = await db
        .collection(REQUEST_COLLECTION)
        .get();
    const candidates = [];
    const trackingIdCounts = new Map();
    let secureRequestCount = 0;
    for (const documentSnapshot of snapshot.docs) {
        const data = documentSnapshot.data();
        const schemaVersion = typeof data.schemaVersion ===
            "number"
            ? data.schemaVersion
            : null;
        const hasTrackingSecret = typeof data.trackingSecretHash ===
            "string" &&
            data.trackingSecretHash.trim()
                .length > 0;
        if (hasTrackingSecret ||
            (schemaVersion !== null &&
                schemaVersion >= 2)) {
            secureRequestCount += 1;
            continue;
        }
        const trackingId = getOptionalString(data.trackingId);
        const phone = normalizePhone(data.phone);
        const eventDate = normalizeEventDate(data.eventDate);
        const status = getOptionalString(data.status);
        const issues = [];
        if (!trackingId) {
            issues.push("ไม่มี trackingId");
        }
        else {
            trackingIdCounts.set(trackingId, (trackingIdCounts.get(trackingId) ?? 0) + 1);
            if (!TRACKING_ID_PATTERN.test(trackingId)) {
                issues.push("รูปแบบ trackingId ไม่รองรับ");
            }
        }
        if (!phone) {
            issues.push("เบอร์โทรศัพท์ไม่ครบ 4 หลัก");
        }
        if (!eventDate) {
            issues.push("รูปแบบวันที่เกิดเหตุไม่รองรับ");
        }
        if (!status ||
            status === "draft") {
            issues.push("สถานะยังไม่พร้อมให้ติดตาม");
        }
        candidates.push({
            documentId: documentSnapshot.id,
            trackingId,
            issues,
            shouldBackfillSchemaVersion: schemaVersion !== 1,
        });
    }
    for (const candidate of candidates) {
        if (candidate.trackingId &&
            (trackingIdCounts.get(candidate.trackingId) ?? 0) > 1) {
            candidate.issues.push("trackingId ซ้ำมากกว่า 1 เอกสาร");
        }
    }
    const validCandidates = candidates.filter((candidate) => candidate.issues.length === 0);
    const invalidCandidates = candidates.filter((candidate) => candidate.issues.length > 0);
    const updateCandidates = validCandidates.filter((candidate) => candidate
        .shouldBackfillSchemaVersion);
    console.log("");
    console.log("สรุปผลตรวจสอบ");
    console.log(`เอกสารทั้งหมด: ${snapshot.size}`);
    console.log(`คำร้องระบบใหม่: ${secureRequestCount}`);
    console.log(`คำร้องเก่าที่พร้อมใช้งาน: ${validCandidates.length}`);
    console.log(`คำร้องเก่าที่ต้องตรวจสอบ: ${invalidCandidates.length}`);
    console.log(`รายการที่จะเติม schemaVersion: ${updateCandidates.length}`);
    if (invalidCandidates.length > 0) {
        console.log("");
        console.log("รายการที่ต้องตรวจสอบ:");
        for (const candidate of invalidCandidates.slice(0, 100)) {
            console.log([
                `- document=${candidate.documentId}`,
                `trackingId=${candidate.trackingId ??
                    "ไม่มี"}`,
                `ปัญหา=${candidate.issues.join(", ")}`,
            ].join(" | "));
        }
        if (invalidCandidates.length > 100) {
            console.log(`...ยังมีอีก ${invalidCandidates.length -
                100} รายการ`);
        }
    }
    if (applyChanges &&
        updateCandidates.length > 0) {
        for (let offset = 0; offset <
            updateCandidates.length; offset += 400) {
            const chunk = updateCandidates.slice(offset, offset + 400);
            const batch = db.batch();
            for (const candidate of chunk) {
                const reference = db
                    .collection(REQUEST_COLLECTION)
                    .doc(candidate.documentId);
                batch.update(reference, {
                    schemaVersion: 1,
                });
            }
            await batch.commit();
            console.log(`อัปเดตแล้ว ${Math.min(offset + chunk.length, updateCandidates.length)}/${updateCandidates.length}`);
        }
    }
    else if (!applyChanges &&
        updateCandidates.length > 0) {
        console.log("");
        console.log("ยังไม่มีข้อมูลถูกแก้ไข " +
            "หากตรวจผลแล้วถูกต้อง " +
            "จึงค่อยรันใหม่พร้อม --apply");
    }
    await db.terminate();
}
main().catch((error) => {
    console.error("ตรวจสอบข้อมูลไม่สำเร็จ:", error);
    process.exitCode = 1;
});
//# sourceMappingURL=audit-legacy-requests.js.map