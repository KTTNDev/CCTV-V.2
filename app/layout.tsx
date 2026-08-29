import type { Metadata } from "next";
import "./globals.css";


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
     
      <body className="font-sans antialiased bg-white text-slate-900">
        {children}
      </body>
    </html>
  );
}