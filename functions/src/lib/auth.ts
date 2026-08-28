import {
  getAppCheck,
} from "firebase-admin/app-check";
import type {
  DecodedIdToken,
} from "firebase-admin/auth";

import {
  adminApp,
  adminAuth,
} from "./firebase-admin";
import { HttpError } from "./http-error";

export const STAFF_ROLES = [
  "admin",
  "officer",
  "auditor",
] as const;

export type StaffRole =
  (typeof STAFF_ROLES)[number];

export const ADMIN_EMAIL_ALLOWLIST = [
  "rawai.cctv@gmail.com",
  "kittinanpolrob@gmail.com",
  "phuketpao.evaluation@gmail.com",
] as const;

interface HeaderRequest {
  get(
    name: string,
  ): string | undefined;
}

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  role: StaffRole | null;
  token: DecodedIdToken;
}

const adminAppCheck =
  getAppCheck(adminApp);

function extractBearerToken(
  request: HeaderRequest,
): string {
  const authorization =
    request.get(
      "Authorization",
    );

  if (!authorization) {
    throw new HttpError({
      status: 401,
      code: "UNAUTHENTICATED",
      message:
        "กรุณาเข้าสู่ระบบก่อนทำรายการ",
    });
  }

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i,
    );

  if (!match?.[1]) {
    throw new HttpError({
      status: 401,
      code: "UNAUTHENTICATED",
      message:
        "ข้อมูลยืนยันตัวตนไม่ถูกต้อง",
    });
  }

  return match[1].trim();
}

function parseStaffRole(
  value: unknown,
): StaffRole | null {
  if (
    typeof value === "string" &&
    STAFF_ROLES.includes(
      value as StaffRole,
    )
  ) {
    return value as StaffRole;
  }

  return null;
}

export function normalizeEmail(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  return normalized || null;
}

export function isAllowlistedAdminEmail(
  email: string | null,
): boolean {
  const normalizedEmail =
    normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  return (
    ADMIN_EMAIL_ALLOWLIST as readonly string[]
  ).includes(normalizedEmail);
}

export async function requireAuthenticatedUser(
  request: HeaderRequest,
): Promise<AuthenticatedUser> {
  const idToken =
    extractBearerToken(request);

  try {
    const decodedToken =
      await adminAuth.verifyIdToken(
        idToken,
        true,
      );

    return {
      uid: decodedToken.uid,

      email:
        typeof decodedToken.email ===
        "string"
          ? normalizeEmail(
              decodedToken.email,
            )
          : null,

      emailVerified:
        decodedToken.email_verified ===
        true,

      isAnonymous:
        decodedToken.firebase
          ?.sign_in_provider ===
        "anonymous",

      role: parseStaffRole(
        decodedToken.role,
      ),

      token: decodedToken,
    };
  } catch {
    throw new HttpError({
      status: 401,
      code: "UNAUTHENTICATED",
      message:
        "Session หมดอายุหรือถูกยกเลิก กรุณาเข้าสู่ระบบใหม่",
    });
  }
}

export async function requireStaffRole(
  request: HeaderRequest,
  allowedRoles:
    readonly StaffRole[],
): Promise<AuthenticatedUser> {
  const user =
    await requireAuthenticatedUser(
      request,
    );

  if (
    !user.emailVerified ||
    !user.role ||
    !allowedRoles.includes(
      user.role,
    )
  ) {
    throw new HttpError({
      status: 403,
      code: "FORBIDDEN",
      message:
        "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ",
    });
  }

  return user;
}

/**
 * ใช้กับงานแก้ไขคำร้องของเจ้าหน้าที่
 *
 * ระบบใหม่:
 * - Custom Claim role=admin หรือ officer
 *
 * ช่วงเปลี่ยนผ่าน:
 * - รองรับอีเมล Admin เดิมใน allowlist
 *
 * auditor มีสิทธิ์อ่านรายงาน แต่ไม่มีสิทธิ์แก้คำร้อง
 */
export async function requireRequestManager(
  request: HeaderRequest,
): Promise<AuthenticatedUser> {
  const user =
    await requireAuthenticatedUser(
      request,
    );

  if (user.isAnonymous) {
    throw new HttpError({
      status: 403,
      code: "FORBIDDEN",
      message:
        "บัญชีผู้ใช้ทั่วไปไม่มีสิทธิ์แก้ไขคำร้อง",
    });
  }

  const hasManagementRole =
    user.role === "admin" ||
    user.role === "officer";

const hasLegacyAdminEmail =
  user.emailVerified &&
  isAllowlistedAdminEmail(
    user.email,
  );

  if (
    !hasManagementRole &&
    !hasLegacyAdminEmail
  ) {
    throw new HttpError({
      status: 403,
      code: "FORBIDDEN",
      message:
        "บัญชีนี้ไม่มีสิทธิ์แก้ไขคำร้อง",
    });
  }

  return user;
}

export async function requireAppCheck(
  request: HeaderRequest,
): Promise<void> {
  const appCheckToken =
    request.get(
      "X-Firebase-AppCheck",
    );

  const isEmulator =
    process.env
      .FUNCTIONS_EMULATOR ===
    "true";

  const enforceInEmulator =
    process.env
      .ENFORCE_APP_CHECK ===
    "true";

  if (
    !appCheckToken &&
    isEmulator &&
    !enforceInEmulator
  ) {
    return;
  }

  if (!appCheckToken) {
    throw new HttpError({
      status: 401,
      code: "UNAUTHENTICATED",
      message:
        "ไม่สามารถยืนยันแหล่งที่มาของคำขอได้",
    });
  }

  try {
    await adminAppCheck.verifyToken(
      appCheckToken,
    );
  } catch {
    throw new HttpError({
      status: 401,
      code: "UNAUTHENTICATED",
      message:
        "App Check token ไม่ถูกต้องหรือหมดอายุ",
    });
  }
}