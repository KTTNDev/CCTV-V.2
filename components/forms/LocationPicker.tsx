'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Navigation, MapPin as MapPinIcon } from 'lucide-react';

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat: number | null; 
  initialLng: number | null;
}
const LocationPicker = React.memo(({ onLocationSelect, initialLat, initialLng }: LocationPickerProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [address, setAddress] = useState('');

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

  useEffect(() => {
    if (mapLoaded && mapContainerRef.current && !mapInstanceRef.current && typeof window !== 'undefined') {
      const L = (window as any).L;

      if (L.Icon.Default.prototype._getIconUrl) {
        delete L.Icon.Default.prototype._getIconUrl;
      }
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const defaultLat = initialLat || 7.7818; 
      const defaultLng = initialLng || 98.3125;
      
      const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 13);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // ✅ ปรับการเช็ค Marker ให้ปลอดภัยขึ้น
      let marker: any = (typeof initialLat === 'number' && typeof initialLng === 'number') 
        ? L.marker([initialLat, initialLng]).addTo(map) 
        : null;

      map.on('click', function(e: any) {
        const { lat, lng } = e.latlng;
        if (marker) {
          marker.setLatLng([lat, lng]);
        } else {
          marker = L.marker([lat, lng]).addTo(map);
        }
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        onLocationSelect(lat, lng);
      });
    }
  }, [mapLoaded, initialLat, initialLng, onLocationSelect]);

  return (
    <div className="space-y-3">
       <div className="relative w-full h-[320px] rounded-2xl border-2 border-slate-200 overflow-hidden z-0 bg-slate-50 shadow-sm group hover:border-blue-300 transition-colors">
          <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-500">
               <span className="flex items-center gap-2 text-sm font-medium animate-pulse">
                 <Navigation className="animate-spin w-5 h-5 text-blue-500"/> กำลังโหลดแผนที่...
               </span>
            </div>
          )}
       </div>
       <div className="flex justify-between items-center text-xs text-slate-500 font-medium px-2">
          <span className="flex items-center gap-1.5">
            <MapPinIcon className="w-3.5 h-3.5" /> แตะที่แผนที่เพื่อปักหมุดตำแหน่งที่เกิดเหตุ
          </span>
         <span className="bg-slate-100 px-3 py-1 rounded-full text-blue-700 tracking-wide font-mono font-bold border border-slate-200">
  {address || (initialLat !== null && initialLng !== null 
    ? `${initialLat.toFixed(6)}, ${initialLng.toFixed(6)}` 
    : 'รอระบุพิกัด')}
</span>
       </div>
    </div>
  );
});

LocationPicker.displayName = 'LocationPicker';

export default LocationPicker;