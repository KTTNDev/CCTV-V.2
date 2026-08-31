import type { Metadata, Viewport } from "next";
import {
  ThemeProvider,
} from "../components/providers/ThemeProvider";
import "./globals.css";

const themeBootstrapScript = `
(function () {
  try {
    var saved = localStorage.getItem('rawai-cctv-color-theme');
    var dark = saved === 'dark' ||
      (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (error) {
    document.documentElement.classList.toggle(
      'dark',
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }
})();`;

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
  themeColor: "#201c56",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeBootstrapScript,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-white text-slate-900">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
