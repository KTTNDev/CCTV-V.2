import {
  getToken as getAppCheckToken,
} from "firebase/app-check";

import {
  appCheck,
  auth,
  useFirebaseEmulators,
} from "./firebase";

export type ApplicantType =
  | "THAI"
  | "FOREIGNER";

export type EventType =
  | "ACCIDENT"
  | "THEFT"
  | "VANDALISM"
  | "DISPUTE"
  | "OTHER";

export type AccidentSubtype =
  | "MC_VS_MC"
  | "MC_VS_CAR"
  | "CAR_VS_CAR"
  | "PEDESTRIAN"
  | "HIT_AND_RUN"
  | "OTHER";

export type ForeignerInvolvement =
  | "YES"
  | "NO"
  | "NOT_SURE";

export type DeliveryMethod =
  | "LINE"
  | "WALKIN";

export type AllowedContentType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "application/pdf";

export interface UploadFileMetadata {
  name: string;
  contentType: AllowedContentType;
  size: number;
}

export interface CreateRequestPayload {
  name: string;
  applicantType: ApplicantType;
  nationalId: string;
  passportNumber: string;
  phone: string;
  email: string;

  eventDate: string;
  eventTimeStart: string;
  eventTimeEnd: string;
  eventType: EventType;

  accidentSubtype?: AccidentSubtype;
  isForeignerInvolved?:
    ForeignerInvolvement;

  location: string;
  latitude: number;
  longitude: number;
  description: string;
  deliveryMethod: DeliveryMethod;

  privacyAccepted: true;

  expectedFiles: {
    idCard: UploadFileMetadata;
    policeReport: UploadFileMetadata;
    scene: UploadFileMetadata[];
  };
}

export type UploadKind =
  | "id-card"
  | "police-report"
  | "scene";

export interface UploadTarget {
  id: string;
  kind: UploadKind;
  originalName: string;
  contentType: AllowedContentType;
  size: number;
  storagePath: string;
}

export interface CreateRequestResult {
  requestId: string;
  trackingId: string;
  trackingToken: string;
  draftExpiresAt: string;
  uploadTargets: UploadTarget[];
}

export interface FinalizeRequestResult {
  requestId: string;
  trackingId: string;
  status: "pending";
  submittedAt: string;
}

interface ApiErrorBody {
  code?: string;
  message?: string;
  fields?: Record<string, string[]>;
}

interface ApiResponseBody<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorBody;
  requestId?: string;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<
    string,
    string[]
  >;
  readonly requestId?: string;

  constructor(options: {
    status: number;
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    requestId?: string;
  }) {
    super(options.message);

    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code;
    this.fields = options.fields;
    this.requestId = options.requestId;

    Object.setPrototypeOf(
      this,
      ApiClientError.prototype,
    );
  }
}

const firebaseProjectId =
  process.env
    .NEXT_PUBLIC_FIREBASE_PROJECT_ID;

function getEndpoint(
  productionPath: string,
  emulatorFunctionName: string,
): string {
  if (!useFirebaseEmulators) {
    return productionPath;
  }

  if (!firebaseProjectId) {
    throw new Error(
      "ไม่ได้กำหนด NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    );
  }

  return (
    `http://127.0.0.1:5001/` +
    `${firebaseProjectId}/` +
    `asia-southeast1/` +
    emulatorFunctionName
  );
}
async function createRequestHeaders(
  requireAuthentication: boolean,
): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;

  if (
    requireAuthentication &&
    !currentUser
  ) {
    throw new ApiClientError({
      status: 401,
      code: "UNAUTHENTICATED",
      message:
        "กรุณารอระบบยืนยันตัวตน แล้วลองอีกครั้ง",
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (currentUser) {
    const idToken =
      await currentUser.getIdToken();

    headers.Authorization =
      `Bearer ${idToken}`;
  }

  if (appCheck) {
    const appCheckToken =
      await getAppCheckToken(
        appCheck,
        false,
      );

    headers["X-Firebase-AppCheck"] =
      appCheckToken.token;
  }

  return headers;
}

async function parseResponseBody<T>(
  response: Response,
): Promise<ApiResponseBody<T>> {
  const responseText =
    await response.text();

  if (!responseText) {
    return {
      success: false,
      error: {
        code: "EMPTY_RESPONSE",
        message:
          "เซิร์ฟเวอร์ไม่ได้ส่งข้อมูลตอบกลับ",
      },
    };
  }

  try {
    return JSON.parse(
      responseText,
    ) as ApiResponseBody<T>;
  } catch {
    return {
      success: false,
      error: {
        code: "INVALID_RESPONSE",
        message:
          "รูปแบบข้อมูลตอบกลับไม่ถูกต้อง",
      },
    };
  }
}

async function postJson<TResponse>(
  endpoint: string,
  body: unknown,
  options: {
    requireAuthentication?: boolean;
  } = {},
): Promise<TResponse> {
  const {
    requireAuthentication = true,
  } = options;

  const headers =
    await createRequestHeaders(
      requireAuthentication,
    );

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const responseBody =
    await parseResponseBody<TResponse>(
      response,
    );

  if (
    !response.ok ||
    responseBody.success !== true ||
    responseBody.data === undefined
  ) {
    throw new ApiClientError({
      status: response.status,
      code:
        responseBody.error?.code ??
        "REQUEST_FAILED",
      message:
        responseBody.error?.message ??
        "ไม่สามารถทำรายการได้ กรุณาลองใหม่อีกครั้ง",
      fields:
        responseBody.error?.fields,
      requestId:
        responseBody.requestId,
    });
  }

  return responseBody.data;
}

export async function createRequest(
  payload: CreateRequestPayload,
): Promise<CreateRequestResult> {
  return postJson<CreateRequestResult>(
    getEndpoint(
      "/api/requests/create",
      "createRequest",
    ),
    payload,
  );
}

export async function finalizeRequest(
  requestId: string,
): Promise<FinalizeRequestResult> {
  return postJson<FinalizeRequestResult>(
    getEndpoint(
      "/api/requests/finalize",
      "finalizeRequest",
    ),
    {
      requestId,
    },
  );
}
export interface TrackStatusHistoryItem {
  status: string;
  note: string;
  timestamp: string | null;
}

export interface TrackRequestResult {
  trackingId: string;
  status: string;

  eventType: string | null;
  eventDate: string | null;
  eventTimeStart: string | null;
  eventTimeEnd: string | null;
  location: string | null;
  deliveryMethod: string | null;

  adminNote: string | null;

  createdAt: string | null;
  submittedAt: string | null;
  updatedAt: string | null;

  statusHistory:
    TrackStatusHistoryItem[];
}
export async function trackRequest(
  trackingToken: string,
): Promise<TrackRequestResult> {
  return postJson<TrackRequestResult>(
    getEndpoint(
      "/api/requests/track",
      "trackRequest",
    ),
    {
      trackingToken,
    },
    {
      requireAuthentication: false,
    },
  );
}
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
export async function getPublicStats(
  recordVisit: boolean,
): Promise<PublicStatsResult> {
  return postJson<PublicStatsResult>(
    getEndpoint(
      "/api/public/stats",
      "publicStats",
    ),
    {
      recordVisit,
    },
    {
      requireAuthentication: false,
    },
  );
}
export type AdminRequestStatus =
  | "pending"
  | "verifying"
  | "searching"
  | "waiting_for_information"
  | "completed"
  | "rejected";

export interface UpdateAdminRequestPayload {
  requestId: string;
  status: AdminRequestStatus;
  adminNote: string;
}

export interface UpdateAdminRequestResult {
  requestId: string;
  trackingId: string | null;

  previousStatus: string;
  status: AdminRequestStatus;

  adminNote: string;
  updatedAt: string;
}

export async function updateAdminRequest(
  payload: UpdateAdminRequestPayload,
): Promise<UpdateAdminRequestResult> {
  return postJson<UpdateAdminRequestResult>(
    getEndpoint(
      "/api/admin/requests/update",
      "updateRequest",
    ),
    payload,
    {
      requireAuthentication: true,
    },
  );
}