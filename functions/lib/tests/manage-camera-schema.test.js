"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const manage_camera_1 = require("../schemas/manage-camera");
const validInput = {
    action: "upsert",
    publicData: {
        name: "กล้องตรวจสภาพการจราจร แยกไสยวน",
        shortName: "แยกไสยวน",
        description: "กล้องสาธารณะ",
        category: "traffic",
        location: "แยกไสยวน ตำบลราไวย์",
        latitude: 7.8,
        longitude: 98.32,
        streamPath: "public/traffic-01",
        status: "online",
        published: true,
        sortOrder: 10,
    },
    privateData: {
        siteCode: "RW-TRAFFIC-01",
        cameraType: "ptz",
        brand: "Example",
        model: "PTZ-01",
        serialNumber: "",
        assetNumber: "",
        ipAddress: "192.168.10.20",
        rtspPort: 554,
        rtspPath: "/Streaming/Channels/102",
        managementUrl: "http://192.168.10.20",
        nvrChannel: "12",
        resolution: "1280x720",
        direction: "หันไปทางทิศเหนือ",
        installationDate: "2026-08-30",
        responsibleUnit: "ศูนย์ CCTV",
        credentialReference: "mediamtx:traffic-01",
        technicalNotes: "ใช้ sub-stream H.264",
    },
};
(0, node_test_1.default)("ยอมรับข้อมูลกล้องที่แยก public และ private ถูกต้อง", () => {
    strict_1.default.equal(manage_camera_1.manageCameraSchema.safeParse(validInput).success, true);
});
(0, node_test_1.default)("ปฏิเสธ RTSP URL เต็มเพื่อไม่ให้ข้อมูลเข้าสู่ระบบหลุดเข้า Firestore", () => {
    const result = manage_camera_1.manageCameraSchema.safeParse({
        ...validInput,
        privateData: {
            ...validInput.privateData,
            rtspPath: "rtsp://admin:password@192.168.10.20/live",
        },
    });
    strict_1.default.equal(result.success, false);
});
(0, node_test_1.default)("ยอมรับคำสั่ง archive ที่มี cameraId ถูกต้อง", () => {
    strict_1.default.equal(manage_camera_1.manageCameraSchema.safeParse({
        action: "archive",
        cameraId: "camera_traffic_01",
    }).success, true);
});
//# sourceMappingURL=manage-camera-schema.test.js.map