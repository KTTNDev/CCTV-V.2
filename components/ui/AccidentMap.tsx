'use client';

import React, { useEffect, useRef, useState } from 'react';
// ✅ แก้ไข Path การนำเข้าให้รองรับ alias @/ ซึ่งเป็นมาตรฐานของ Next.js 
// หรือใช้พิกัดที่ถูกต้องตามโครงสร้างโปรเจกต์ของคุณ
import { Navigation, AlertTriangle, Info, Map as MapIcon } from 'lucide-react';

export interface AccidentPoint {
  lat: number;
  lng: number;
  location: string;
}

interface AccidentMapProps {
  points?: AccidentPoint[];
  loading?: boolean;
}

function escapeHtml(
  value: string,
): string {
  return value.replace(
    /[&<>"']/g,
    (character) => {
      const entities:
      Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };

      return entities[character];
    },
  );
}
const AccidentMap:
React.FC<AccidentMapProps> = ({
  points = [],
  loading = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const brandGradient = "linear-gradient(90deg, hsla(160, 50%, 51%, 1) 0%, hsla(247, 60%, 21%, 1) 100%)";

 

  // 2. โหลด Leaflet Script และ CSS
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement("link");
      link.id = 'leaflet-css';
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!(window as any).L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => setMapLoaded(true);
      document.body.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, []);

  // 3. จัดการการแสดงผล Marker บนแผนที่
  useEffect(() => {
    if (mapLoaded && mapContainerRef.current && typeof window !== 'undefined') {
      const L = (window as any).L;
      
      // สร้าง Map Instance หากยังไม่มี
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([7.8210, 98.3125], 13); // เน้นพื้นที่ราไวย์
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);

        // สร้าง Layer สำหรับเก็บ Markers โดยเฉพาะเพื่อให้จัดการง่าย
        markersLayerRef.current = L.layerGroup().addTo(map);
      }

      // ล้าง Marker เก่าก่อนวาดใหม่ (ป้องกันการวาดซ้ำตอน re-render)
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
      }

      // สร้าง Custom Icon สีแดงเรืองแสงสำหรับอุบัติเหตุ
      const accidentIcon = L.divIcon({
        className: 'custom-accident-marker',
        html: `
          <div style="position: relative;">
            <div style="position: absolute; width: 24px; height: 24px; background: rgba(239, 68, 68, 0.2); border-radius: 50%; top: -6px; left: -6px; animation: pulse 2s infinite;"></div>
            <div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.2);"></div>
          </div>
          <style>
            @keyframes pulse {
              0% { transform: scale(1); opacity: 0.8; }
              100% { transform: scale(2.5); opacity: 0; }
            }
          </style>
        `,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      // วางจุดอุบัติเหตุลงใน Layer
      points.forEach(p => {
        L.marker([p.lat, p.lng], { icon: accidentIcon })
          .addTo(markersLayerRef.current)
          .bindPopup(`
            <div style="font-family: sans-serif; padding: 5px;">
              <strong style="color: #ef4444; font-size: 14px;">⚠️ พื้นที่เกิดอุบัติเหตุ</strong><br/>
             <span style="color: #64748b; font-size: 12px;">${escapeHtml(p.location)}</span>
            </div>
          `);
      });
    }
  }, [mapLoaded, points]);

  return (
    <div className="w-full animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 rounded-full text-red-600 font-bold text-[11px] uppercase tracking-wide border border-red-100 shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5" />
            Accident Risk Monitoring
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
            แผนที่จุดเสี่ยง <br className="md:hidden" />
            <span className="text-slate-400">อุบัติเหตุจราจร</span>
          </h2>
          <p className="text-slate-500 font-medium max-w-lg leading-relaxed">
            รวบรวมตำแหน่งที่เกิดเหตุจริงจากระบบ เพื่อให้ประชาชนร่วมเฝ้าระวังและใช้ความระมัดระวังเป็นพิเศษในจุดเสี่ยงอันตราย
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 pr-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
             <MapIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Hotspots</p>
            <p className="text-2xl font-bold text-slate-900 leading-none">{points.length} <span className="text-sm font-bold text-slate-400 ml-1 uppercase">Points</span></p>
          </div>
        </div>
      </div>

      <div className="relative group">
        {/* Shadow decoration */}
        <div className="absolute -inset-1 bg-gradient-to-r from-red-100 to-transparent rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
        
        <div className="relative h-[500px] w-full rounded-3xl border-4 border-white shadow-2xl shadow-slate-200/50 overflow-hidden z-10 bg-slate-50 transition-all duration-500 group-hover:shadow-red-900/5">
          <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
          
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-md z-[20]">
               <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Navigation className="animate-spin w-10 h-10 text-emerald-500" />
                    <div className="absolute inset-0 animate-ping rounded-full bg-emerald-100 -z-10"></div>
                  </div>
                  <span className="text-sm font-bold text-slate-800 tracking-widest uppercase animate-pulse">กำลังดึงข้อมูลพิกัด...</span>
               </div>
            </div>
          )}

          {/* Floating Instructions */}
          <div className="absolute top-6 left-6 z-[20] pointer-events-none">
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-lg pointer-events-auto max-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                    <span className="text-[11px] font-bold text-slate-800 uppercase">จุดอันตราย</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">พิกัดจากการแจ้งเหตุผ่านระบบ Digital CCTV Portal</p>
            </div>
          </div>

          {/* Bottom Info Bar */}
          <div className="absolute bottom-6 left-6 right-6 z-[20] pointer-events-none flex justify-center">
            <div className="bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-2xl pointer-events-auto">
              <div className="flex items-center gap-3 text-white">
                <Info className="w-4 h-4 text-emerald-400" />
                <p className="text-[11px] font-bold tracking-wide">โปรดใช้ความระมัดระวังในการขับขี่เมื่อเข้าใกล้บริเวณสัญลักษณ์สีแดง</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccidentMap;