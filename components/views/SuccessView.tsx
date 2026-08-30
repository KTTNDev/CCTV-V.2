'use client';

import React, {
  useEffect,
  useState,
} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  MessageCircleMore,
  SearchCheck,
  ShieldCheck,
} from 'lucide-react';

interface SubmissionResult {
  trackingId: string;
  trackingToken: string;
  deliveryMethod:
    | 'LINE'
    | 'WALKIN';
}

interface SuccessViewProps {
  submissionResult:
    | SubmissionResult
    | null;

  handleTrackRequest: (
    e: React.FormEvent,
  ) => Promise<void>;

  setTrackingIdInput: (
    value: string,
  ) => void;

  setView: (
    view: string,
  ) => void;
}

const SuccessView:
React.FC<SuccessViewProps> = ({
  submissionResult,
  handleTrackRequest,
  setTrackingIdInput,
  setView,
}) => {
  const [
    showTrackingToken,
    setShowTrackingToken,
  ] = useState(false);

  const [
    copied,
    setCopied,
  ] = useState(false);

  const trackingId =
    submissionResult?.trackingId ?? '';

  const trackingToken =
    submissionResult?.trackingToken ?? '';

  const handleCopyToken =
    async (): Promise<void> => {
      if (!trackingToken) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          trackingToken,
        );

        setCopied(true);
      } catch {
        setShowTrackingToken(true);
      }
    };

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(
      () => setCopied(false),
      2500,
    );

    return () =>
      window.clearTimeout(timer);
  }, [copied]);

  const handleTrackNow =
    async (): Promise<void> => {
      if (!trackingToken) {
        return;
      }

      setTrackingIdInput(
        trackingToken,
      );

      const trackingPromise =
        handleTrackRequest({
          preventDefault: () => {},
        } as React.FormEvent);

      setView('track');

      await trackingPromise;
    };

  if (!submissionResult) {
    return (
      <div className="mx-auto mt-16 max-w-xl px-4 pb-20 text-center">
        <div role="alert" className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            ไม่พบข้อมูลการยื่นคำร้อง
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            กรุณากลับหน้าหลักและตรวจสอบคำร้องอีกครั้ง
          </p>
          <button type="button" onClick={() => setView('home')} className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white">
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 text-center animate-in zoom-in duration-300 px-4 pb-20 sm:mt-16">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-12 h-12 text-emerald-600" />
      </div>

      <h2 className="text-3xl font-bold text-slate-900 mb-3">
        ยื่นคำร้องสำเร็จ
      </h2>

      <p className="mx-auto mb-8 max-w-xl text-slate-600 leading-relaxed">
        เจ้าหน้าที่ได้รับคำร้องแล้ว
        กรุณาบันทึกรหัสติดตามด้านล่าง
        สำหรับตรวจสอบความคืบหน้า
      </p>

      <div className="mx-auto mb-5 max-w-xl rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50 p-7">
        <p className="text-sm text-blue-600 mb-2 font-semibold">
          เลขที่คำร้อง
        </p>

        <p className="text-3xl sm:text-4xl font-mono font-bold text-blue-900 tracking-wide break-all">
          {trackingId || 'ERROR'}
        </p>
      </div>

      <div className="mx-auto mb-6 max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-4 text-left">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-amber-900">กรุณาบันทึกรหัสลับตอนนี้</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">รหัสติดตามแบบปลอดภัยจะแสดงในหน้านี้หลังยื่นสำเร็จ โปรดคัดลอกและเก็บไว้ในที่ปลอดภัยก่อนออกจากหน้านี้</p>
          </div>
        </div>
      </div>

      <div className="mx-auto mb-8 max-w-xl rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>

          <div>
            <h3 className="font-bold text-slate-900">
              รหัสติดตามแบบปลอดภัย
            </h3>

            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              ต้องใช้รหัสฉบับเต็มนี้เพื่อตรวจสอบสถานะ
              โปรดเก็บเป็นความลับและไม่เผยแพร่สู่สาธารณะ
            </p>
          </div>
        </div>

        <div className="bg-slate-950 text-slate-100 rounded-2xl p-4 min-h-20 flex items-center">
          <code className="text-xs sm:text-sm font-mono break-all leading-relaxed w-full">
            {showTrackingToken
              ? trackingToken
              : trackingToken
                ? `${trackingId}.••••••••••••••••••••••••`
                : 'ไม่พบรหัสติดตาม'}
          </code>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            type="button"
            onClick={() =>
              setShowTrackingToken(
                (current) => !current,
              )
            }
            disabled={!trackingToken}
            aria-pressed={showTrackingToken}
            className="py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {showTrackingToken ? (
              <>
                <EyeOff className="w-4 h-4" />
                ซ่อนรหัส
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                แสดงรหัส
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyToken}
            disabled={!trackingToken}
            aria-live="polite"
            className="py-3 px-4 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                คัดลอกแล้ว
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                คัดลอกรหัส
              </>
            )}
          </button>
        </div>
      </div>

      <section aria-labelledby="success-next-steps" className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Next steps</p>
            <h3 id="success-next-steps" className="mt-1 text-xl font-bold text-slate-900">ขั้นตอนต่อไป</h3>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-300" aria-hidden="true" />
        </div>

        <ol className="grid gap-4 sm:grid-cols-3">
          <li className="rounded-2xl bg-slate-50 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><KeyRound className="h-4 w-4" aria-hidden="true" /></span>
            <p className="mt-3 text-sm font-bold text-slate-900">1. เก็บรหัสติดตาม</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">คัดลอกรหัสฉบับเต็มและเก็บเป็นความลับ</p>
          </li>
          <li className="rounded-2xl bg-slate-50 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><SearchCheck className="h-4 w-4" aria-hidden="true" /></span>
            <p className="mt-3 text-sm font-bold text-slate-900">2. รอการตรวจสอบ</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">เจ้าหน้าที่จะตรวจเอกสารและค้นหาภาพตามลำดับ</p>
          </li>
          <li className="rounded-2xl bg-slate-50 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><MessageCircleMore className="h-4 w-4" aria-hidden="true" /></span>
            <p className="mt-3 text-sm font-bold text-slate-900">3. รับผลการดำเนินงาน</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {submissionResult.deliveryMethod === 'LINE'
                ? 'ติดตามข้อความและรับผลผ่าน LINE OA ตามที่เลือกไว้'
                : 'เมื่อสถานะเสร็จสิ้น ให้นำอุปกรณ์จัดเก็บข้อมูลมาติดต่อศูนย์ CCTV'}
            </p>
          </li>
        </ol>
      </section>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleTrackNow}
          disabled={!trackingToken}
          className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all"
        >
          ติดตามสถานะคำร้องทันที
        </button>

        <button
          type="button"
          onClick={() =>
            setView('home')
          }
          className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-4 rounded-2xl transition-all"
        >
          กลับหน้าหลัก
        </button>
      </div>
    </div>
  );
};

export default SuccessView;
