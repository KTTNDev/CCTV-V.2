"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.warn("Application error boundary:", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-16 text-white">
      <div
        aria-hidden="true"
        className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl"
      />

      <section
        aria-labelledby="error-title"
        className="relative w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.07] p-8 text-center shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-12"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/20">
          <AlertTriangle aria-hidden="true" className="h-8 w-8" />
        </span>

        <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
          Service temporarily unavailable
        </p>
        <h1 id="error-title" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          ระบบขัดข้องชั่วคราว
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm font-medium leading-7 text-slate-300">
          ไม่สามารถแสดงข้อมูลส่วนนี้ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง
          หรือกลับไปยังหน้าหลักเพื่อเริ่มดำเนินการใหม่
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200/50"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            ลองอีกครั้ง
          </button>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20"
          >
            <Home aria-hidden="true" className="h-4 w-4" />
            กลับหน้าหลัก
          </button>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs font-medium text-slate-500">
            รหัสอ้างอิง: {error.digest}
          </p>
        )}
      </section>
    </main>
  );
}
