"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const PROJECT_ID = "db-rawaicctv";
const EMULATOR_HOST = "127.0.0.1:8080";
const DOCUMENT_ID = "legacy-demo-request";
const TRACKING_ID = "REQ-LEGACY-DEMO-001";
async function main() {
    process.env
        .FIRESTORE_EMULATOR_HOST =
        EMULATOR_HOST;
    const app = (0, app_1.initializeApp)({
        projectId: PROJECT_ID,
    });
    const db = (0, firestore_1.getFirestore)(app);
    const requestReference = db
        .collection("cctv_requests")
        .doc(DOCUMENT_ID);
    const existingSnapshot = await requestReference.get();
    if (existingSnapshot.exists) {
        console.log("ข้อมูลทดสอบมีอยู่แล้ว");
        console.log(`หมายเลขคำร้อง: ${TRACKING_ID}`);
        await db.terminate();
        return;
    }
    const now = firestore_1.Timestamp.now();
    await requestReference.create({
        schemaVersion: 1,
        trackingId: TRACKING_ID,
        status: "pending",
        applicantType: "individual",
        name: "ผู้ทดสอบระบบ",
        nationalId: "",
        phone: "0812344567",
        email: "",
        eventDate: "2025-01-15",
        eventTimeStart: "10:00",
        eventTimeEnd: "10:30",
        eventType: "traffic_accident",
        location: "ข้อมูลจำลองสำหรับทดสอบระบบ",
        latitude: 7.779,
        longitude: 98.325,
        description: "ข้อมูลนี้อยู่ใน Emulator เท่านั้น",
        deliveryMethod: "WALKIN",
        attachments: {
            idCard: "",
            report: "",
            scene: [],
        },
        adminNote: "",
        createdAt: now,
        submittedAt: now,
        updatedAt: now,
        statusHistory: [
            {
                status: "pending",
                timestamp: now,
                note: "รับคำร้องเข้าสู่ระบบแล้ว",
            },
        ],
    });
    console.log("สร้างข้อมูลคำร้องเก่าใน Emulator สำเร็จ");
    console.log(`หมายเลขคำร้อง: ${TRACKING_ID}`);
    console.log("เบอร์โทร 4 ตัวท้าย: 4567");
    console.log("วันที่เกิดเหตุ: 2025-01-15");
    await db.terminate();
}
main().catch((error) => {
    console.error("สร้างข้อมูลทดสอบไม่สำเร็จ:", error);
    process.exitCode = 1;
});
//# sourceMappingURL=seed-legacy-request.js.map