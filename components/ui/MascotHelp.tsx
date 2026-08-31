'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  FileCheck2,
  FileWarning,
  MapPin,
  MessageCircleQuestion,
  SearchCheck,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';

type PublicView =
  | 'home'
  | 'request'
  | 'success'
  | 'track'
  | 'live-cameras';

interface MascotHelpProps {
  view: string;
  onNavigate: (view: PublicView) => void;
  onRequestClick: () => void;
}

interface HelpTopic {
  id: string;
  question: string;
  answer: string;
  icon: React.ComponentType<{
    className?: string;
    'aria-hidden'?: boolean;
  }>;
  action?: {
    label: string;
    view?: PublicView;
    request?: boolean;
  };
}

const STORAGE_KEY =
  'rawai-cctv-mascot-hidden';

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'submit',
    question: 'ยื่นคำร้องขอภาพอย่างไร?',
    answer:
      'กด “ยื่นคำร้อง” กรอกข้อมูลผู้ยื่น วัน เวลา สถานที่และรายละเอียดเหตุการณ์ จากนั้นแนบหลักฐาน ตรวจทานข้อมูล และยืนยันการส่งคำร้อง',
    icon: FileCheck2,
    action: {
      label: 'ไปหน้ายื่นคำร้อง',
      request: true,
    },
  },
  {
    id: 'documents',
    question: 'ต้องเตรียมเอกสารอะไรบ้าง?',
    answer:
      'เตรียมบัตรประชาชนหรือหนังสือเดินทาง ใบแจ้งความ และภาพเหตุการณ์ที่เกี่ยวข้อง ระบบรองรับ JPG, PNG, WEBP และ PDF ขนาดไม่เกิน 10 MB ต่อไฟล์',
    icon: FileWarning,
  },
  {
    id: 'location',
    question: 'ระบุตำแหน่งเกิดเหตุอย่างไร?',
    answer:
      'ค้นหาหรือปักหมุดบนแผนที่ให้ใกล้จุดเกิดเหตุที่สุด และเขียนจุดสังเกต เช่น ชื่อถนน ร้านค้า หรือแยกใกล้เคียง เพื่อช่วยให้เจ้าหน้าที่ค้นหากล้องได้เร็วขึ้น',
    icon: MapPin,
  },
  {
    id: 'tracking',
    question: 'ติดตามคำร้องได้ที่ไหน?',
    answer:
      'ใช้รหัสติดตามที่ได้รับหลังส่งคำร้องในหน้า “ติดตามสถานะ” ควรเก็บรหัสนี้ไว้เป็นความลับ เพราะใช้เปิดดูความคืบหน้าของคำร้อง',
    icon: SearchCheck,
    action: {
      label: 'ไปหน้าติดตามสถานะ',
      view: 'track',
    },
  },
  {
    id: 'upload',
    question: 'แนบไฟล์ไม่สำเร็จ ทำอย่างไร?',
    answer:
      'ตรวจว่าชนิดและขนาดไฟล์ถูกต้อง เปลี่ยนชื่อไฟล์ให้สั้นและไม่มีอักขระพิเศษ แล้วลองใหม่บนอินเทอร์เน็ตที่เสถียร หากยังไม่สำเร็จ ให้เก็บภาพหน้าจอข้อความแจ้งเตือนไว้แจ้งเจ้าหน้าที่',
    icon: CircleHelp,
  },
  {
    id: 'cameras',
    question: 'กล้องออนไลน์ใช้งานอย่างไร?',
    answer:
      'เลือกหมวดหมู่และกล้องที่ต้องการ ระบบจะเปิดภาพเฉพาะกล้องที่เลือกเพื่อลดการใช้ข้อมูล หากกล้องขึ้นสถานะซ่อมบำรุงหรือออฟไลน์ จะยังไม่สามารถรับชมได้',
    icon: Video,
    action: {
      label: 'ดูกล้องออนไลน์',
      view: 'live-cameras',
    },
  },
  {
    id: 'privacy',
    question: 'ข้อมูลส่วนตัวปลอดภัยอย่างไร?',
    answer:
      'กรอกเฉพาะข้อมูลที่จำเป็น ไม่ส่งรหัสติดตามหรือเอกสารส่วนตัวให้บุคคลอื่น และใช้งานผ่านเว็บไซต์ทางการเท่านั้น เจ้าหน้าที่ใช้ข้อมูลเพื่อพิจารณาคำร้องตามวัตถุประสงค์ของระบบ',
    icon: ShieldCheck,
  },
];

const VIEW_SUGGESTION: Record<
  PublicView,
  string
> = {
  home: 'submit',
  request: 'documents',
  success: 'tracking',
  track: 'tracking',
  'live-cameras': 'cameras',
};

export default function MascotHelp({
  view,
  onNavigate,
  onRequestClick,
}: MascotHelpProps) {
  const [isOpen, setIsOpen] =
    useState(false);
  const [isHidden, setIsHidden] =
    useState(false);
  const [selectedTopicId, setSelectedTopicId] =
    useState<string | null>(null);
  const [showIntroduction, setShowIntroduction] =
    useState(true);
  const [storageReady, setStorageReady] =
    useState(false);

  const publicView = (
    view in VIEW_SUGGESTION
      ? view
      : 'home'
  ) as PublicView;

  const orderedTopics = useMemo(() => {
    const suggested =
      VIEW_SUGGESTION[publicView];

    return [...HELP_TOPICS].sort(
      (left, right) =>
        Number(right.id === suggested) -
        Number(left.id === suggested),
    );
  }, [publicView]);

  const selectedTopic = HELP_TOPICS.find(
    (topic) => topic.id === selectedTopicId,
  );

  useEffect(() => {
    try {
      setIsHidden(
        window.localStorage.getItem(
          STORAGE_KEY,
        ) === 'true',
      );
    } catch {
      // Storage may be disabled; the helper still works.
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () =>
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
  }, [isOpen]);

  useEffect(() => {
    if (
      !storageReady ||
      isHidden ||
      isOpen ||
      !showIntroduction
    ) {
      return;
    }

    const timer = window.setTimeout(
      () => setShowIntroduction(false),
      9_000,
    );

    return () =>
      window.clearTimeout(timer);
  }, [
    isHidden,
    isOpen,
    showIntroduction,
    storageReady,
  ]);

  const updateHidden = (hidden: boolean) => {
    setIsHidden(hidden);
    setIsOpen(false);
    setSelectedTopicId(null);

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        String(hidden),
      );
    } catch {
      // Storage may be disabled; keep the in-memory preference.
    }
  };

  const runAction = (
    topic: HelpTopic,
  ) => {
    if (!topic.action) return;

    setIsOpen(false);

    if (topic.action.request) {
      onRequestClick();
      return;
    }

    if (topic.action.view) {
      onNavigate(topic.action.view);
    }
  };

  if (!storageReady) return null;

  const isHomeView = view === 'home';

  if (isHidden) {
    return (
      <button
        type="button"
        onClick={() => updateHidden(false)}
        className={`${isHomeView ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 sm:bottom-[max(1rem,env(safe-area-inset-bottom))] sm:left-6' : 'right-3 top-20'} fixed z-[80] flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700 focus-visible:ring-4 focus-visible:ring-emerald-100`}
        aria-label="แสดงน้องกังหัน ผู้ช่วยการใช้งาน"
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">เรียกน้องกังหัน</span>
      </button>
    );
  }

  return (
    <aside
      className={`${isHomeView ? 'bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-2 sm:bottom-5 sm:left-6' : 'right-3 top-20'} fixed z-[80]`}
      aria-label="น้องกังหัน ผู้ช่วยตอบคำถามการใช้งาน"
    >
      {isOpen && (
        <section
          id="mascot-help-panel"
          role="region"
          aria-label="คำถามที่พบบ่อย"
          className={`${isHomeView ? 'bottom-[6.5rem] left-0 sm:bottom-[10rem]' : 'right-0 top-[4.5rem]'} mascot-help-pop pointer-events-auto absolute flex max-h-[min(70vh,38rem)] w-[min(calc(100vw-1rem),24rem)] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/20`}
        >
          <div className="relative overflow-hidden px-5 pb-5 pt-4 text-white" style={{ background: 'var(--brand-gradient)' }}>
            <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-emerald-300/15 blur-2xl" aria-hidden="true" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                  <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
                  น้องกังหัน · ผู้ช่วยประจำระบบ
                </div>
                <h2 className="mt-2 text-xl font-black tracking-tight">
                  สวัสดี! น้องกังหันเอง
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-200">
                  ช่วยแนะนำการยื่นคำร้อง ติดตามสถานะ และใช้งานบริการต่าง ๆ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20 focus-visible:ring-4 focus-visible:ring-white/30"
                aria-label="ปิดหน้าช่วยเหลือ"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-4">
            {selectedTopic ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => setSelectedTopicId(null)}
                  className="mb-4 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  ← กลับไปดูคำถามทั้งหมด
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <selectedTopic.icon className="h-5 w-5" aria-hidden={true} />
                </div>
                <h3 className="mt-3 text-base font-black text-slate-900">
                  {selectedTopic.question}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {selectedTopic.answer}
                </p>
                {selectedTopic.action && (
                  <button
                    type="button"
                    onClick={() => runAction(selectedTopic)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110 focus-visible:ring-4 focus-visible:ring-emerald-100"
                    style={{ background: 'var(--brand-gradient)' }}
                  >
                    {selectedTopic.action.label}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {orderedTopics.map((topic, index) => {
                  const TopicIcon = topic.icon;
                  const isSuggested = index === 0;

                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSelectedTopicId(topic.id)}
                      className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus-visible:ring-4 focus-visible:ring-emerald-100"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-emerald-50 group-hover:text-emerald-700">
                        <TopicIcon className="h-5 w-5" aria-hidden={true} />
                      </span>
                      <span className="min-w-0 flex-1">
                        {isSuggested && (
                          <span className="mb-0.5 block text-[9px] font-black uppercase tracking-[0.12em] text-emerald-600">
                            แนะนำสำหรับหน้านี้
                          </span>
                        )}
                        <span className="block text-sm font-bold leading-snug text-slate-800">
                          {topic.question}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
            <p className="text-[10px] leading-relaxed text-slate-500">
              คำตอบอัตโนมัติจากคู่มือระบบ ไม่ใช่ AI
            </p>
            <button
              type="button"
              onClick={() => updateHidden(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              ซ่อนน้องกังหัน
            </button>
          </div>
        </section>
      )}

      <div className="pointer-events-auto flex items-end gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => {
            setShowIntroduction(false);
            setIsOpen((current) => !current);
          }}
          aria-expanded={isOpen}
          aria-controls="mascot-help-panel"
          aria-label={isOpen ? 'ปิดน้องกังหัน' : 'เปิดน้องกังหัน ผู้ช่วยการใช้งาน'}
          className={`${isHomeView ? 'h-[5.75rem] w-[7.25rem] sm:h-[7.25rem] sm:w-[9.25rem]' : 'h-14 w-[4.5rem]'} group relative overflow-visible rounded-[1.5rem] bg-transparent transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 sm:rounded-[2rem]`}
        >
          <span className="mascot-help-badge absolute right-2 top-1 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-[#43b99a] text-white shadow-md ring-2 ring-white sm:right-3">
            <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="mascot-help-shadow absolute bottom-0 left-1/2 h-3 w-16 -translate-x-1/2 rounded-full bg-slate-900/15 blur-sm" aria-hidden="true" />
          <span className="mascot-help-float absolute inset-0" aria-hidden="true">
            {/* Preserve the supplied transparent mascot artwork and its original proportions. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/rawai-mascot.png"
              alt=""
              width={732}
              height={525}
              draggable={false}
              className="h-full w-full scale-[1.32] select-none object-contain object-bottom drop-shadow-[0_12px_16px_rgba(15,23,42,0.2)]"
            />
          </span>
        </button>
        {!isOpen && showIntroduction && (
          <div className="mascot-help-pop mascot-help-speech mb-14 hidden max-w-[13.5rem] rounded-2xl rounded-bl-sm border border-emerald-100 bg-white px-4 py-3 leading-relaxed text-slate-700 shadow-lg shadow-slate-950/10">
            <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
              น้องกังหัน
            </span>
            <span className="mt-0.5 block text-xs font-bold">
              สวัสดี! ผู้ช่วยประจำระบบ มีข้อสงสัยกดถามได้เลย
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
