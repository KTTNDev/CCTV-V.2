// รายชื่ออีเมลเจ้าหน้าที่ที่อนุญาตให้เข้าถึงระบบแอดมิน
// ⚠️ ต้องตรงกับรายชื่อใน firestore.rules (function isAdmin()) ด้วยเสมอ
// เพราะไฟล์นี้คุมแค่ UI ฝั่ง client ส่วน firestore.rules คือตัวป้องกันข้อมูลจริง
export const ALLOWED_ADMIN_EMAILS = [
  'rawai.cctv@gmail.com',
  'kittinanpolrob@gmail.com',
  'phuketpao.evaluation@gmail.com',
];

export const isAllowedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase());
};
