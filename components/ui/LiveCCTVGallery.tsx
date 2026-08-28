// components/ui/LiveCCTVGallery.tsx
import React, { useState } from 'react';
import { 
  Video, Eye, MapPin, Play, MonitorPlay, Zap, 
  Activity, // ✅ เพิ่มตัวนี้เข้าไปครับ
  AlertTriangle, 
  ExternalLink 
} from 'lucide-react';
const LiveCCTVGallery = () => {
  // ✅ เปลี่ยนจาก Local IP เป็น YouTube Embed Link
  const [cameras] = useState([
    { 
      id: 1, 
      name: "จุดชมวิวกังหันลมแหลมพรหมเทพ (Live Stream)", 
      location: "แหลมพรหมเทพ", 
      // แปลงลิงก์ youtube.com/live/ID เป็น youtube.com/embed/ID
      embedUrl: "https://www.youtube.com/embed/aFUWeOu4Iak?autoplay=1&mute=1&rel=0",
      type: "public" 
    },
    { 
      id: 2, 
      name: "หาดในหาน (Coming Soon)", 
      location: "จุดชมวิวพระอาทิตย์ตก", 
      embedUrl: null, 
      type: "public" 
    },
    { 
      id: 3, 
      name: "ประภาคารแหลมพรมหเทพ (Coming Soon)", 
      location: "แหลมพรมหเทพ", 
      embedUrl: null, 
      type: "public" 
    },
  ]);

  const [activeCam, setActiveCam] = useState(cameras[0]);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest border border-red-100">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
              Rawai Live Cam (PUBLIC)
            </div>
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight">
              สถานการณ์สด <br />
              <span className="text-blue-600">Smart City Live Stream</span>
            </h2>
          </div>
          <p className="text-slate-400 text-sm font-bold max-w-xs text-right hidden md:block uppercase tracking-tighter">
            Real-time monitoring for public safety and tourism
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 📺 Main Video Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl group border-8 border-slate-50">
              
              {/* ✅ แสดง YouTube Embed */}
              {activeCam.embedUrl ? (
                <iframe 
                  src={activeCam.embedUrl}
                  className="w-full h-full border-none"
                  title={activeCam.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                  <MonitorPlay className="w-20 h-20 mb-4 animate-pulse" />
                  <p className="font-bold uppercase tracking-widest text-xs">Offline / Maintenance</p>
                </div>
              )}

              {/* Status Overlay */}
              <div className="absolute top-6 left-6 z-10 flex items-center gap-3 pointer-events-none">
                <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-white">
                  <p className="text-[10px] font-bold uppercase opacity-70">CAM {activeCam.id}</p>
                  <p className="text-sm font-bold">{activeCam.name}</p>
                </div>
              </div>

              {/* Live Badge */}
              <div className="absolute bottom-6 right-6 pointer-events-none">
                <div className="flex items-center gap-2 bg-red-600 px-4 py-1.5 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest shadow-xl">
                  <Zap className="w-3 h-3 fill-white" /> LIVE
                </div>
              </div>
            </div>
          </div>

          {/* 📋 Camera List Sidebar */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">เลือกจุดรับชม</h4>
            <div className="space-y-3">
              {cameras.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => setActiveCam(cam)}
                  className={`w-full p-4 rounded-3xl border transition-all flex items-center gap-4 group ${
                    activeCam.id === cam.id 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' 
                    : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-white hover:border-blue-200'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    activeCam.id === cam.id ? 'bg-white/20' : 'bg-white shadow-sm'
                  }`}>
                    <Video className={`w-6 h-6 ${activeCam.id === cam.id ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <div className="text-left overflow-hidden">
                    <p className={`text-xs font-bold truncate ${activeCam.id === cam.id ? 'text-white' : 'text-slate-900'}`}>{cam.name}</p>
                    <p className={`text-[10px] font-bold opacity-60 truncate ${activeCam.id === cam.id ? 'text-blue-100' : ''}`}>{cam.location}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Stats Note */}
            <div className="p-6 bg-slate-900 rounded-2xl text-white mt-6 relative overflow-hidden">
                <Activity className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 -rotate-12" />
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-2">Network Status</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tighter">ONLINE</span>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">Public Cloud Streaming Active</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default LiveCCTVGallery;