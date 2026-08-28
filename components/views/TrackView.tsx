'use client';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  LucideIcon,
} from 'lucide-react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Footprints,
  History,
  MapPin,
  QrCode,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import type {
  LegacyTrackRequestPayload,
  TrackRequestResult,
} from '../../lib/api-client';

interface TrackViewProps {
  trackingIdInput: string;

  setTrackingIdInput: (
    value: string,
  ) => void;

  handleTrackRequest: (
    e: React.FormEvent,
  ) => Promise<void>;

handleLegacyTrackRequest: (
  payload: LegacyTrackRequestPayload,
) => Promise<void>;
  trackResult:
    | TrackRequestResult
    | null;

  loading: boolean;
  error: string;

  setView: (
    view: string,
  ) => void;
}

interface StatusConfig {
  title: string;
  description: string;
  icon: LucideIcon;
  progress: number;
  cardClassName: string;
  iconClassName: string;
  progressClassName: string;
}

const STATUS_CONFIG:
Record<string, StatusConfig> = {
  pending: {
    title: 'รอตรวจสอบ',
    description:
      'เจ้าหน้าที่ได้รับคำร้องแล้ว และกำลังตรวจสอบข้อมูลเบื้องต้น',
    icon: Clock,
    progress: 15,
    cardClassName:
      'bg-amber-50 border-amber-200',
    iconClassName:
      'bg-amber-100 text-amber-700',
    progressClassName:
      'bg-amber-500',
  },

  verifying: {
    title: 'กำลังตรวจเอกสาร',
    description:
      'เจ้าหน้าที่กำลังตรวจสอบเอกสารและรายละเอียดคำร้อง',
    icon: ShieldCheck,
    progress: 35,
    cardClassName:
      'bg-blue-50 border-blue-200',
    iconClassName:
      'bg-blue-100 text-blue-700',
    progressClassName:
      'bg-blue-500',
  },

  waiting_for_information: {
    title: 'รอข้อมูลเพิ่มเติม',
    description:
      'กรุณาตรวจสอบข้อความจากเจ้าหน้าที่และส่งข้อมูลเพิ่มเติมตามที่ระบุ',
    icon: AlertCircle,
    progress: 45,
    cardClassName:
      'bg-orange-50 border-orange-200',
    iconClassName:
      'bg-orange-100 text-orange-700',
    progressClassName:
      'bg-orange-500',
  },

  searching: {
    title: 'กำลังค้นหาภาพ',
    description:
      'เจ้าหน้าที่กำลังตรวจสอบภาพจากกล้องวงจรปิดในช่วงเวลาที่แจ้ง',
    icon: Activity,
    progress: 65,
    cardClassName:
      'bg-indigo-50 border-indigo-200',
    iconClassName:
      'bg-indigo-100 text-indigo-700',
    progressClassName:
      'bg-indigo-500',
  },

  completed: {
    title: 'ดำเนินการเสร็จสิ้น',
    description:
      'เจ้าหน้าที่ดำเนินการเรียบร้อยแล้ว กรุณาตรวจสอบข้อความด้านล่าง',
    icon: CheckCircle2,
    progress: 100,
    cardClassName:
      'bg-emerald-50 border-emerald-200',
    iconClassName:
      'bg-emerald-100 text-emerald-700',
    progressClassName:
      'bg-emerald-500',
  },

  rejected: {
    title: 'ไม่สามารถดำเนินการได้',
    description:
      'กรุณาตรวจสอบเหตุผลหรือคำแนะนำจากเจ้าหน้าที่ด้านล่าง',
    icon: XCircle,
    progress: 100,
    cardClassName:
      'bg-red-50 border-red-200',
    iconClassName:
      'bg-red-100 text-red-700',
    progressClassName:
      'bg-red-500',
  },
};

const DEFAULT_STATUS:
StatusConfig = STATUS_CONFIG.pending;

const EVENT_LABELS:
Record<string, string> = {
  ACCIDENT: 'อุบัติเหตุจราจร',
  THEFT: 'การโจรกรรม / ลักทรัพย์',
  VANDALISM: 'การทำลายทรัพย์สิน',
  DISPUTE: 'ข้อพิพาท / ทะเลาะวิวาท',
  OTHER: 'เหตุการณ์อื่น',
};

function formatEventDate(
  value: string | null,
): string {
  if (!value) {
    return 'ไม่ระบุ';
  }

  const date = new Date(
    `${value}T00:00:00+07:00`,
  );

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'th-TH',
    {
      dateStyle: 'long',
      timeZone: 'Asia/Bangkok',
    },
  ).format(date);
}

function formatTimestamp(
  value: string | null,
): string {
  if (!value) {
    return 'ไม่ระบุเวลา';
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return 'ไม่ระบุเวลา';
  }

  return new Intl.DateTimeFormat(
    'th-TH',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Bangkok',
    },
  ).format(date);
}

const TrackView:
React.FC<TrackViewProps> = ({
  trackingIdInput,
  setTrackingIdInput,
  handleTrackRequest,
  handleLegacyTrackRequest,
  trackResult,
  loading,
  error,
  setView,
}) => {
  const [
    showTrackingToken,
    setShowTrackingToken,
  ] = useState(false);
  const [
    trackingMode,
    setTrackingMode,
  ] = useState<'secure' | 'legacy'>(
    'secure',
  );

  const [
    legacyTrackingId,
    setLegacyTrackingId,
  ] = useState('');

  const [
    legacyPhoneLast4,
    setLegacyPhoneLast4,
  ] = useState('');

  const [
    legacyEventDate,
    setLegacyEventDate,
  ] = useState('');

  const handleLegacySubmit = async (
    event:
      React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    await handleLegacyTrackRequest({
      trackingId: legacyTrackingId,
      phoneLast4: legacyPhoneLast4,
      eventDate: legacyEventDate,
    });
  };
  const resultSectionRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      trackResult &&
      resultSectionRef.current
    ) {
      resultSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [trackResult]);

  const currentStatus =
    trackResult
      ? STATUS_CONFIG[
          trackResult.status
        ] ?? DEFAULT_STATUS
      : DEFAULT_STATUS;

  const CurrentStatusIcon =
    currentStatus.icon;

  const eventLabel =
    trackResult?.eventType
      ? EVENT_LABELS[
          trackResult.eventType
        ] ?? trackResult.eventType
      : 'ไม่ระบุ';

  const deliveryLabel =
    trackResult?.deliveryMethod === 'LINE'
      ? 'รับผลผ่าน LINE OA'
      : trackResult?.deliveryMethod ===
          'WALKIN'
        ? 'รับด้วยตนเองที่ศูนย์ CCTV'
        : 'ไม่ระบุ';

  const DeliveryIcon =
    trackResult?.deliveryMethod === 'LINE'
      ? QrCode
      : Footprints;

  const sortedHistory =
    trackResult
      ? [
          ...trackResult.statusHistory,
        ].reverse()
      : [];

  return (
    <div className="max-w-5xl mx-auto pt-10 pb-24 px-5 text-slate-900">
      <button
        type="button"
        onClick={() => setView('home')}
        className="group mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        กลับหน้าหลัก
      </button>

      <section className="relative overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/40">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-900" />

        <div className="p-7 sm:p-10 md:p-14 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Search className="w-7 h-7" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            ติดตามสถานะคำร้อง
          </h1>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto leading-relaxed">
            เลือกวิธีติดตามให้ตรงกับรหัสที่คุณได้รับ
          </p>

          <div className="max-w-2xl mx-auto mt-8">
            <div
              className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1"
              role="tablist"
              aria-label="เลือกประเภทคำร้อง"
            >
              <button
                type="button"
                role="tab"
                aria-selected={
                  trackingMode === 'secure'
                }
                onClick={() =>
                  setTrackingMode('secure')
                }
                className={`min-h-12 rounded-xl px-4 text-sm font-semibold transition-all ${
                  trackingMode === 'secure'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                คำร้องใหม่
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={
                  trackingMode === 'legacy'
                }
                onClick={() =>
                  setTrackingMode('legacy')
                }
                className={`min-h-12 rounded-xl px-4 text-sm font-semibold transition-all ${
                  trackingMode === 'legacy'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                คำร้องเดิม
              </button>
            </div>

            {trackingMode === 'secure' ? (
              <form
                onSubmit={handleTrackRequest}
                className="mt-6 text-left"
              >
                <label
                  htmlFor="tracking-token"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  รหัสติดตามแบบปลอดภัย
                </label>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      id="tracking-token"
                      type={
                        showTrackingToken
                          ? 'text'
                          : 'password'
                      }
                      value={trackingIdInput}
                      onChange={(event) =>
                        setTrackingIdInput(
                          event.target.value,
                        )
                      }
                      placeholder="RW-YYYYMMDD-XXXXXX.secret"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      className="w-full h-14 pl-5 pr-14 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 font-mono text-sm transition-all"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowTrackingToken(
                          (current) =>
                            !current,
                        )
                      }
                      className="absolute inset-y-0 right-0 w-14 flex items-center justify-center text-slate-400 hover:text-slate-700"
                      aria-label={
                        showTrackingToken
                          ? 'ซ่อนรหัสติดตาม'
                          : 'แสดงรหัสติดตาม'
                      }
                    >
                      {showTrackingToken ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !trackingIdInput.trim()
                    }
                    className="h-14 px-8 rounded-2xl bg-gradient-to-r from-teal-600 to-blue-900 text-white font-semibold shadow-lg shadow-blue-200 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading
                      ? 'กำลังตรวจสอบ...'
                      : 'ตรวจสอบสถานะ'}
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={handleLegacySubmit}
                className="mt-6 text-left"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="legacy-tracking-id"
                      className="block text-sm font-semibold text-slate-700 mb-2"
                    >
                      หมายเลขคำร้องเดิม
                    </label>

                    <input
                      id="legacy-tracking-id"
                      type="text"
                      value={legacyTrackingId}
                      onChange={(event) =>
                        setLegacyTrackingId(
                          event.target.value
                            .toUpperCase(),
                        )
                      }
                      placeholder="REQ-XXXXXXXX"
                      autoComplete="off"
                      spellCheck={false}
                      required
                      className="w-full h-14 px-5 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 font-mono text-sm transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="legacy-phone"
                      className="block text-sm font-semibold text-slate-700 mb-2"
                    >
                      เบอร์โทรศัพท์ 4 ตัวท้าย
                    </label>

                    <input
                      id="legacy-phone"
                      type="text"
                      inputMode="numeric"
                      value={legacyPhoneLast4}
                      onChange={(event) =>
                        setLegacyPhoneLast4(
                          event.target.value
                            .replace(/\D/g, '')
                            .slice(0, 4),
                        )
                      }
                      placeholder="1234"
                      autoComplete="off"
                      maxLength={4}
                      pattern="[0-9]{4}"
                      required
                      className="w-full h-14 px-5 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 font-mono text-sm transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="legacy-event-date"
                      className="block text-sm font-semibold text-slate-700 mb-2"
                    >
                      วันที่เกิดเหตุ
                    </label>

                    <input
                      id="legacy-event-date"
                      type="date"
                      value={legacyEventDate}
                      onChange={(event) =>
                        setLegacyEventDate(
                          event.target.value,
                        )
                      }
                      required
                      className="w-full h-14 px-5 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 text-sm transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                 disabled={
  loading ||
  !legacyTrackingId.trim() ||
  legacyPhoneLast4.length !== 4 ||
  !legacyEventDate
}
                  className="mt-4 w-full h-14 rounded-2xl bg-gradient-to-r from-teal-600 to-blue-900 text-white font-semibold shadow-lg shadow-blue-200 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading
                    ? 'กำลังตรวจสอบ...'
                    : 'ตรวจสอบคำร้องเดิม'}
                </button>
              </form>
            )}

            <div className="mt-5 flex items-start justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />

              <p>
                ระบบจะแสดงเฉพาะข้อมูลสถานะ
                โดยไม่แสดงเลขบัตรประชาชน
                เบอร์โทรศัพท์ อีเมล หรือไฟล์แนบ
              </p>
            </div>
          </div>
          {error && (
            <div
              role="alert"
              className="max-w-2xl mx-auto mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-semibold flex items-center justify-center gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </section>

      {trackResult && (
        <div
          ref={resultSectionRef}
          className="mt-10 space-y-6 scroll-mt-8 animate-in fade-in slide-in-from-bottom-5 duration-500"
        >
          <section
            className={`relative overflow-hidden border-2 rounded-3xl p-7 sm:p-9 ${currentStatus.cardClassName}`}
          >
            <div className="absolute inset-x-0 top-0 h-2 bg-white/60">
              <div
                className={`h-full transition-all duration-700 ${currentStatus.progressClassName}`}
                style={{
                  width:
                    `${currentStatus.progress}%`,
                }}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-2">
              <div
                className={`w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 ${currentStatus.iconClassName}`}
              >
                <CurrentStatusIcon className="w-10 h-10" />
              </div>

              <div className="text-center sm:text-left flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  สถานะปัจจุบัน
                </p>

                <h2 className="text-3xl font-bold mt-2">
                  {currentStatus.title}
                </h2>

                <p className="text-slate-600 mt-2 leading-relaxed">
                  {currentStatus.description}
                </p>

                <p className="mt-4 font-mono text-sm font-bold text-slate-700">
                  {trackResult.trackingId}
                </p>
              </div>
            </div>
          </section>

          {trackResult.adminNote && (
            <section className="bg-slate-950 text-white rounded-3xl p-7 sm:p-9 shadow-xl">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-400">
                ข้อความจากเจ้าหน้าที่
              </p>

              <p className="mt-4 text-lg leading-relaxed">
                {trackResult.adminNote}
              </p>

              <p className="mt-5 text-xs text-slate-400">
                อัปเดตล่าสุด{' '}
                {formatTimestamp(
                  trackResult.updatedAt,
                )}
              </p>
            </section>
          )}

          <section className="bg-white border border-slate-200 rounded-3xl shadow-lg shadow-slate-200/30 overflow-hidden">
            <div className="p-7 sm:p-9 border-b border-slate-100">
              <h3 className="font-bold text-xl">
                รายละเอียดคำร้อง
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                แสดงเฉพาะข้อมูลที่จำเป็นสำหรับยืนยันคำร้อง
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-px bg-slate-100">
              <div className="bg-white p-7">
                <div className="flex items-center gap-3 text-slate-500 mb-3">
                  <CalendarDays className="w-5 h-5" />
                  <span className="text-sm font-semibold">
                    วันและเวลาเกิดเหตุ
                  </span>
                </div>

                <p className="font-bold text-slate-900">
                  {formatEventDate(
                    trackResult.eventDate,
                  )}
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  {trackResult.eventTimeStart ??
                    '--:--'}{' '}
                  –{' '}
                  {trackResult.eventTimeEnd ??
                    '--:--'}{' '}
                  น.
                </p>
              </div>

              <div className="bg-white p-7">
                <div className="flex items-center gap-3 text-slate-500 mb-3">
                  <Activity className="w-5 h-5" />
                  <span className="text-sm font-semibold">
                    ประเภทเหตุการณ์
                  </span>
                </div>

                <p className="font-bold text-slate-900">
                  {eventLabel}
                </p>
              </div>

              <div className="bg-white p-7">
                <div className="flex items-center gap-3 text-slate-500 mb-3">
                  <MapPin className="w-5 h-5" />
                  <span className="text-sm font-semibold">
                    สถานที่เกิดเหตุ
                  </span>
                </div>

                <p className="font-bold text-slate-900 leading-relaxed">
                  {trackResult.location ??
                    'ไม่ระบุ'}
                </p>
              </div>

              <div className="bg-white p-7">
                <div className="flex items-center gap-3 text-slate-500 mb-3">
                  <DeliveryIcon className="w-5 h-5" />
                  <span className="text-sm font-semibold">
                    ช่องทางรับผล
                  </span>
                </div>

                <p className="font-bold text-slate-900">
                  {deliveryLabel}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-7 sm:p-9 shadow-lg shadow-slate-200/30">
            <div className="flex items-center gap-3 mb-8">
              <History className="w-5 h-5 text-slate-500" />

              <div>
                <h3 className="font-bold text-xl">
                  ประวัติการดำเนินงาน
                </h3>

                <p className="text-sm text-slate-500">
                  เรียงจากรายการล่าสุด
                </p>
              </div>
            </div>

            {sortedHistory.length > 0 ? (
              <div className="space-y-4">
                {sortedHistory.map(
                  (historyItem, index) => {
                    const historyConfig =
                      STATUS_CONFIG[
                        historyItem.status
                      ] ??
                      DEFAULT_STATUS;

                    const HistoryIcon =
                      historyConfig.icon;

                    return (
                      <div
                        key={`${historyItem.timestamp}-${index}`}
                        className={`flex gap-4 p-5 rounded-2xl border ${
                          index === 0
                            ? 'bg-teal-50/60 border-teal-200'
                            : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${historyConfig.iconClassName}`}
                        >
                          <HistoryIcon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <p className="font-bold text-slate-900">
                              {
                                historyConfig.title
                              }
                            </p>

                            <time className="text-xs text-slate-500">
                              {formatTimestamp(
                                historyItem.timestamp,
                              )}
                            </time>
                          </div>

                          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                            {historyItem.note}
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">
                ยังไม่มีประวัติการดำเนินงาน
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default TrackView;