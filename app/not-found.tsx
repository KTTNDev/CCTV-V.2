import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f8fb] px-6 py-16 text-slate-900">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-900"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/70 blur-3xl"
      />

      <section
        aria-labelledby="not-found-title"
        className="relative w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-200/70 sm:p-12"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-emerald-300 shadow-xl shadow-slate-300">
          <MapPin aria-hidden="true" className="h-8 w-8" />
        </span>
        <p className="mt-7 text-6xl font-black tracking-tight text-slate-200" aria-hidden="true">
          404
        </p>
        <h1 id="not-found-title" className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          ไม่พบหน้าที่ต้องการ
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm font-medium leading-7 text-slate-500">
          ลิงก์นี้อาจไม่ถูกต้องหรือหน้าดังกล่าวถูกย้ายแล้ว
          คุณสามารถกลับไปยื่นคำร้องหรือติดตามสถานะได้จากหน้าหลัก
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-900 to-emerald-700 px-6 py-3 text-sm font-black text-white shadow-xl shadow-blue-100 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          กลับหน้าหลัก
        </Link>
      </section>
    </main>
  );
}
