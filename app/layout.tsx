import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CCTV Service Portal | เทศบาลตำบลราไวย์",
    template: "%s | CCTV Rawai",
  },
  description: "ระบบบริการยื่นคำร้องขอข้อมูลภาพกล้องวงจรปิดออนไลน์ เทศบาลตำบลราไวย์",
  applicationName: "CCTV Rawai E-Service Portal",
  category: "government",
  keywords: [
    "CCTV Rawai",
    "กล้องวงจรปิดราไวย์",
    "ยื่นคำร้องออนไลน์",
    "เทศบาลตำบลราไวย์",
  ],
  authors: [{ name: "เทศบาลตำบลราไวย์" }],
  creator: "เทศบาลตำบลราไวย์",
  publisher: "เทศบาลตำบลราไวย์",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f2942",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
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
