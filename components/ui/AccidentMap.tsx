'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  AlertCircle,
  AlertTriangle,
  Info,
  Map as MapIcon,
  Navigation,
} from 'lucide-react';

export interface AccidentPoint {
  lat: number;
  lng: number;
  location: string;
}

interface AccidentMapProps {
  points?: AccidentPoint[];
  loading?: boolean;
}

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

interface AccidentLeafletNamespace {
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
    L?: AccidentLeafletNamespace;
  };

type MapLoadStatus =
  | 'loading'
  | 'ready'
  | 'error';

const LEAFLET_SCRIPT_ID =
  'leaflet-script';

const LEAFLET_STYLE_ID =
  'leaflet-css';

function getLeaflet():
  AccidentLeafletNamespace | null {
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

const AccidentMap = ({
  points = [],
  loading = false,
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

    const map =
      leaflet
        .map(
          mapContainerRef.current,
        )
        .setView(
          [7.821, 98.3125],
          13,
        );

    const markersLayer =
      leaflet
        .layerGroup()
        .addTo(map);

    mapInstanceRef.current =
      map;

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

      mapInstanceRef.current =
        null;

      markersLayerRef.current =
        null;
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

    const accidentIcon =
      leaflet.divIcon({
        className:
          'custom-accident-marker',

        html: `
          <div style="position:relative">
            <div style="position:absolute;width:24px;height:24px;background:rgba(239,68,68,.2);border-radius:9999px;top:-6px;left:-6px;animation:rawai-map-pulse 2s infinite"></div>
            <div style="width:12px;height:12px;background:#ef4444;border:2px solid white;border-radius:9999px;box-shadow:0 0 8px rgba(0,0,0,.2)"></div>
          </div>
          <style>
            @keyframes rawai-map-pulse {
              0% {
                transform: scale(1);
                opacity: .8;
              }
              100% {
                transform: scale(2.5);
                opacity: 0;
              }
            }
          </style>
        `,

        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

    for (const point of points) {
      leaflet
        .marker(
          [
            point.lat,
            point.lng,
          ],
          {
            icon: accidentIcon,
          },
        )
        .addTo(markersLayer)
        .bindPopup(`
          <div style="font-family:sans-serif;padding:5px">
            <strong style="color:#ef4444;font-size:14px">
              พื้นที่เกิดอุบัติเหตุ
            </strong>
            <br />
            <span style="color:#64748b;font-size:12px">
              ${escapeHtml(point.location)}
            </span>
          </div>
        `);
    }
  }, [
    loadStatus,
    points,
  ]);

  const isMapLoading =
    loading ||
    loadStatus === 'loading';

  return (
    <div className="w-full animate-in fade-in duration-700">
      <div className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-red-600 shadow-sm">
            <AlertTriangle
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />

            Accident Risk Monitoring
          </div>

          <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-4xl">
            แผนที่จุดเสี่ยง
            <br className="md:hidden" />{' '}
            <span className="text-slate-400">
              อุบัติเหตุจราจร
            </span>
          </h2>

          <p className="max-w-lg font-medium leading-relaxed text-slate-500">
            รวบรวมตำแหน่งที่เกิดเหตุจริงจากระบบ
            เพื่อให้ประชาชนร่วมเฝ้าระวัง
            และใช้ความระมัดระวังเป็นพิเศษในจุดเสี่ยง
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-2 pr-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-400">
            <MapIcon
              className="h-6 w-6"
              aria-hidden="true"
            />
          </div>

          <div>
            <p className="mb-1 text-[10px] font-bold uppercase leading-none tracking-widest text-slate-400">
              Total Hotspots
            </p>

            <p className="text-2xl font-bold leading-none text-slate-900">
              {points.length}{' '}

              <span className="ml-1 text-sm font-bold uppercase text-slate-400">
                Points
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="group relative">
        <div
          className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-red-100 to-transparent opacity-50 blur-xl transition duration-1000 group-hover:opacity-100"
          aria-hidden="true"
        />

        <div className="relative z-10 h-[500px] w-full overflow-hidden rounded-3xl border-4 border-white bg-slate-50 shadow-2xl shadow-slate-200/50 transition-all duration-500 group-hover:shadow-red-900/5">
          <div
            ref={mapContainerRef}
            className="h-full w-full"
            style={{
              zIndex: 1,
            }}
            role="img"
            aria-label={`แผนที่แสดงจุดเสี่ยงอุบัติเหตุ ${points.length} จุด`}
          />

          {isMapLoading && (
            <div
              className="absolute inset-0 z-[20] flex items-center justify-center bg-white/90 backdrop-blur-md"
              role="status"
            >
              <div className="flex flex-col items-center gap-4">
                <Navigation
                  className="h-10 w-10 animate-spin text-emerald-500"
                  aria-hidden="true"
                />

                <span className="animate-pulse text-sm font-bold uppercase tracking-widest text-slate-800">
                  กำลังดึงข้อมูลพิกัด...
                </span>
              </div>
            </div>
          )}

          {loadStatus ===
            'error' && (
            <div
              className="absolute inset-0 z-[21] flex flex-col items-center justify-center gap-3 bg-red-50 px-6 text-center text-red-700"
              role="alert"
            >
              <AlertCircle
                className="h-8 w-8"
                aria-hidden="true"
              />

              <p className="text-sm font-semibold">
                ไม่สามารถโหลดแผนที่ได้
                กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่
              </p>
            </div>
          )}

          <div className="pointer-events-none absolute left-6 top-6 z-[20]">
            <div className="max-w-[200px] rounded-2xl border border-white/50 bg-white/80 p-4 shadow-lg backdrop-blur-md">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                  aria-hidden="true"
                />

                <span className="text-[11px] font-bold uppercase text-slate-800">
                  จุดอันตราย
                </span>
              </div>

              <p className="text-[10px] font-medium leading-tight text-slate-500">
                พิกัดจากการแจ้งเหตุผ่านระบบ
                Digital CCTV Portal
              </p>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-6 left-6 right-6 z-[20] flex justify-center">
            <div className="rounded-full border border-white/10 bg-slate-900/90 px-6 py-3 shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-3 text-white">
                <Info
                  className="h-4 w-4 text-emerald-400"
                  aria-hidden="true"
                />

                <p className="text-[11px] font-bold tracking-wide">
                  โปรดใช้ความระมัดระวังเมื่อเข้าใกล้บริเวณสัญลักษณ์สีแดง
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