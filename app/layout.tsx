import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

// ฟอนต์ภาษาอังกฤษหลัก (Inter)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// ฟอนต์ภาษาไทยหลัก (Noto Sans Thai) - รองรับน้ำหนัก 100-900 ตามที่คุณต้องการ
const notoSansThai = Noto_Sans_Thai({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["thai", "latin"],
  variable: "--font-noto-sans-thai",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "CCTV Service Portal | เทศบาลตำบลราไวย์",
  description: "ระบบบริการยื่นคำร้องขอข้อมูลภาพกล้องวงจรปิดออนไลน์ เทศบาลตำบลราไวย์",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        {/* สำรองเผื่อกรณีระบบต้องการเรียกใช้ผ่าน CDN โดยตรง */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${notoSansThai.variable} ${inter.variable} font-sans antialiased bg-white text-slate-900`}
      >
        {children}
      </body>
    </html>
  );
}