'use client';

import {
  memo,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  AlertCircle,
  MapPin as MapPinIcon,
  Navigation,
} from 'lucide-react';

interface LocationPickerProps {
  onLocationSelect: (
    lat: number,
    lng: number,
  ) => void;

  initialLat: number | null;
  initialLng: number | null;
}

interface LeafletCoordinates {
  lat: number;
  lng: number;
}

interface LeafletClickEvent {
  latlng: LeafletCoordinates;
}

interface LeafletMapInstance {
  setView(
    coordinates: [number, number],
    zoom: number,
  ): LeafletMapInstance;

  on(
    event: 'click',
    handler: (
      event: LeafletClickEvent,
    ) => void,
  ): LeafletMapInstance;

  remove(): void;
}

interface LeafletMarkerInstance {
  addTo(
    map: LeafletMapInstance,
  ): LeafletMarkerInstance;

  setLatLng(
    coordinates: [number, number],
  ): LeafletMarkerInstance;
}

interface LeafletTileLayer {
  addTo(
    map: LeafletMapInstance,
  ): LeafletTileLayer;
}

interface LeafletNamespace {
  map(
    element: HTMLElement,
  ): LeafletMapInstance;

  marker(
    coordinates: [number, number],
  ): LeafletMarkerInstance;

  tileLayer(
    url: string,
    options: {
      attribution: string;
    },
  ): LeafletTileLayer;

  Icon: {
    Default: {
      prototype: {
        _getIconUrl?: unknown;
      };

      mergeOptions(
        options: {
          iconRetinaUrl: string;
          iconUrl: string;
          shadowUrl: string;
        },
      ): void;
    };
  };
}

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

type MapLoadStatus =
  | 'loading'
  | 'ready'
  | 'error';

const LEAFLET_SCRIPT_ID =
  'leaflet-script';

const LEAFLET_STYLE_ID =
  'leaflet-css';

const DEFAULT_LATITUDE = 7.7818;
const DEFAULT_LONGITUDE = 98.3125;

const LocationPicker = memo(
  ({
    onLocationSelect,
    initialLat,
    initialLng,
  }: LocationPickerProps) => {
    const mapContainerRef =
      useRef<HTMLDivElement>(null);

    const mapInstanceRef =
      useRef<LeafletMapInstance | null>(
        null,
      );

    const initialPositionRef =
      useRef({
        latitude: initialLat,
        longitude: initialLng,
      });

    const [
      loadStatus,
      setLoadStatus,
    ] = useState<MapLoadStatus>(
      () =>
        typeof window !==
          'undefined' &&
        Boolean(window.L)
          ? 'ready'
          : 'loading',
    );

    const [
      address,
      setAddress,
    ] = useState(() => {
      if (
        initialLat === null ||
        initialLng === null
      ) {
        return '';
      }

      return (
        `${initialLat.toFixed(6)}, ` +
        initialLng.toFixed(6)
      );
    });

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

      if (window.L) {
        return;
      }

      const handleLoad = () => {
        setLoadStatus('ready');
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
        mapInstanceRef.current ||
        !window.L
      ) {
        return;
      }

      const leaflet = window.L;

      if (
        leaflet.Icon.Default
          .prototype._getIconUrl
      ) {
        delete leaflet.Icon.Default
          .prototype._getIconUrl;
      }

      leaflet.Icon.Default
        .mergeOptions({
          iconRetinaUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',

          iconUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',

          shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

      const initialPosition =
        initialPositionRef.current;

      const defaultLatitude =
        initialPosition.latitude ??
        DEFAULT_LATITUDE;

      const defaultLongitude =
        initialPosition.longitude ??
        DEFAULT_LONGITUDE;

      const map =
        leaflet
          .map(
            mapContainerRef.current,
          )
          .setView(
            [
              defaultLatitude,
              defaultLongitude,
            ],
            13,
          );

      mapInstanceRef.current = map;

      leaflet
        .tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution:
              '© OpenStreetMap contributors',
          },
        )
        .addTo(map);

      let marker:
        | LeafletMarkerInstance
        | null =
        initialPosition.latitude !==
          null &&
        initialPosition.longitude !==
          null
          ? leaflet
              .marker([
                initialPosition.latitude,
                initialPosition.longitude,
              ])
              .addTo(map)
          : null;

      map.on(
        'click',
        (event) => {
          const {
            lat,
            lng,
          } = event.latlng;

          if (marker) {
            marker.setLatLng([
              lat,
              lng,
            ]);
          } else {
            marker =
              leaflet
                .marker([
                  lat,
                  lng,
                ])
                .addTo(map);
          }

          setAddress(
            `${lat.toFixed(6)}, ` +
              lng.toFixed(6),
          );

          onLocationSelect(
            lat,
            lng,
          );
        },
      );

      return () => {
        map.remove();

        mapInstanceRef.current =
          null;
      };
    }, [
      loadStatus,
      onLocationSelect,
    ]);

    return (
      <div className="space-y-3">
        <div className="group relative z-0 h-[320px] w-full overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-50 shadow-sm transition-colors hover:border-blue-300">
          <div
            ref={mapContainerRef}
            className="h-full w-full"
            style={{
              zIndex: 1,
            }}
            role="application"
            aria-label="แผนที่สำหรับเลือกตำแหน่งที่เกิดเหตุ"
          />

          {loadStatus ===
            'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-500">
              <span className="flex animate-pulse items-center gap-2 text-sm font-medium">
                <Navigation
                  className="h-5 w-5 animate-spin text-blue-500"
                  aria-hidden="true"
                />

                กำลังโหลดแผนที่...
              </span>
            </div>
          )}

          {loadStatus ===
            'error' && (
            <div
              role="alert"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-red-50 px-6 text-center text-red-700"
            >
              <AlertCircle
                className="h-7 w-7"
                aria-hidden="true"
              />

              <p className="text-sm font-semibold">
                ไม่สามารถโหลดแผนที่ได้
                กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 px-2 text-xs font-medium text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-1.5">
            <MapPinIcon
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />

            แตะที่แผนที่เพื่อปักหมุดตำแหน่งที่เกิดเหตุ
          </span>

          <output className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-mono font-bold tracking-wide text-blue-700">
            {address ||
              'รอระบุพิกัด'}
          </output>
        </div>
      </div>
    );
  },
);

LocationPicker.displayName =
  'LocationPicker';

export default LocationPicker;