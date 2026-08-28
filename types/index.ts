export type ApplicantType =
  | "THAI"
  | "FOREIGNER";

export type RequestStatus =
  | "draft"
  | "pending"
  | "processing"
  | "verifying"
  | "searching"
  | "waiting_for_information"
  | "completed"
  | "rejected";

export interface FileState {
  idCard: File | null;
  report: File | null;
  scene: File[];
}

export interface FormDataState {
  name: string;
  isForeigner: string;
  nationalId: string;
  passportNumber: string;
  phone: string;
  email: string;

  eventDate: string;
  eventTimeStart: string;
  eventTimeEnd: string;
  eventType: string;

  accidentSubtype?: string;
  isForeignerInvolved: string;

  location: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  deliveryMethod: string;
}

export interface FirebaseTimestampLike {
  seconds: number;
  nanoseconds?: number;
  toDate?: () => Date;
}

export type RequestTimestamp =
  | FirebaseTimestampLike
  | Date
  | string
  | number
  | null;

export interface TrackingStatus {
  status: string;
  timestamp: RequestTimestamp;
  note: string;
}

/**
 * รูปแบบไฟล์แนบที่หน้า Admin ใช้งาน
 *
 * URL อาจมาจาก:
 * - Google Drive ของข้อมูลเดิม
 * - Firebase Storage ของ Schema V2
 */
export interface AdminRequestAttachments {
  idCard: string | null;
  report: string | null;
  scene: string[];
}

/**
 * ข้อมูลคำร้องหลังผ่านตัวแปลงข้อมูลแล้ว
 *
 * หน้า Admin จะใช้รูปแบบนี้ร่วมกันทั้ง:
 * - ข้อมูลเดิม (Legacy)
 * - ข้อมูลใหม่ Schema V2
 */
export interface CCTVRequest {
  id: string;

  schemaVersion: number;
  dataSource: "legacy" | "secure-v2";

  trackingId: string;
  status: RequestStatus | string;

  createdAt: RequestTimestamp;
  submittedAt: RequestTimestamp;
  updatedAt: RequestTimestamp;

  name: string;

  applicantType: ApplicantType;
  isForeigner: ApplicantType;

  nationalId: string;
  passportNumber: string;

  phone: string;
  email: string;

  eventDate: string;
  eventTimeStart: string;
  eventTimeEnd: string;
  eventType: string;

  accidentSubtype: string;
  isForeignerInvolved: string;

  location: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  deliveryMethod: string;

  attachments: AdminRequestAttachments;

  statusHistory: TrackingStatus[];
  adminNote: string;
}