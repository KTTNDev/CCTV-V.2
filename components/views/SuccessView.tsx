'use client';

import React, {
  useState,
} from 'react';
import {
  Check,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

interface SubmissionResult {
  trackingId: string;
  trackingToken: string;
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

        window.setTimeout(
          () => setCopied(false),
          2500,
        );
      } catch {
        setShowTrackingToken(true);
      }
    };

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

  return (
    <div className="max-w-xl mx-auto mt-16 text-center animate-in zoom-in duration-300 px-4 pb-20">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-12 h-12 text-emerald-600" />
      </div>

      <h2 className="text-3xl font-bold text-slate-900 mb-3">
        ยื่นคำร้องสำเร็จ
      </h2>

      <p className="text-slate-600 mb-8 leading-relaxed">
        เจ้าหน้าที่ได้รับคำร้องแล้ว
        กรุณาบันทึกรหัสติดตามด้านล่าง
        สำหรับตรวจสอบความคืบหน้า
      </p>

      <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-3xl p-7 mb-5">
        <p className="text-sm text-blue-600 mb-2 font-semibold">
          เลขที่คำร้อง
        </p>

        <p className="text-3xl sm:text-4xl font-mono font-bold text-blue-900 tracking-wide break-all">
          {trackingId || 'ERROR'}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 mb-8 text-left shadow-sm">
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