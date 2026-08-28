'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  XCircle, FileBarChart, Download, Loader2, TrendingUp, Users, 
  ShieldCheck, MapPinned, Building2, Globe, Eye, Car, AlertTriangle,
  Activity, ListFilter
} from 'lucide-react'; 
import { 
  CartesianGrid, XAxis, YAxis, Tooltip as ChartTooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
  AreaChart, Area, LabelList 
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { EVENT_TYPE_TH, STATUS_TH, COLORS } from '../admin/utils/formatters';

const ACCIDENT_SUBTYPE_TH: Record<string, string> = {
  'MC_VS_MC': 'จยย. ชน จยย.',
  'MC_VS_CAR': 'จยย. ชน รถยนต์',
  'CAR_VS_CAR': 'รถยนต์ ชน รถยนต์',
  'PEDESTRIAN': 'ชนคนเดินเท้า',
  'HIT_AND_RUN': 'ชนแล้วหนี',
  'OTHER': 'อื่นๆ'
};

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredRequests: any[];
  reportData: { chartData: any[]; pieData: any[] };
  startDate: string;
  endDate: string;
  visitorHistory: any[];
  visitorStats: { today: number; total: number }; 
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen, onClose, filteredRequests, reportData, startDate, endDate, visitorHistory, visitorStats
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [timeScale, setTimeScale] = useState<'day' | 'month' | 'year'>('day');
  const reportRef = useRef<HTMLDivElement>(null);
  const analyticsMapRef = useRef<HTMLDivElement>(null);
  const leafletAnalyticsInstance = useRef<any>(null);

  const accidentSubtypeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRequests
      .filter(req => req.eventType === 'ACCIDENT' && req.accidentSubtype)
      .forEach(req => {
        const label = ACCIDENT_SUBTYPE_TH[req.accidentSubtype] || 'ไม่ระบุ';
        counts[label] = (counts[label] || 0) + 1;
      });
    return Object.keys(counts).map(name => ({ name, value: counts[name] }));
  }, [filteredRequests]);

  const processedTrafficData = useMemo(() => {
    if (!visitorHistory || visitorHistory.length === 0) return [];
    const getGroupKey = (dateStr: string) => {
      const [d, m, y] = dateStr.split('/');
      if (timeScale === 'year') return `ปี ${y}`;
      if (timeScale === 'month') return `${m}/${y}`;
      return dateStr;
    };
    const groupedMap = new Map();
    visitorHistory.forEach(item => {
      const key = getGroupKey(item.date);
      if (!groupedMap.has(key)) groupedMap.set(key, { date: key, views: 0, requests: 0 });
      const group = groupedMap.get(key);
      group.views += item.views;
      group.requests += item.requests;
    });
    return Array.from(groupedMap.values());
  }, [visitorHistory, timeScale]);

  useEffect(() => {
    if (isOpen && analyticsMapRef.current && typeof window !== 'undefined') {
      const initAnalyticsMap = () => {
        const L = (window as any).L;
        if (!L || !analyticsMapRef.current) return;
        if (leafletAnalyticsInstance.current) leafletAnalyticsInstance.current.remove();
        const map = L.map(analyticsMapRef.current).setView([7.7858, 98.3225], 14);
        leafletAnalyticsInstance.current = map;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        filteredRequests.forEach(req => {
          if (req.latitude && req.longitude) {
            const color = req.status === 'completed' ? '#10b981' : '#3b82f6';
            L.circleMarker([req.latitude, req.longitude], {
              radius: 8, fillColor: color, color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.8
            }).addTo(map).bindPopup(`<b>${req.trackingId}</b><br>${EVENT_TYPE_TH[req.eventType || 'OTHER']}`);
          }
        });
      };
      if (!(window as any).L) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = initAnalyticsMap;
        document.body.appendChild(script);
      } else { setTimeout(initAnalyticsMap, 100); }
    }
  }, [isOpen, filteredRequests]);

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Rawai_CCTV_Report_2026.pdf`);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  if (!isOpen) return null;

  return (
    // ✅ 1. เปลี่ยน Padding ของ Overlay ให้มือถือชิดขอบ
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 bg-slate-900/90 backdrop-blur-2xl overflow-hidden font-sans">
      
      {/* ✅ 2. ปรับขอบโค้งและความสูงให้เหมาะกับมือถือ */}
      <div className="bg-[#fcfcfd] w-full max-w-6xl h-full md:h-[95vh] rounded-none md:rounded-3xl shadow-2xl flex flex-col my-0 md:my-4 animate-in zoom-in-95 duration-500 border border-white/20">
        
        {/* ✨ Header Section - จัดเรียง Flex ใหม่สำหรับมือถือ */}
        <div className="px-6 py-5 md:px-10 md:py-7 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-md rounded-none md:rounded-t-[4rem] shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 rounded-xl md:rounded-2xl text-white shadow-lg shrink-0">
              <FileBarChart className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight leading-tight">Analytical Command Center</h2>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1">CCTV Intelligence Portal • Rawai</p>
            </div>
          </div>
          
          {/* ปุ่มเครื่องมือ - Wrap และเรียงให้กดง่ายบนมือถือ */}
          <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-end mt-2 md:mt-0">
            <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1 overflow-x-auto hide-scrollbar">
              {(['day', 'month', 'year'] as const).map((v) => (
                <button key={v} onClick={() => setTimeScale(v)} className={`px-3 py-1.5 md:px-4 md:py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all whitespace-nowrap ${timeScale === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                  {v === 'day' ? 'Daily' : v === 'month' ? 'Monthly' : 'Yearly'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportPDF} disabled={isExporting} className="bg-slate-900 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl font-bold text-[9px] md:text-[10px] hover:bg-slate-800 shadow-xl flex items-center gap-2 transition-all">
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} <span className="hidden sm:inline">EXPORT PDF</span>
              </button>
              <button onClick={onClose} className="p-2.5 md:p-3 bg-white text-slate-300 hover:text-red-500 rounded-xl md:rounded-2xl border border-slate-100 transition-all hover:bg-red-50"><XCircle className="w-5 h-5 md:w-6 md:h-6"/></button>
            </div>
          </div>
        </div>

        {/* 📄 Content Area - ปรับ Padding ด้านใน */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          <div ref={reportRef} className="p-6 md:p-16 space-y-12 md:space-y-20">
            
            {/* 1. Dashboard Summary Cards - เปลี่ยนเป็น 2 คอลัมน์บนมือถือ / 4 บน PC */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="p-5 md:p-8 bg-blue-600 rounded-3xl md:rounded-3xl text-white shadow-xl shadow-blue-100 transition-transform hover:scale-105">
                 <div className="flex justify-between items-center mb-2 md:mb-4 opacity-60"><Eye className="w-4 h-4 md:w-5 md:h-5" /><p className="text-[8px] md:text-[9px] font-bold uppercase">Today</p></div>
                 <p className="text-[10px] md:text-xs font-bold text-blue-100 line-clamp-1">ผู้เข้าชมวันนี้</p>
                 <p className="text-3xl md:text-5xl font-bold mt-1 tracking-tighter">{visitorStats.today.toLocaleString()}</p>
              </div>
              <div className="p-5 md:p-8 bg-slate-900 rounded-3xl md:rounded-3xl text-white shadow-xl transition-transform hover:scale-105">
                 <div className="flex justify-between items-center mb-2 md:mb-4 opacity-40"><Globe className="w-4 h-4 md:w-5 md:h-5" /><p className="text-[8px] md:text-[10px] font-bold uppercase">Total</p></div>
                 <p className="text-[10px] md:text-xs font-bold text-slate-400 line-clamp-1">ยอดสะสมทั้งหมด</p>
                 <p className="text-3xl md:text-5xl font-bold mt-1 tracking-tighter">{visitorStats.total.toLocaleString()}</p>
              </div>
              <div className="p-5 md:p-8 bg-white rounded-3xl md:rounded-3xl border border-slate-100 shadow-sm transition-transform hover:scale-105">
                 <div className="flex justify-between items-center mb-2 md:mb-4 text-slate-300"><FileBarChart className="w-4 h-4 md:w-5 md:h-5" /><p className="text-[8px] md:text-[10px] font-bold uppercase">Requests</p></div>
                 <p className="text-[10px] md:text-xs font-bold text-slate-400 line-clamp-1">จำนวนคำร้อง</p>
                 <p className="text-3xl md:text-5xl font-bold mt-1 text-slate-900 tracking-tighter">{filteredRequests.length}</p>
              </div>
              <div className="p-5 md:p-8 bg-white rounded-3xl md:rounded-3xl border border-slate-100 shadow-sm transition-transform hover:scale-105">
                 <div className="flex justify-between items-center mb-2 md:mb-4 text-emerald-500"><ShieldCheck className="w-4 h-4 md:w-5 md:h-5" /><p className="text-[8px] md:text-[10px] font-bold uppercase">Success</p></div>
                 <p className="text-[10px] md:text-xs font-bold text-slate-400 line-clamp-1">อัตราความสำเร็จ</p>
                 <p className="text-3xl md:text-5xl font-bold mt-1 text-slate-900 tracking-tighter">
                   {filteredRequests.length > 0 ? Math.round((filteredRequests.filter(r => r.status === 'completed').length / filteredRequests.length) * 100) : 0}%
                 </p>
              </div>
            </div>

            {/* 2. YouTube-Style Traffic Chart */}
            <div className="space-y-4 md:space-y-6">
               <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 md:gap-3 uppercase tracking-wider">
                 <Activity className="w-5 h-5 md:w-6 md:h-6 text-blue-500 shrink-0" /> 
                 <span className="truncate">แนวโน้มการเข้าใช้งาน <span className="text-slate-400 font-medium text-xs md:text-sm hidden sm:inline">(Traffic Trends)</span></span>
               </h3>
               {/* ลดความสูงกราฟบนมือถือ */}
               <div className="bg-slate-50/50 p-4 md:p-10 rounded-3xl md:rounded-3xl border border-slate-100 h-[300px] md:h-[450px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={processedTrafficData}>
                     <defs><linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                     <XAxis dataKey="date" tick={{fontSize: 9, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                     <YAxis tick={{fontSize: 9}} axisLine={false} tickLine={false} width={30} />
                     <ChartTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                     <Area type="monotone" dataKey="views" name="ยอดผู้เข้าชม" stroke="#3b82f6" strokeWidth={4} fill="url(#colorViews)">
                        <LabelList dataKey="views" position="top" style={{ fontSize: '9px', fontWeight: 'bold', fill: '#3b82f6' }} />
                     </Area>
                     <Area type="monotone" dataKey="requests" name="จำนวนคำร้อง" stroke="#10b981" strokeWidth={3} fillOpacity={0} />
                     <Legend verticalAlign="top" align="right" wrapperStyle={{paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold'}} />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* 3. Incident Breakdown Charts - เรียงลงมา 1 คอลัมน์บนมือถือ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
              <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-3xl border border-slate-100 shadow-sm">
                <h4 className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 md:mb-10 flex items-center gap-2"><AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-orange-500" /> สถิติแยกตามประเภทเหตุ</h4>
                <div className="h-60 md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.chartData} layout="vertical" margin={{ left: -20, right: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 9, fontWeight: 'bold'}} width={90} axisLine={false} />
                      <Bar dataKey="value" name="จำนวนเคส" fill="#0f172a" radius={[0, 10, 10, 0]} barSize={20}>
                        <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fontWeight: 'black', fill: '#1e293b' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-slate-900 p-6 md:p-10 rounded-3xl md:rounded-3xl text-white shadow-2xl">
                <h4 className="text-[9px] md:text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-6 md:mb-10 flex items-center gap-2"><Car className="w-4 h-4 md:w-5 md:h-5" /> เจาะลึกสถิติอุบัติเหตุ</h4>
                <div className="h-60 md:h-72">
                   {accidentSubtypeStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={accidentSubtypeStats}>
                          <XAxis dataKey="name" tick={{fontSize: 8, fill: '#fff', fontWeight: 'bold'}} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={60} />
                          <Bar dataKey="value" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={30}>
                            <LabelList dataKey="value" position="top" style={{ fontSize: '11px', fontWeight: 'black', fill: '#fff' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center opacity-30 text-xs md:text-sm italic">ไม่มีข้อมูลอุบัติเหตุในช่วงนี้</div>
                   )}
                </div>
              </div>
            </div>

            {/* 4. Spatial Map Analysis */}
            <div className="space-y-4 md:space-y-8">
               <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 md:gap-3 uppercase tracking-wider">
                 <MapPinned className="w-5 h-5 md:w-6 md:h-6 text-red-500 shrink-0" /> <span className="truncate">การวิเคราะห์เชิงพื้นที่</span>
               </h3>
               {/* ลดความสูงและขนาดขอบของแผนที่บนมือถือ */}
               <div ref={analyticsMapRef} className="h-[350px] md:h-[550px] w-full rounded-3xl md:rounded-3xl border-8 md:border-[15px] border-slate-50 shadow-inner overflow-hidden" />
            </div>

            {/* 5. Data Record Registry */}
            <div className="space-y-4 md:space-y-8 pb-10">
              <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2 md:gap-3 uppercase tracking-wider">
                <ListFilter className="w-5 h-5 md:w-6 md:h-6 text-indigo-500 shrink-0" /> <span className="truncate">ตารางรายการข้อมูลสรุป</span>
              </h3>
              
              {/* ✅ แก้ไข: เพิ่ม overflow-x-auto ให้ตารางเลื่อนซ้ายขวาได้บนมือถือ */}
              <div className="rounded-2xl md:rounded-3xl overflow-x-auto border border-slate-100 shadow-2xl shadow-slate-100/50 bg-white custom-scrollbar">
                <table className="w-full min-w-[700px] text-left">
                  <thead className="bg-slate-900 text-white text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                      <th className="p-5 md:p-7 whitespace-nowrap">Tracking ID</th>
                      <th className="p-5 md:p-7 whitespace-nowrap">ผู้แจ้งเรื่อง (Requester)</th>
                      <th className="p-5 md:p-7 whitespace-nowrap">ประเภทเหตุ (Category)</th>
                      <th className="p-5 md:p-7 whitespace-nowrap">สถานะล่าสุด (Final Status)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[10px] md:text-[11px]">
                    {filteredRequests.slice(0, 50).map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-all group">
                        <td className="p-5 md:p-7 font-bold text-blue-600 tracking-tight group-hover:translate-x-1 transition-transform whitespace-nowrap">{req.trackingId}</td>
                        <td className="p-5 md:p-7 font-bold text-slate-700 whitespace-nowrap">{req.name}</td>
                        <td className="p-5 md:p-7 font-bold text-slate-400 whitespace-nowrap">{EVENT_TYPE_TH[req.eventType || 'OTHER']}</td>
                        <td className="p-5 md:p-7 whitespace-nowrap">
                           <span className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-widest ${
                             req.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                           }`}>
                             {STATUS_TH[req.status] || req.status}
                           </span>
                        </td>
                      </tr>
                    ))}
                    {filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-10 md:p-20 text-center text-slate-300 font-bold uppercase tracking-widest italic">No Data Available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Footer Branding */}
              <div className="flex flex-col items-center pt-10 md:pt-20 border-t border-slate-100 space-y-3 md:space-y-4">
                 <div className="flex items-center gap-3 md:gap-4 text-slate-300">
                    <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />
                    <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">End-to-End Encryption • PDPA</p>
                 </div>
                 <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center px-4">
                    Copyright © 2026 Rawai Municipality • Digital Master Plan Project
                 </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};