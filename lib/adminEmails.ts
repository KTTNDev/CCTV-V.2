/**
 * Allowlist นี้ใช้ควบคุม UX ฝั่งหน้าเว็บเท่านั้น
 *
 * การป้องกันข้อมูลจริงต้องตรวจซ้ำใน:
 * - Cloud Functions
 * - Firestore Rules
 * - Storage Rules
 */
export const ALLOWED_ADMIN_EMAILS = [
  "rawai.cctv@gmail.com",
  "kittinanpolrob@gmail.com",
  "phuketpao.evaluation@gmail.com",
] as const;

const ALLOWED_ADMIN_EMAIL_SET =
  new Set<string>(
    ALLOWED_ADMIN_EMAILS,
  );

export function normalizeAdminEmail(
  email?: string | null,
): string | null {
  if (!email) {
    return null;
  }

  const normalized =
    email
      .trim()
      .toLowerCase();

  return normalized || null;
}

export function isAllowedAdminEmail(
  email?: string | null,
): boolean {
  const normalizedEmail =
    normalizeAdminEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  return (
    ALLOWED_ADMIN_EMAIL_SET.has(
      normalizedEmail,
    )
  );
}