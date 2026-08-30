import assert from "node:assert/strict";
import test from "node:test";

import { manageCameraSchema } from "../schemas/manage-camera";

const validInput = {
  action: "upsert" as const,
  publicData: {
    name: "กล้องตรวจสภาพการจราจร แยกไสยวน",
    shortName: "แยกไสยวน",
    description: "กล้องสาธารณะ",
    category: "traffic" as const,
    location: "แยกไสยวน ตำบลราไวย์",
    latitude: 7.8,
    longitude: 98.32,
    streamPath: "public/traffic-01",
    status: "online" as const,
    published: true,
    sortOrder: 10,
  },
  privateData: {
    siteCode: "RW-TRAFFIC-01",
    cameraType: "ptz" as const,
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

test(
  "ยอมรับข้อมูลกล้องที่แยก public และ private ถูกต้อง",
  () => {
    assert.equal(
      manageCameraSchema.safeParse(
        validInput,
      ).success,
      true,
    );
  },
);

test(
  "ปฏิเสธ RTSP URL เต็มเพื่อไม่ให้ข้อมูลเข้าสู่ระบบหลุดเข้า Firestore",
  () => {
    const result =
      manageCameraSchema.safeParse({
        ...validInput,
        privateData: {
          ...validInput.privateData,
          rtspPath:
            "rtsp://admin:password@192.168.10.20/live",
        },
      });

    assert.equal(
      result.success,
      false,
    );
  },
);

test(
  "ยอมรับคำสั่ง archive ที่มี cameraId ถูกต้อง",
  () => {
    assert.equal(
      manageCameraSchema.safeParse({
        action: "archive",
        cameraId:
          "camera_traffic_01",
      }).success,
      true,
    );
  },
);
