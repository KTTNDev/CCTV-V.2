'use client';

import React from 'react';
import {
  LayoutGrid,
  Search,
  Video,
} from 'lucide-react';

interface NavbarProps {
  view: string;
  setView: (view: string) => void;
  onRequestClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ view, setView, onRequestClick }) => {
  
  // โทนสี Gradient เดียวกับหน้าอื่นๆ
  const brandGradient = "linear-gradient(90deg, hsla(160, 50%, 51%, 1) 0%, hsla(247, 60%, 21%, 1) 100%)";

  return (
    <nav aria-label="เมนูหลัก" className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/60 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
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
            
            <div className="flex flex-col justify-center">
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
            <div className="flex items-center gap-1.5 md:hidden">
              <button
                type="button"
                onClick={() => setView('live-cameras')}
                aria-label="ดูกล้องออนไลน์"
                aria-current={view === 'live-cameras' ? 'page' : undefined}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 ${
                  view === 'live-cameras'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <Video className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onRequestClick}
                aria-label="ยื่นคำร้อง"
                aria-current={view === 'request' ? 'page' : undefined}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 ${
                  view === 'request'
                    ? 'border-teal-200 bg-teal-50 text-teal-700'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <LayoutGrid className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setView('track')}
                aria-label="ติดตามสถานะคำร้อง"
                aria-current={view === 'track' ? 'page' : undefined}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${
                  view === 'track'
                    ? 'border-blue-200 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

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
            </div>

          
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
