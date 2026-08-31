'use client';

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  collection,
  onSnapshot,
  query as firestoreQuery,
  where,
} from 'firebase/firestore';
import {
  getPublicStats,
} from '../../lib/api-client';
import type {
  PublicHotspot,
} from '../../lib/api-client';
import AccidentMap from '../ui/AccidentMap';
import { db } from '../../lib/firebase';
import {
  PUBLIC_CAMERAS,
  normalizePublicCamera,
  type PublicCamera,
} from '../../lib/public-cameras';
import {
  useModalAccessibility,
} from '../../hooks/useModalAccessibility';

import {
  Camera,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Globe,
  LayoutGrid,
  Maximize2,
  Radio,
  SearchCheck,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';

interface HomeViewProps {
  setView: (view: string) => void;
  onRequestClick: () => void;
}

// URL กล้องแหลมพรหมเทพ (ตัวอย่าง YouTube Live)
const PROMTHEP_LIVE_URL = "https://www.youtube.com/embed/JBjVYDDx_dA?autoplay=1&mute=1&controls=0&loop=1"; 

const HomeView: React.FC<HomeViewProps> = ({ setView, onRequestClick }) => {
  const [showLiveModal, setShowLiveModal] = useState(false);

  const closeLiveModal =
    useCallback(() => {
      setShowLiveModal(false);
    }, []);

  const liveDialogRef =
    useModalAccessibility({
      isOpen: showLiveModal,
      onClose: closeLiveModal,
    });
  
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
  const [
    publicCameras,
    setPublicCameras,
  ] = useState<PublicCamera[]>([]);
  const [
    camerasLoading,
    setCamerasLoading,
  ] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const brandGradient = "var(--brand-gradient)";

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

  useEffect(() => {
    const cameraQuery = firestoreQuery(
      collection(db, 'public_cameras'),
      where('published', '==', true),
    );

    return onSnapshot(
      cameraQuery,
      (snapshot) => {
        const cameras = snapshot.docs
          .flatMap((cameraDocument) => {
            const camera = normalizePublicCamera(
              cameraDocument.id,
              cameraDocument.data(),
            );

            return camera ? [camera] : [];
          })
          .sort(
            (left, right) =>
              left.sortOrder - right.sortOrder,
          );

        setPublicCameras(cameras);
        setCamerasLoading(false);
      },
      (cameraError) => {
        console.warn(
          'Public camera map unavailable:',
          cameraError,
        );
        setPublicCameras(PUBLIC_CAMERAS);
        setCamerasLoading(false);
      },
    );
  }, []);
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 font-sans text-slate-900 selection:bg-teal-100">
      
      {/* 🛠️ Floating Menu */}
      <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-[90] flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
        {isMenuOpen && (
          <div className="mb-2 w-72 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-2xl rounded-2xl border border-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
            <div className="p-6 bg-slate-900/5 border-b border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rawai Services</p>
              <h4 className="text-sm font-bold text-slate-800">ทางเข้าบริการอื่นๆ</h4>
            </div>
            <div className="p-3 space-y-1">
             {quickLinks.map((link) => (
  <a
    key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white hover:shadow-md transition-all group">
                  <div className={`w-10 h-10 rounded-xl ${link.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    {/* Service icons are owned and hosted by their destination services. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
  src={link.imageUrl}
  alt=""
  width={28}
  height={28}
  loading="lazy"
  decoding="async"
  className="h-7 w-7 object-contain"
/>
                  </div>
                  <div className="flex-1 text-left"><p className="text-xs font-bold text-slate-700 leading-tight">{link.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">เข้าใช้งาน</p></div>
                  <ExternalLink className="w-3 h-3 text-slate-300" />
                </a>
              ))}
            </div>
          </div>
        )}
       <button
  type="button"
  onClick={() =>
    setIsMenuOpen(
      (current) => !current,
    )
  }
  aria-expanded={isMenuOpen}
  aria-label={
    isMenuOpen
      ? "ปิดเมนูบริการอื่น"
      : "เปิดเมนูบริการอื่น"
  } className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl transition-all active:scale-90 hover:scale-105 sm:h-16 sm:w-16" style={{ background: isMenuOpen ? '#0f172a' : brandGradient }}>
          {isMenuOpen ? <X className="h-6 w-6 sm:h-8 sm:w-8" /> : <LayoutGrid className="h-6 w-6 sm:h-8 sm:w-8" />}
          {!isMenuOpen && <span className="absolute top-0 right-0 w-4 h-4 bg-red-50 border-2 border-white rounded-full animate-ping"></span>}
        </button>
      </div>

      {/* --- Section: Hero (🚀 Improved Version with Live Card) --- */}
     <section className="relative overflow-hidden pb-14 pt-12 text-white md:pb-36 md:pt-28">
        <div className="absolute inset-0 z-0">
          <div 
            className="home-hero-bg absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.98), var(--hero-fade)), url('/rawai-cctv-hero.webp')`,
              backgroundColor: '#0f172a'
            }}
          ></div>
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] rounded-full blur-[120px] opacity-20" style={{ background: brandGradient }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          
          {/* 📝 ฝั่งซ้าย: ข้อความ (ปรับลดขนาดเหลือ col-span-5 เพื่อแบ่งพื้นที่ให้กล้อง) */}
          <div className="lg:col-span-5 text-left animate-in fade-in slide-in-from-left-12 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-300 text-[9px] md:text-xs font-bold uppercase tracking-widest mb-6 shadow-2xl">
              <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              <span>Smart CCTV Portal</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[0.95] mb-5 md:mb-6 drop-shadow-2xl">
              ขอข้อมูลภาพ <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">
                กล้องวงจรปิด
              </span>
            </h1>
            
            <p className="mb-8 max-w-md text-sm font-medium leading-relaxed text-slate-200 opacity-90 md:text-lg">
              ยื่นคำร้อง ติดตามสถานะ และดูกล้องสาธารณะได้ในที่เดียว
            </p>

            <div className="grid grid-cols-2 gap-3 md:flex md:flex-col md:gap-4">
              <button
                type="button"
                onClick={onRequestClick} 
                className="group relative col-span-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 py-3.5 text-base font-bold text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-95 md:px-8 md:py-4 md:text-lg"
                style={{ background: brandGradient }}
              >
                <Camera className="w-6 h-6" />
                <span>ยื่นคำร้องออนไลน์</span>
              </button>
              <button
                type="button"
                onClick={() => setView('track')} 
                className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-3 text-sm font-bold text-white shadow-xl backdrop-blur-xl transition-all hover:bg-white/20 md:px-8 md:py-4 md:text-lg"
              >
                <span>ติดตามสถานะคำร้อง</span>
              </button>
              <button
                type="button"
                onClick={() => setView('live-cameras')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-3 text-sm font-bold text-emerald-100 shadow-xl backdrop-blur-xl transition-all hover:bg-emerald-400/20 md:px-8 md:py-4 md:text-base"
              >
                <Radio className="h-5 w-5" />
                <span>ดูกล้องออนไลน์สาธารณะ</span>
              </button>
            </div>
          </div>

          {/* 🎥 ฝั่งขวา: Live Stream Card (ขยายร่างเป็น col-span-7) */}
          <div className="lg:col-span-7 relative group animate-in fade-in slide-in-from-right-12 duration-1000">
            {/* กล่องวิดีโอที่ใหญ่ขึ้นและดูพรีเมียมขึ้น */}
            <div className="relative p-2.5 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-[0_45px_100px_-20px_rgba(0,0,0,0.6)] overflow-hidden transition-all group-hover:shadow-[0_45px_100px_-10px_rgba(16,185,129,0.3)] group-hover:scale-[1.01]">
              
              {/* Live Badge แบบใหม่ */}
              <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-2xl sm:left-8 sm:top-8 sm:px-4 sm:py-2 sm:text-xs">
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
                
                <div className="absolute bottom-4 left-4 right-4 z-20 flex items-end justify-between gap-3 sm:bottom-8 sm:left-8 sm:right-8">
                  <div>
                    <p className="text-sm font-bold tracking-tight text-white sm:text-xl">Promthep Cape, Phuket</p>
                    <p className="mt-0.5 hidden text-xs font-bold uppercase tracking-widest text-emerald-400 sm:block">Real-time Monitoring System</p>
                  </div>
                  
                  {/* ปุ่ม Maximize ที่ดูเด่นขึ้น */}
                  <button
                    type="button"
                    onClick={() => setShowLiveModal(true)}
                    aria-label="ขยายกล้องสดแหลมพรหมเทพ"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-2xl transition-all hover:bg-emerald-400 active:scale-90 sm:h-14 sm:w-14 sm:rounded-2xl"
                  >
                    <Maximize2 className="h-5 w-5 sm:h-7 sm:w-7" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
           
          </div>
        </div>

        {/* 📊 Horizontal Stats Overlay (Bottom of Banner) */}
        <div className="relative z-10 mx-auto mt-8 grid max-w-4xl grid-cols-3 gap-2 px-4 sm:gap-3 sm:px-6 md:mt-16">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:rounded-3xl sm:p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">จำนวนคำร้องทั้งหมด</p>
            {statsLoading ? <div className="mt-2 h-6 w-10 animate-pulse rounded-lg bg-white/10 sm:h-7 sm:w-16" /> : <p className="text-xl font-bold text-white sm:text-2xl">{stats.total.toLocaleString('th-TH')}</p>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:rounded-3xl sm:p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">อัตราการดำเนินการสำเร็จ</p>
            {statsLoading ? <div className="mt-2 h-6 w-10 animate-pulse rounded-lg bg-white/10 sm:h-7 sm:w-16" /> : <p className="text-xl font-bold text-white sm:text-2xl">{stats.successRate}%</p>}
          </div>
          
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:rounded-3xl sm:p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">คำร้องที่รอตรวจสอบ</p>
            {statsLoading ? <div className="mt-2 h-6 w-10 animate-pulse rounded-lg bg-white/10 sm:h-7 sm:w-16" /> : <p className="text-xl font-bold text-white sm:text-2xl">{stats.pending.toLocaleString('th-TH')}</p>}
          </div>
        </div>
      </section>

      {/* --- 🎬 Live Full Modal (Popup) --- */}
      {showLiveModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 bg-slate-900/95 backdrop-blur-xl">
          <div aria-hidden="true" onClick={closeLiveModal} className="absolute inset-0" />
          <div ref={liveDialogRef} role="dialog" aria-modal="true" aria-labelledby="live-camera-title" tabIndex={-1} className="relative z-10 w-full max-w-6xl outline-none">
          <button
            type="button"
            onClick={closeLiveModal}
            aria-label="ปิดกล้องสด"
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
          <h2 id="live-camera-title" className="sr-only">กล้องสดแหลมพรหมเทพ</h2>
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <iframe 
              className="w-full h-full" 
              src={PROMTHEP_LIVE_URL.replace("controls=0", "controls=1")}
              title="Full Live Phromthep"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            ></iframe>
          </div>
          </div>
        </div>
      )}

      {/* --- Existing Sections Below --- */}
      <section aria-labelledby="service-steps-title" className="border-b border-slate-100 bg-white py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="service-steps-title" className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">ยื่นคำร้องออนไลน์ได้ใน 3 ขั้นตอน</h2>
            <p className="mt-3 text-sm text-slate-500">เตรียมข้อมูลให้พร้อม แล้วดำเนินการตามลำดับ</p>
          </div>
          <ol className="relative mt-9 space-y-0 before:absolute before:bottom-8 before:left-5 before:top-8 before:w-px before:bg-gradient-to-b before:from-emerald-400 before:via-blue-400 before:to-indigo-300 md:grid md:grid-cols-3 md:gap-8 md:space-y-0 md:before:bottom-auto md:before:left-[16.66%] md:before:right-[16.66%] md:before:top-6 md:before:h-px md:before:w-auto">
            {[
              { title: 'ยื่นคำร้องและแนบเอกสาร', text: 'ระบุวัน เวลา จุดเกิดเหตุ และแนบเอกสารที่จำเป็น', icon: FileCheck2, tone: 'bg-blue-50 text-blue-700' },
              { title: 'เจ้าหน้าที่ตรวจสอบ', text: 'ตรวจเอกสาร ระบุกล้อง และค้นหาภาพตามช่วงเวลาที่แจ้ง', icon: SearchCheck, tone: 'bg-indigo-50 text-indigo-700' },
              { title: 'ติดตามและรับผล', text: 'ใช้รหัสติดตามเพื่อตรวจความคืบหน้าและอ่านข้อความจากเจ้าหน้าที่', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
            ].map((step, index) => {
              const StepIcon = step.icon;
              return (
                <li key={step.title} className="relative flex gap-4 pb-7 last:pb-0 md:flex-col md:items-center md:pb-0 md:text-center">
                  <div className="relative z-10 shrink-0">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full ring-8 ring-white md:h-12 md:w-12 ${step.tone}`}><StepIcon className="h-5 w-5" aria-hidden="true" /></span>
                    <span className="absolute -right-1 -top-2 font-mono text-[9px] font-bold text-slate-400">0{index + 1}</span>
                  </div>
                  <div className="pt-0.5 md:pt-3">
                    <h3 className="font-bold text-slate-900">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500 md:mx-auto md:max-w-xs">{step.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50/50 py-10 sm:py-24">
        <div className="mx-auto mb-8 max-w-6xl px-4 sm:mb-20 sm:px-6">
  <AccidentMap
    points={hotspots}
    cameras={publicCameras}
    loading={statsLoading || camerasLoading}
    onOpenCameras={() => setView('live-cameras')}
  />
</div>
      </section>

     
      <section className="bg-slate-50/50 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="mb-10 flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-lg sm:mb-16 sm:gap-10 sm:rounded-3xl sm:p-12">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 sm:h-20 sm:w-20 sm:rounded-3xl"><ShieldCheck className="h-7 w-7 sm:h-10 sm:w-10" /></div>
            <div><h4 className="text-lg font-bold text-slate-900 sm:text-2xl">ปกป้องข้อมูลมาตรฐาน PDPA</h4><p className="mt-1 text-sm font-medium leading-relaxed text-slate-500 sm:text-base">ข้อมูลของท่านจะได้รับการจัดการอย่างรัดกุมตามกฎหมายความปลอดภัยข้อมูลส่วนบุคคล</p></div>
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

          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeView;
