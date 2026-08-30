'use client';
import React from 'react';
import { Upload } from 'lucide-react';

const LoadingOverlay = () => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label="กำลังส่งข้อมูลคำร้อง"
    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
  >
    <div className="bg-white rounded-2xl p-10 shadow-2xl flex flex-col items-center max-w-xs w-full mx-6 text-center animate-in zoom-in-95 duration-300 border border-white/20">
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-full border-[5px] border-slate-100"></div>
        <div className="absolute top-0 left-0 w-20 h-20 rounded-full border-[5px] border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <Upload aria-hidden="true" className="w-8 h-8 text-emerald-500 animate-pulse" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">กำลังส่งข้อมูล</h3>
      <p className="text-slate-500 text-sm font-medium leading-relaxed">
        กรุณารอสักครู่... <br/>
        ระบบกำลังบันทึกข้อมูลของท่าน
      </p>
    </div>
  </div>
);

export default LoadingOverlay;
