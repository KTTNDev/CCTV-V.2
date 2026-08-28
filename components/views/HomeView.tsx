'use client';

import React, {
  useEffect,
  useState,
} from 'react';
import {
  getPublicStats,
} from '../../lib/api-client';
import type {
  PublicHotspot,
} from '../../lib/api-client';
import AccidentMap from '../ui/AccidentMap';
import LiveCCTVGallery from '../ui/LiveCCTVGallery';

import { 
  Camera, Play, Maximize2, Radio, Search, FileText, Upload, CheckCircle, User, Activity, 
  ShieldCheck, Zap, Lock, Settings, LayoutGrid, X, Calendar, 
  MapPinned, Megaphone, Building2, ExternalLink, Globe, Users, Building,
} from 'lucide-react';

interface HomeViewProps {
  setView: (view: string) => void;
  onRequestClick: () => void;
}

// URL กล้องแหลมพรหมเทพ (ตัวอย่าง YouTube Live)
const PROMTHEP_LIVE_URL = "https://www.youtube.com/embed/JBjVYDDx_dA?autoplay=1&mute=1&controls=0&loop=1"; 

const HomeView: React.FC<HomeViewProps> = ({ setView, onRequestClick }) => {
  const [showLiveModal, setShowLiveModal] = useState(false);
  
  const [
    stats,
    setStats,
  ] = useState({
    total: 0,
    successRate: 0,
    pending: 0,
  });

  const [
    visitorStats,
    setVisitorStats,
  ] = useState({
    today: 0,
    total: 0,
  });

  const [
    hotspots,
    setHotspots,
  ] = useState<PublicHotspot[]>([]);

  const [
    statsLoading,
    setStatsLoading,
  ] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const brandGradient = "linear-gradient(90deg, hsla(160, 50%, 51%, 1) 0%, hsla(247, 60%, 21%, 1) 100%)";

  const quickLinks = [
    { name: "หน้าหลักรวมบริการ", url: "https://e-service-rawai-center.vercel.app/", imageUrl: "https://www.rawai.go.th/images/header-72-1/logo_0004.png",  color:  "bg-blue-50" },
    { name: "กิจกรรมราไวย์", url: "https://www.rawai.go.th/event.php", imageUrl: "https://www.rawai.go.th/images/header-72-1/logo_0004.png", color: "bg-blue-50"  },
    { name: "Rawai One Map", url: "https://rawai-one-map.web.app/",imageUrl: "https://www.rawai.go.th/images/header-72-1/logo_0004.png", color: "bg-blue-50" },
    { name: "Traffy Fondue", url: "https://landing.traffy.in.th?key=elqOlHUe",  imageUrl: "https://www.nstda.or.th/nac/2023/wp-content/uploads/2023/03/ex-faeature-image_ex07.webp", color: "bg-blue-50"  },
    { name: "ระบบ E-Office", url: "https://rawai.s.eoffice.go.th/portal/home", imageUrl: "https://www.eoffice.go.th/img/Logo-e-Office.png", color: "bg-indigo-50" },
    { name: "ศูนย์บริการ OSS", url: "https://www.dla.go.th/land/oss.do", imageUrl: "https://www.dla.go.th/images/logo.png", color: "bg-blue-50"  }
  ];
  useEffect(() => {
    let cancelled = false;

    const visitSessionKey =
      'rawai_public_visit_2026';

    const loadPublicStatistics =
      async (): Promise<void> => {
        const storedVisitState =
          sessionStorage.getItem(
            visitSessionKey,
          );

        const shouldRecordVisit =
          storedVisitState === null;

        if (shouldRecordVisit) {
          // ป้องกัน React Strict Mode
          // เรียกนับซ้ำใน Development
          sessionStorage.setItem(
            visitSessionKey,
            'pending',
          );
        }

        try {
          const result =
            await getPublicStats(
              shouldRecordVisit,
            );

          if (shouldRecordVisit) {
            sessionStorage.setItem(
              visitSessionKey,
              'recorded',
            );
          }

          if (cancelled) {
            return;
          }

          setStats({
            total:
              result.requests.total,

            successRate:
              result.requests
                .successRate,

            pending:
              result.requests.pending,
          });

          setVisitorStats({
            today:
              result.visitors.today,

            total:
              result.visitors.total,
          });

          setHotspots(
            result.hotspots,
          );
        } catch (statisticsError) {
          if (shouldRecordVisit) {
            sessionStorage.removeItem(
              visitSessionKey,
            );
          }

          if (!cancelled) {
            console.warn(
              'Public statistics unavailable:',
              statisticsError,
            );
          }
        } finally {
          if (!cancelled) {
            setStatsLoading(false);
          }
        }
      };

    void loadPublicStatistics();

    return () => {
      cancelled = true;
    };
  }, []);
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 font-sans text-slate-900 selection:bg-teal-100">
      
      {/* 🛠️ Floating Menu */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
        {isMenuOpen && (
          <div className="mb-2 w-64 bg-white/80 backdrop-blur-2xl rounded-2xl border border-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
            <div className="p-6 bg-slate-900/5 border-b border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rawai Services</p>
              <h4 className="text-sm font-bold text-slate-800">ทางเข้าบริการอื่นๆ</h4>
            </div>
            <div className="p-3 space-y-1">
              {quickLinks.map((link, idx) => (
                <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white hover:shadow-md transition-all group">
                  <div className={`w-10 h-10 rounded-xl ${link.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}><img src= {link.imageUrl} className="w-7" /></div>
                  <div className="flex-1 text-left"><p className="text-xs font-bold text-slate-700 leading-tight">{link.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">เข้าใช้งาน</p></div>
                  <ExternalLink className="w-3 h-3 text-slate-300" />
                </a>
              ))}
            </div>
          </div>
        )}
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 hover:scale-110 text-white" style={{ background: isMenuOpen ? '#0f172a' : brandGradient }}>
          {isMenuOpen ? <X className="w-8 h-8" /> : <LayoutGrid className="w-8 h-8" />}
          {!isMenuOpen && <span className="absolute top-0 right-0 w-4 h-4 bg-red-50 border-2 border-white rounded-full animate-ping"></span>}
        </button>
      </div>

      {/* --- Section: Hero (🚀 Improved Version with Live Card) --- */}
     <section className="relative pt-28 pb-40 md:pt-40 md:pb-52 overflow-hidden text-white">
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center parallax-bg"
            style={{ 
              backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.98), #f8fafc), url('/Untitled design (12).png')`,
              backgroundAttachment: 'fixed',
              backgroundColor: '#0f172a'
            }}
          ></div>
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] rounded-full blur-[120px] opacity-20" style={{ background: brandGradient }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* 📝 ฝั่งซ้าย: ข้อความ (ปรับลดขนาดเหลือ col-span-5 เพื่อแบ่งพื้นที่ให้กล้อง) */}
          <div className="lg:col-span-5 text-left animate-in fade-in slide-in-from-left-12 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-300 text-[9px] md:text-xs font-bold uppercase tracking-widest mb-6 shadow-2xl">
              <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              <span>Smart CCTV Portal • 2026</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[0.95] mb-6 drop-shadow-2xl">
              ขอข้อมูลภาพ <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">
                กล้องวงจรปิด
              </span>
            </h1>
            
            <p className="max-w-md text-slate-300 text-sm md:text-lg leading-relaxed mb-8 font-medium opacity-80">
              ยกระดับความปลอดภัยชาวราไวย์ด้วยระบบดิจิทัล <br className="hidden md:block" /> 
              สัมผัสความโปร่งใสผ่านกล้องสดแหลมพรหมเทพ
            </p>

            <div className="flex flex-col gap-4">
              <button 
                onClick={onRequestClick} 
                className="group relative w-full px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 overflow-hidden" 
                style={{ background: brandGradient }}
              >
                <Camera className="w-6 h-6" />
                <span>ยื่นคำร้องออนไลน์</span>
              </button>
              <button 
                onClick={() => setView('track')} 
                className="w-full px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-xl text-white font-bold text-lg border border-white/20 shadow-xl transition-all hover:bg-white/20"
              >
                <span>ติดตามสถานะคำร้อง</span>
              </button>
            </div>
          </div>

          {/* 🎥 ฝั่งขวา: Live Stream Card (ขยายร่างเป็น col-span-7) */}
          <div className="lg:col-span-7 relative group animate-in fade-in slide-in-from-right-12 duration-1000">
            {/* กล่องวิดีโอที่ใหญ่ขึ้นและดูพรีเมียมขึ้น */}
            <div className="relative p-2.5 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-[0_45px_100px_-20px_rgba(0,0,0,0.6)] overflow-hidden transition-all group-hover:shadow-[0_45px_100px_-10px_rgba(16,185,129,0.3)] group-hover:scale-[1.01]">
              
              {/* Live Badge แบบใหม่ */}
              <div className="absolute top-8 left-8 z-20 flex items-center gap-2.5 px-4 py-2 bg-red-600 rounded-full text-white text-xs font-bold uppercase tracking-wide shadow-2xl">
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></div>
                <Radio className="w-4 h-4" />
                Live Phromthep Cape
              </div>

              {/* Video Content: เพิ่มความสูงและเงาภายใน */}
              <div className="aspect-video w-full rounded-3xl overflow-hidden bg-slate-900 relative shadow-inner">
                <iframe 
                  className="w-full h-full object-cover scale-105 pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity" 
                  src={PROMTHEP_LIVE_URL}
                  title="Promthep Live Stream"
                  allow="autoplay; encrypted-media"
                ></iframe>
                
                {/* Overlay ป้องกันแสงจ้าเกินไป */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                
                <div className="absolute bottom-8 left-8 z-20 flex items-end justify-between right-8">
                  <div>
                    <p className="text-white text-xl font-bold tracking-tight">Promthep Cape, Phuket</p>
                    <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Real-time Monitoring System</p>
                  </div>
                  
                  {/* ปุ่ม Maximize ที่ดูเด่นขึ้น */}
                  <button 
                    onClick={() => setShowLiveModal(true)}
                    className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-2xl transition-all hover:bg-emerald-400 hover:rotate-6 active:scale-90"
                  >
                    <Maximize2 className="w-7 h-7" />
                  </button>
                </div>
              </div>
            </div>
           
          </div>
        </div>

        {/* 📊 Horizontal Stats Overlay (Bottom of Banner) */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 mt-20 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-3xl">
            <p className="text-[15px] text-emerald-300 font-bold uppercase tracking-widest mb-1">จำนวนคำร้องทั้งหมด</p>
            <p className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-3xl">
            <p className="text-[15px] text-emerald-300 font-bold uppercase tracking-widest mb-1">อัตราการดำเนินการ</p>
            <p className="text-2xl font-bold text-white">{stats.successRate}%</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-3xl">
            <p className="text-[15px] text-emerald-300 font-bold uppercase tracking-widest mb-1">คำร้องที่รอดำเนินการ</p>
            <p className="text-2xl font-bold text-white">{stats.pending.toLocaleString()}</p>
          </div>
        </div>
      </section>

      {/* --- 🎬 Live Full Modal (Popup) --- */}
      {showLiveModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 bg-slate-900/95 backdrop-blur-xl">
          <button 
            onClick={() => setShowLiveModal(false)}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="w-full max-w-6xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <iframe 
              className="w-full h-full" 
              src={PROMTHEP_LIVE_URL.replace("controls=0", "controls=1")}
              title="Full Live Phromthep"
              allow="autoplay; encrypted-media; fullscreen"
            ></iframe>
          </div>
        </div>
      )}

      {/* --- Existing Sections Below --- */}
      <section className="py-24 bg-slate-50/50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6 mb-20">
  <AccidentMap
    points={hotspots}
    loading={statsLoading}
  />
</div>
      </section>

     
      <section className="py-20 bg-slate-50/50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="flex flex-col md:flex-row items-center gap-10 p-12 bg-white rounded-3xl border border-slate-100 shadow-lg text-left mb-16">
            <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center text-teal-600 flex-shrink-0"><ShieldCheck className="w-10 h-10" /></div>
            <div><h4 className="text-2xl font-bold text-slate-900">ปกป้องข้อมูลมาตรฐาน PDPA</h4><p className="text-slate-500 font-medium">ข้อมูลของท่านจะได้รับการจัดการอย่างรัดกุมตามกฎหมายความปลอดภัยข้อมูลส่วนบุคคล</p></div>
          </div>

          <div className="pt-12 border-t border-slate-200">
            <div className="flex items-center justify-center gap-6 mb-8 text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[11px] font-bold uppercase tracking-widest">เข้าชมวันนี้: {visitorStats.today.toLocaleString()}</span>
              </div>
              <div className="w-px h-3 bg-slate-200"></div>
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3" />
                <span className="text-[11px] font-bold uppercase tracking-widest">สะสมทั้งหมด: {visitorStats.total.toLocaleString()}</span>
              </div>
            </div>

            <button onClick={() => setView('admin-login')} className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 rounded-2xl transition-all font-bold text-sm mx-auto shadow-sm hover:shadow-md group">
              <Lock className="w-4 h-4 group-hover:text-blue-600" />เจ้าหน้าที่ เข้าสู่ระบบ
            </button>
            <p className="mt-6 text-[10px] text-slate-300 font-bold uppercase tracking-widest">Copyright © 2026 Rawai Municipality CCTV Service Portal</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeView;