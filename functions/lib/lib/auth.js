"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_EMAIL_ALLOWLIST = exports.STAFF_ROLES = void 0;
exports.normalizeEmail = normalizeEmail;
exports.isAllowlistedAdminEmail = isAllowlistedAdminEmail;
exports.requireAuthenticatedUser = requireAuthenticatedUser;
exports.requireStaffRole = requireStaffRole;
exports.requireRequestManager = requireRequestManager;
exports.requireAdministrator = requireAdministrator;
exports.requireAppCheck = requireAppCheck;
const app_check_1 = require("firebase-admin/app-check");
const firebase_admin_1 = require("./firebase-admin");
const http_error_1 = require("./http-error");
exports.STAFF_ROLES = [
    "admin",
    "officer",
    "auditor",
];
exports.ADMIN_EMAIL_ALLOWLIST = [
    "rawai.cctv@gmail.com",
    "kittinanpolrob@gmail.com",
    "phuketpao.evaluation@gmail.com",
];
const adminAppCheck = (0, app_check_1.getAppCheck)(firebase_admin_1.adminApp);
function extractBearerToken(request) {
    const authorization = request.get("Authorization");
    if (!authorization) {
        throw new http_error_1.HttpError({
            status: 401,
            code: "UNAUTHENTICATED",
            message: "กรุณาเข้าสู่ระบบก่อนทำรายการ",
        });
    }
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) {
        throw new http_error_1.HttpError({
            status: 401,
            code: "UNAUTHENTICATED",
            message: "ข้อมูลยืนยันตัวตนไม่ถูกต้อง",
        });
    }
    return match[1].trim();
}
function parseStaffRole(value) {
    if (typeof value === "string" &&
        exports.STAFF_ROLES.includes(value)) {
        return value;
    }
    return null;
}
function normalizeEmail(value) {
    if (!value) {
        return null;
    }
    const normalized = value
        .trim()
        .toLowerCase();
    return normalized || null;
}
function isAllowlistedAdminEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        return false;
    }
    return exports.ADMIN_EMAIL_ALLOWLIST.includes(normalizedEmail);
}
async function requireAuthenticatedUser(request) {
    const idToken = extractBearerToken(request);
    try {
        const decodedToken = await firebase_admin_1.adminAuth.verifyIdToken(idToken, true);
        return {
            uid: decodedToken.uid,
            email: typeof decodedToken.email ===
                "string"
                ? normalizeEmail(decodedToken.email)
                : null,
            emailVerified: decodedToken.email_verified ===
                true,
            isAnonymous: decodedToken.firebase
                ?.sign_in_provider ===
                "anonymous",
            role: parseStaffRole(decodedToken.role),
            token: decodedToken,
        };
    }
    catch {
        throw new http_error_1.HttpError({
            status: 401,
            code: "UNAUTHENTICATED",
            message: "Session หมดอายุหรือถูกยกเลิก กรุณาเข้าสู่ระบบใหม่",
        });
    }
}
async function requireStaffRole(request, allowedRoles) {
    const user = await requireAuthenticatedUser(request);
    if (!user.emailVerified ||
        !user.role ||
        !allowedRoles.includes(user.role)) {
        throw new http_error_1.HttpError({
            status: 403,
            code: "FORBIDDEN",
            message: "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ",
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
async function requireRequestManager(request) {
    const user = await requireAuthenticatedUser(request);
    if (user.isAnonymous) {
        throw new http_error_1.HttpError({
            status: 403,
            code: "FORBIDDEN",
            message: "บัญชีผู้ใช้ทั่วไปไม่มีสิทธิ์แก้ไขคำร้อง",
        });
    }
    const hasManagementRole = user.role === "admin" ||
        user.role === "officer";
    const hasLegacyAdminEmail = user.emailVerified &&
        isAllowlistedAdminEmail(user.email);
    if (!hasManagementRole &&
        !hasLegacyAdminEmail) {
        throw new http_error_1.HttpError({
            status: 403,
            code: "FORBIDDEN",
            message: "บัญชีนี้ไม่มีสิทธิ์แก้ไขคำร้อง",
        });
    }
    return user;
}
/**
 * ใช้กับการตั้งค่าระบบและข้อมูลโครงสร้างพื้นฐานของกล้อง
 * จำกัดเฉพาะ role=admin หรือบัญชี Admin เดิมใน allowlist เท่านั้น
 */
async function requireAdministrator(request) {
    const user = await requireAuthenticatedUser(request);
    const hasAdminRole = user.role === "admin";
    const hasLegacyAdminEmail = user.emailVerified &&
        isAllowlistedAdminEmail(user.email);
    if (user.isAnonymous ||
        (!hasAdminRole &&
            !hasLegacyAdminEmail)) {
        throw new http_error_1.HttpError({
            status: 403,
            code: "FORBIDDEN",
            message: "บัญชีนี้ไม่มีสิทธิ์จัดการข้อมูลกล้อง",
        });
    }
    return user;
}
async function requireAppCheck(request) {
    const appCheckToken = request.get("X-Firebase-AppCheck");
    const isEmulator = process.env
        .FUNCTIONS_EMULATOR ===
        "true";
    const enforceInEmulator = process.env
        .ENFORCE_APP_CHECK ===
        "true";
    if (!appCheckToken &&
        isEmulator &&
        !enforceInEmulator) {
        return;
    }
    if (!appCheckToken) {
        throw new http_error_1.HttpError({
            status: 401,
            code: "UNAUTHENTICATED",
            message: "ไม่สามารถยืนยันแหล่งที่มาของคำขอได้",
        });
    }
    try {
        await adminAppCheck.verifyToken(appCheckToken);
    }
    catch {
        throw new http_error_1.HttpError({
            status: 401,
            code: "UNAUTHENTICATED",
            message: "App Check token ไม่ถูกต้องหรือหมดอายุ",
        });
    }
}
//# sourceMappingURL=auth.js.map