'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Info,
  Map as MapIcon,
  MapPinned,
  Navigation,
} from 'lucide-react';

import type {
  PublicCamera,
  PublicCameraCategory,
} from '../../lib/public-cameras';

export interface AccidentPoint {
  lat: number;
  lng: number;
  count: number;
  location: string;
}

interface AccidentMapProps {
  points?: AccidentPoint[];
  cameras?: PublicCamera[];
  loading?: boolean;
  onOpenCameras?: () => void;
}

type MapLayerId =
  | 'cameras'
  | 'incidents'
  | 'risks';

interface LeafletMapInstance {
  setView(
    coordinates: [number, number],
    zoom: number,
  ): LeafletMapInstance;
  remove(): void;
}

interface LeafletTileLayer {
  addTo(
    map: LeafletMapInstance,
  ): LeafletTileLayer;
}

interface LeafletMarkerLayer {
  addTo(
    map: LeafletMapInstance,
  ): LeafletMarkerLayer;
  clearLayers(): void;
}

interface LeafletDivIcon {
  readonly type: 'div-icon';
}

interface LeafletMarker {
  addTo(
    layer: LeafletMarkerLayer,
  ): LeafletMarker;
  bindPopup(
    html: string,
  ): LeafletMarker;
}

interface CommunityLeafletNamespace {
  map(
    element: HTMLElement,
  ): LeafletMapInstance;
  tileLayer(
    url: string,
    options: {
      attribution: string;
    },
  ): LeafletTileLayer;
  layerGroup():
    LeafletMarkerLayer;
  divIcon(
    options: {
      className: string;
      html: string;
      iconSize: [number, number];
      iconAnchor: [number, number];
    },
  ): LeafletDivIcon;
  marker(
    coordinates: [number, number],
    options: {
      icon: LeafletDivIcon;
    },
  ): LeafletMarker;
}

type LeafletWindow =
  Window & {
    L?: CommunityLeafletNamespace;
  };

type MapLoadStatus =
  | 'loading'
  | 'ready'
  | 'error';

const LEAFLET_SCRIPT_ID =
  'leaflet-script';
const LEAFLET_STYLE_ID =
  'leaflet-css';
const RISK_THRESHOLD = 2;

const CAMERA_CATEGORY_LABELS:
  Record<PublicCameraCategory, string> = {
    flood: 'เฝ้าระวังน้ำท่วม',
    traffic: 'การจราจร',
    tourism: 'แหล่งท่องเที่ยว',
  };

const CAMERA_STATUS_LABELS:
  Record<PublicCamera['status'], string> = {
    online: 'ออนไลน์',
    offline: 'ออฟไลน์',
    maintenance: 'บำรุงรักษา',
  };

function getLeaflet():
  CommunityLeafletNamespace | null {
  if (
    typeof window === 'undefined'
  ) {
    return null;
  }

  return (
    (window as LeafletWindow).L ??
    null
  );
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

      return (
        entities[character] ??
        character
      );
    },
  );
}

function hasCoordinates(
  camera: PublicCamera,
): camera is PublicCamera & {
  latitude: number;
  longitude: number;
} {
  return (
    camera.latitude !== null &&
    camera.longitude !== null &&
    Number.isFinite(camera.latitude) &&
    Number.isFinite(camera.longitude)
  );
}

const AccidentMap = ({
  points = [],
  cameras = [],
  loading = false,
  onOpenCameras,
}: AccidentMapProps) => {
  const mapContainerRef =
    useRef<HTMLDivElement>(null);
  const mapInstanceRef =
    useRef<LeafletMapInstance | null>(
      null,
    );
  const markersLayerRef =
    useRef<LeafletMarkerLayer | null>(
      null,
    );

  const [
    loadStatus,
    setLoadStatus,
  ] = useState<MapLoadStatus>(
    () =>
      getLeaflet()
        ? 'ready'
        : 'loading',
  );
  const [
    visibleLayers,
    setVisibleLayers,
  ] = useState<Record<MapLayerId, boolean>>({
    cameras: true,
    incidents: true,
    risks: true,
  });

  const mappedCameras = useMemo(
    () =>
      cameras.filter(hasCoordinates),
    [cameras],
  );
  const riskPoints = useMemo(
    () =>
      points.filter(
        (point) =>
          point.count >= RISK_THRESHOLD,
      ),
    [points],
  );
  const layerOptions = useMemo(
    () => [
      {
        id: 'cameras' as const,
        label: 'กล้องออนไลน์',
        description:
          'กล้องสาธารณะที่มีพิกัด',
        count: mappedCameras.length,
        icon: Camera,
        tone:
          'border-emerald-200 bg-emerald-50 text-emerald-700',
        dot: 'bg-[#43b99a]',
      },
      {
        id: 'incidents' as const,
        label: 'จุดเหตุจากคำร้อง',
        description:
          'ข้อมูลรวมที่ปกปิดตำแหน่งจริง',
        count: points.length,
        icon: MapPinned,
        tone:
          'border-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
      },
      {
        id: 'risks' as const,
        label: 'จุดเสี่ยง',
        description: `บริเวณที่มีรายงาน ${RISK_THRESHOLD} ครั้งขึ้นไป`,
        count: riskPoints.length,
        icon: AlertTriangle,
        tone:
          'border-red-200 bg-red-50 text-red-700',
        dot: 'bg-red-500',
      },
    ],
    [
      mappedCameras.length,
      points.length,
      riskPoints.length,
    ],
  );

  useEffect(() => {
    if (
      typeof window ===
      'undefined'
    ) {
      return;
    }

    if (
      !document.getElementById(
        LEAFLET_STYLE_ID,
      )
    ) {
      const stylesheet =
        document.createElement(
          'link',
        );
      stylesheet.id =
        LEAFLET_STYLE_ID;
      stylesheet.rel =
        'stylesheet';
      stylesheet.href =
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(
        stylesheet,
      );
    }

    if (getLeaflet()) {
      return;
    }

    const handleLoad = () => {
      setLoadStatus(
        getLeaflet()
          ? 'ready'
          : 'error',
      );
    };
    const handleError = () => {
      setLoadStatus('error');
    };
    let script =
      document.getElementById(
        LEAFLET_SCRIPT_ID,
      ) as
        | HTMLScriptElement
        | null;

    if (!script) {
      script =
        document.createElement(
          'script',
        );
      script.id =
        LEAFLET_SCRIPT_ID;
      script.src =
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      document.body.appendChild(
        script,
      );
    }

    script.addEventListener(
      'load',
      handleLoad,
    );
    script.addEventListener(
      'error',
      handleError,
    );

    return () => {
      script?.removeEventListener(
        'load',
        handleLoad,
      );
      script?.removeEventListener(
        'error',
        handleError,
      );
    };
  }, []);

  useEffect(() => {
    if (
      loadStatus !== 'ready' ||
      !mapContainerRef.current ||
      mapInstanceRef.current
    ) {
      return;
    }

    const leaflet = getLeaflet();
    if (!leaflet) {
      return;
    }

    const map = leaflet
      .map(mapContainerRef.current)
      .setView(
        [7.821, 98.3125],
        13,
      );
    const markersLayer = leaflet
      .layerGroup()
      .addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current =
      markersLayer;

    leaflet
      .tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution:
            '© OpenStreetMap contributors',
        },
      )
      .addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, [loadStatus]);

  useEffect(() => {
    if (
      loadStatus !== 'ready' ||
      !markersLayerRef.current
    ) {
      return;
    }

    const leaflet = getLeaflet();
    if (!leaflet) {
      return;
    }

    const markersLayer =
      markersLayerRef.current;
    markersLayer.clearLayers();

    if (visibleLayers.risks) {
      for (const point of riskPoints) {
        const riskIcon = leaflet.divIcon({
          className: 'rawai-risk-marker',
          html: `
            <div style="position:relative;width:38px;height:38px">
              <div style="position:absolute;inset:3px;border:3px solid #ef4444;border-radius:9999px;background:rgba(254,226,226,.42);box-shadow:0 0 0 8px rgba(239,68,68,.12);animation:rawai-map-pulse 2s infinite"></div>
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#991b1b;font:800 11px sans-serif">${point.count}</div>
            </div>
            <style>@keyframes rawai-map-pulse{0%,100%{transform:scale(.86);opacity:.86}50%{transform:scale(1.12);opacity:.45}}</style>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        leaflet
          .marker(
            [point.lat, point.lng],
            { icon: riskIcon },
          )
          .addTo(markersLayer)
          .bindPopup(`
            <div style="font-family:sans-serif;padding:6px;max-width:220px">
              <strong style="color:#b91c1c;font-size:14px">จุดเสี่ยงที่ควรเฝ้าระวัง</strong>
              <p style="color:#475569;font-size:12px;line-height:1.55;margin:6px 0 0">${escapeHtml(point.location)}</p>
              <p style="color:#94a3b8;font-size:10px;line-height:1.45;margin:5px 0 0">พิกัดถูกปัดเพื่อคุ้มครองข้อมูลผู้ยื่นคำร้อง</p>
            </div>
          `);
      }
    }

    if (visibleLayers.incidents) {
      for (const point of points) {
        const incidentIcon = leaflet.divIcon({
          className: 'rawai-incident-marker',
          html: `<div style="width:28px;height:28px;border-radius:9999px;background:#f59e0b;border:3px solid white;color:white;display:flex;align-items:center;justify-content:center;font:800 10px sans-serif;box-shadow:0 5px 16px rgba(120,53,15,.35)">${point.count}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        leaflet
          .marker(
            [point.lat, point.lng],
            { icon: incidentIcon },
          )
          .addTo(markersLayer)
          .bindPopup(`
            <div style="font-family:sans-serif;padding:6px;max-width:220px">
              <strong style="color:#b45309;font-size:14px">จุดเหตุจากคำร้อง</strong>
              <p style="color:#475569;font-size:12px;line-height:1.55;margin:6px 0 0">${escapeHtml(point.location)}</p>
              <p style="color:#94a3b8;font-size:10px;line-height:1.45;margin:5px 0 0">แสดงแบบรวมกลุ่มและปัดพิกัดประมาณ 100 เมตร</p>
            </div>
          `);
      }
    }

    if (visibleLayers.cameras) {
      for (const camera of mappedCameras) {
        const cameraIcon = leaflet.divIcon({
          className: 'rawai-camera-marker',
          html: `
            <div style="width:38px;height:38px;border-radius:13px;background:linear-gradient(135deg,#43b99a,#201c56);border:3px solid white;color:white;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(32,28,86,.35)">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7.8 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2.8z"/><circle cx="12" cy="13" r="3"/></svg>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        leaflet
          .marker(
            [
              camera.latitude,
              camera.longitude,
            ],
            { icon: cameraIcon },
          )
          .addTo(markersLayer)
          .bindPopup(`
            <div style="font-family:sans-serif;padding:6px;max-width:230px">
              <strong style="color:#201c56;font-size:14px">${escapeHtml(camera.shortName)}</strong>
              <p style="color:#475569;font-size:12px;line-height:1.55;margin:6px 0 0">${escapeHtml(camera.location)}</p>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
                <span style="border-radius:999px;background:#ecfdf5;color:#047857;padding:3px 7px;font-size:10px;font-weight:700">${escapeHtml(CAMERA_CATEGORY_LABELS[camera.category])}</span>
                <span style="border-radius:999px;background:#f1f5f9;color:#475569;padding:3px 7px;font-size:10px;font-weight:700">${escapeHtml(CAMERA_STATUS_LABELS[camera.status])}</span>
              </div>
              <p style="color:#94a3b8;font-size:10px;line-height:1.45;margin:7px 0 0">แผนที่ไม่เปิดสตรีม จึงไม่ใช้แบนด์วิดท์กล้องจนกว่าจะไปหน้ารับชม</p>
            </div>
          `);
      }
    }
  }, [
    loadStatus,
    mappedCameras,
    points,
    riskPoints,
    visibleLayers,
  ]);

  const isMapLoading =
    loading ||
    loadStatus === 'loading';
  const activeLayerCount =
    Object.values(visibleLayers)
      .filter(Boolean).length;

  const toggleLayer = (
    layerId: MapLayerId,
  ): void => {
    setVisibleLayers((current) => ({
      ...current,
      [layerId]: !current[layerId],
    }));
  };

  return (
    <div className="w-full animate-in fade-in duration-700">
      <div className="mb-7 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-4xl">
            แผนที่ข้อมูลพื้นที่ราไวย์
          </h2>
          <p className="max-w-2xl font-medium leading-relaxed text-slate-500">
            เลือกเปิด–ปิดชั้นข้อมูลกล้องออนไลน์ จุดเหตุจากคำร้อง และพื้นที่เสี่ยง เพื่อดูภาพรวมโดยไม่เปิดเผยข้อมูลส่วนบุคคล
          </p>
        </div>

        {onOpenCameras && (
          <button
            type="button"
            onClick={onOpenCameras}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-110"
            style={{ background: 'var(--brand-gradient)' }}
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            ไปหน้ากล้องออนไลน์
          </button>
        )}
      </div>

      <div
        className="mb-5 grid gap-3 sm:grid-cols-3"
        aria-label="เลือกชั้นข้อมูลบนแผนที่"
      >
        {layerOptions.map((layer) => {
          const LayerIcon = layer.icon;
          const isActive =
            visibleLayers[layer.id];

          return (
            <button
              key={layer.id}
              type="button"
              onClick={() =>
                toggleLayer(layer.id)
              }
              aria-pressed={isActive}
              className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                isActive
                  ? layer.tone
                  : 'border-slate-200 bg-white text-slate-400'
              }`}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-white/80' : 'bg-slate-100'}`}>
                <LayerIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-bold">
                  {layer.label}
                  <span className={`h-2 w-2 rounded-full ${isActive ? layer.dot : 'bg-slate-300'}`} />
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-medium opacity-75">
                  {layer.description}
                </span>
              </span>
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white/80 px-2 text-xs font-black shadow-sm">
                {isActive ? layer.count : '–'}
              </span>
            </button>
          );
        })}
      </div>

      {!loading &&
        mappedCameras.length === 0 &&
        points.length === 0 && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
            <p className="text-xs font-medium leading-relaxed">
              ขณะนี้ยังไม่มีรายการที่มีพิกัดสำหรับเผยแพร่ กล้องจะแสดงเมื่อ Admin ระบุละติจูด–ลองจิจูดและเปิด “เผยแพร่ให้ประชาชน” ส่วนจุดเหตุจะแสดงเมื่อคำร้องมีพิกัดที่ผ่านการตรวจสอบ
            </p>
          </div>
        )}

      <div className="group relative">
        <div
          className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-100 via-blue-100 to-red-100 opacity-60 blur-xl transition duration-1000 group-hover:opacity-100"
          aria-hidden="true"
        />
        <div className="relative z-10 h-[520px] w-full overflow-hidden rounded-3xl border-4 border-white bg-slate-50 shadow-2xl shadow-slate-200/50 transition-all duration-500">
          <div
            ref={mapContainerRef}
            className="h-full w-full"
            style={{ zIndex: 1 }}
            role="img"
            aria-label={`แผนที่ข้อมูลพื้นที่ แสดงกล้อง ${mappedCameras.length} จุด จุดเหตุ ${points.length} จุด และจุดเสี่ยง ${riskPoints.length} จุด`}
          />

          {isMapLoading && (
            <div
              className="absolute inset-0 z-[20] flex items-center justify-center bg-white/90 backdrop-blur-md"
              role="status"
            >
              <div className="flex flex-col items-center gap-4">
                <Navigation className="h-10 w-10 animate-spin text-[#43b99a]" aria-hidden="true" />
                <span className="animate-pulse text-sm font-bold uppercase tracking-widest text-slate-800">
                  กำลังเตรียมชั้นข้อมูล...
                </span>
              </div>
            </div>
          )}

          {loadStatus === 'error' && (
            <div
              className="absolute inset-0 z-[21] flex flex-col items-center justify-center gap-3 bg-red-50 px-6 text-center text-red-700"
              role="alert"
            >
              <AlertCircle className="h-8 w-8" aria-hidden="true" />
              <p className="text-sm font-semibold">
                ไม่สามารถโหลดแผนที่ได้ กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่
              </p>
            </div>
          )}

          <div className="pointer-events-none absolute left-4 top-4 z-[20] sm:left-6 sm:top-6">
            <div className="max-w-[220px] rounded-2xl border border-white/60 bg-white/90 p-4 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-2">
                <MapIcon className="h-4 w-4 text-[#201c56]" aria-hidden="true" />
                <span className="text-[11px] font-bold text-slate-800">
                  เปิดอยู่ {activeLayerCount} ชั้นข้อมูล
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
                {layerOptions
                  .filter(
                    (layer) =>
                      visibleLayers[layer.id],
                  )
                  .map((layer) => (
                    <span key={layer.id} className="inline-flex items-center gap-1.5 text-[9px] font-bold text-slate-600">
                      <span className={`h-2 w-2 rounded-full ${layer.dot}`} />
                      {layer.label}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-5 left-4 right-4 z-[20] flex justify-center sm:bottom-6 sm:left-6 sm:right-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 shadow-2xl backdrop-blur-md sm:rounded-full sm:px-6">
              <div className="flex items-start gap-3 text-white sm:items-center">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#43b99a] sm:mt-0" aria-hidden="true" />
                <p className="text-[10px] font-bold leading-relaxed tracking-wide sm:text-[11px]">
                  ตำแหน่งคำร้องเป็นข้อมูลโดยประมาณเพื่อความเป็นส่วนตัว
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccidentMap;
