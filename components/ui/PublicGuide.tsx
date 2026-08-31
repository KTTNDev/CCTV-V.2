'use client';

import {
  BookOpen,
  Camera,
  ChevronDown,
  FileText,
  KeyRound,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';

import { useModalAccessibility } from '../../hooks/useModalAccessibility';

interface PublicGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onRequestClick: () => void;
}

const guideSections = [
  {
    title: 'ยื่นคำร้องขอภาพ',
    summary: 'สิ่งที่ต้องเตรียมและขั้นตอนยื่นคำร้อง',
    icon: FileText,
    content: (
      <ol className="space-y-3 text-sm leading-6 text-slate-600">
        <li><strong className="text-slate-900">1.</strong> เตรียมบัตรประชาชน ใบแจ้งความ และรายละเอียดวัน–เวลาเกิดเหตุ</li>
        <li><strong className="text-slate-900">2.</strong> กรอกแบบฟอร์ม ปักหมุดสถานที่ และแนบเอกสาร</li>
        <li><strong className="text-slate-900">3.</strong> ตรวจสอบข้อมูลก่อนยืนยัน แล้วเก็บรหัสติดตามไว้เป็นความลับ</li>
      </ol>
    ),
  },
  {
    title: 'ติดตามคำร้อง',
    summary: 'ตรวจสถานะและอ่านข้อความจากเจ้าหน้าที่',
    icon: Search,
    content: (
      <div className="space-y-3 text-sm leading-6 text-slate-600">
        <p>ใช้รหัสติดตามฉบับเต็มที่ได้รับหลังยื่นคำร้อง ระบบจะแสดงสถานะล่าสุดและสิ่งที่ต้องดำเนินการต่อ</p>
        <p className="flex items-start gap-2 text-amber-700"><KeyRound className="mt-1 h-4 w-4 shrink-0" />หากรหัสสูญหาย กรุณาติดต่อศูนย์ CCTV และยืนยันตัวตนกับเจ้าหน้าที่</p>
      </div>
    ),
  },
  {
    title: 'กล้องออนไลน์',
    summary: 'วิธีรับชมและเหตุผลที่จำกัดจำนวนกล้อง',
    icon: Camera,
    content: (
      <ul className="space-y-3 text-sm leading-6 text-slate-600">
        <li>• ระบบเชื่อมต่อวิดีโอเมื่อกดรับชมเท่านั้น จึงไม่เปิดทุกสตรีมพร้อมกัน</li>
        <li>• โหมดหลายกล้องเลือกได้สูงสุด 4 กล้อง และหยุดทั้งหมดได้ครั้งเดียว</li>
        <li>• ประชาชนเห็นเฉพาะกล้องที่อนุมัติให้เผยแพร่ ไม่เห็น RTSP URL, IP, ชื่อผู้ใช้ หรือรหัสผ่านของกล้อง</li>
      </ul>
    ),
  },
  {
    title: 'ความเป็นส่วนตัว',
    summary: 'การใช้เอกสารและข้อมูลตำแหน่ง',
    icon: ShieldCheck,
    content: (
      <div className="space-y-3 text-sm leading-6 text-slate-600">
        <p>เอกสารใช้เพื่อยืนยันคำร้องและการดำเนินงานของหน่วยงานเท่านั้น โดยจำกัดสิทธิ์การเข้าถึงสำหรับเจ้าหน้าที่ที่ได้รับอนุญาต</p>
        <p>จุดเหตุบนแผนที่สาธารณะเป็นข้อมูลรวมและปัดตำแหน่ง เพื่อลดความเสี่ยงต่อการระบุตัวบุคคล</p>
      </div>
    ),
  },
];

export default function PublicGuide({
  isOpen,
  onClose,
  onNavigate,
  onRequestClick,
}: PublicGuideProps) {
  const dialogRef = useModalAccessibility<HTMLElement>({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  const navigate = (view: string) => {
    onClose();
    onNavigate(view);
  };

  return (
    <div className="fixed inset-0 z-[140] flex justify-end bg-slate-950/60 backdrop-blur-sm" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="ปิดคู่มือ" />
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="public-guide-title" tabIndex={-1} className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl outline-none">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><BookOpen className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">Help center</p>
              <h2 id="public-guide-title" className="mt-0.5 text-xl font-bold text-slate-950">คู่มือการใช้งาน</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100" aria-label="ปิดคู่มือการใช้งาน"><X className="h-5 w-5" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-7">
          {guideSections.map((section) => {
            const Icon = section.icon;
            return (
              <details key={section.title} className="group border-b border-slate-200 py-1">
                <summary className="flex cursor-pointer list-none items-center gap-3 py-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900">{section.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{section.summary}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <div className="pb-5 pl-[3.25rem]">{section.content}</div>
              </details>
            );
          })}
        </div>

        <footer className="grid grid-cols-3 gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
          <button type="button" onClick={() => navigate('live-cameras')} className="rounded-xl border border-slate-200 bg-white px-2 py-3 text-xs font-bold text-slate-700">กล้องสด</button>
          <button type="button" onClick={() => navigate('track')} className="rounded-xl border border-slate-200 bg-white px-2 py-3 text-xs font-bold text-slate-700">ติดตาม</button>
          <button type="button" onClick={() => { onClose(); onRequestClick(); }} className="rounded-xl px-2 py-3 text-xs font-bold text-white" style={{ background: 'var(--brand-gradient)' }}>ยื่นคำร้อง</button>
        </footer>
      </section>
    </div>
  );
}
