'use client';

import React from 'react';
import {
  BookOpen,
  House,
  LayoutGrid,
  Search,
  Video,
} from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';

interface NavbarProps {
  view: string;
  setView: (view: string) => void;
  onRequestClick: () => void;
  onGuideClick: () => void;
  guideOpen?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ view, setView, onRequestClick, onGuideClick, guideOpen = false }) => {
  
  // โทนสี Gradient เดียวกับหน้าอื่นๆ
  const brandGradient = "var(--brand-gradient)";

  return (
    <>
    <nav aria-label="เมนูหลัก" className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/60 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between md:h-20">
          
          {/* --- Brand Logo Area --- */}
         <button
  type="button"
  onClick={() => setView('home')}
  aria-label="กลับหน้าหลัก CCTV Rawai"
  className="group flex items-center gap-3.5 rounded-xl text-left select-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
>
            <div className="relative h-12 w-12 rounded-xl overflow-hidden shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 bg-slate-100 flex-shrink-0">
               {/* Static export keeps this externally hosted municipal logo unoptimized. */}
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img 
                  src="https://lh3.googleusercontent.com/d/1QCbgntRqbIAlTmTBE85DEtJtx91U-1ll?authuser=0" 
                  alt="Rawai CCTV Logo" 
                  width={48}
                  height={48}
                  decoding="async"
                  className="w-full h-full object-cover"
               />
            </div>
            
            <div className="hidden flex-col justify-center sm:flex">
              <span className="font-bold text-lg leading-none text-slate-800 tracking-tight group-hover:text-slate-900 transition-colors">
                CCTV RAWAI
              </span>
              <span 
                className="text-[10px] font-bold uppercase tracking-wide bg-clip-text text-transparent mt-1"
                style={{ backgroundImage: brandGradient }}
              >
                E-Service Portal
              </span>
            </div>
          </button>
          
          {/* --- Navigation & Admin Login --- */}
          <div className="flex items-center gap-2 md:gap-4">
            <ThemeToggle />

            {/* Desktop Navigation (Segmented Control Style) */}
            <div className="hidden md:flex items-center gap-1.5 p-1.5 bg-slate-100/60 rounded-2xl border border-slate-200/50">
              <button
                type="button"
                onClick={() => setView('live-cameras')}
                aria-current={view === 'live-cameras' ? 'page' : undefined}
                className={`relative flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                  view === 'live-cameras'
                    ? 'bg-white text-slate-900 shadow-sm shadow-slate-200/50 ring-1 ring-black/5'
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                }`}
              >
                <Video className={`h-4 w-4 ${view === 'live-cameras' ? 'text-emerald-600' : 'text-slate-400'}`} />
                กล้องออนไลน์
              </button>
              <button 
                type="button"
                onClick={onRequestClick}
                aria-current={view === 'request' ? 'page' : undefined}
                className={`
                  relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2
                  ${view === 'request' 
                    ? 'bg-white text-slate-900 shadow-sm shadow-slate-200/50 ring-1 ring-black/5' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                  }
                `}
              >
                <LayoutGrid className={`w-4 h-4 ${view === 'request' ? 'text-teal-600' : 'text-slate-400'}`} />
                ยื่นคำร้อง
              </button>

              <button 
                type="button"
                onClick={() => setView('track')}
                aria-current={view === 'track' ? 'page' : undefined}
                className={`
                  relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2
                  ${view === 'track' 
                    ? 'bg-white text-slate-900 shadow-sm shadow-slate-200/50 ring-1 ring-black/5' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                  }
                `}
              >
                <Search className={`w-4 h-4 ${view === 'track' ? 'text-indigo-600' : 'text-slate-400'}`} />
                ติดตามสถานะ
              </button>
              <button
                type="button"
                onClick={onGuideClick}
                aria-expanded={guideOpen}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300 ${guideOpen ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'}`}
              >
                <BookOpen className="h-4 w-4 text-slate-400" />
                คู่มือ
              </button>
            </div>

          
          </div>
        </div>
      </div>

    </nav>

      <nav aria-label="เมนูแอปบนมือถือ" className="fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200/80 bg-white/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_32px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-0.5">
          {[
            { id: 'home', label: 'หน้าหลัก', icon: House, action: () => setView('home') },
            { id: 'live-cameras', label: 'กล้องสด', icon: Video, action: () => setView('live-cameras') },
            { id: 'request', label: 'ยื่นคำร้อง', icon: LayoutGrid, action: onRequestClick },
            { id: 'track', label: 'ติดตาม', icon: Search, action: () => setView('track') },
            { id: 'guide', label: 'คู่มือ', icon: BookOpen, action: onGuideClick },
          ].map((item) => {
            const Icon = item.icon;
            const active = item.id === 'guide' ? guideOpen : view === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 ${
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {active && <span className="absolute top-0 h-0.5 w-7 rounded-full bg-emerald-500" aria-hidden="true" />}
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
