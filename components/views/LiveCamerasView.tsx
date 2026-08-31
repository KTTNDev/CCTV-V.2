"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  collection,
  onSnapshot,
  query as firestoreQuery,
  where,
} from "firebase/firestore";
import {
  ArrowLeft,
  BookOpen,
  CarFront,
  CircleCheck,
  CloudRain,
  Grid2X2,
  Info,
  MapPin,
  MonitorPlay,
  Pause,
  Play,
  Search,
  ShieldCheck,
  WifiOff,
} from "lucide-react";

import {
  PUBLIC_CAMERAS,
  PUBLIC_CAMERA_CATEGORIES,
  buildPublicCameraUrl,
  getPublicStreamGatewayUrl,
  normalizePublicCamera,
  type PublicCamera,
  type PublicCameraCategory,
} from "../../lib/public-cameras";
import { db } from "../../lib/firebase";

interface LiveCamerasViewProps {
  setView: (view: string) => void;
  onGuideClick: () => void;
}

type CameraFilter =
  | "all"
  | PublicCameraCategory;

type ViewMode = "focus" | "grid";

const MAX_GRID_STREAMS = 4;

const CATEGORY_META:
  Record<
    PublicCameraCategory,
    {
      label: string;
      icon: React.ElementType;
      tone: string;
    }
  > = {
    flood: {
      label: "น้ำท่วม",
      icon: CloudRain,
      tone: "bg-sky-50 text-sky-700",
    },
    traffic: {
      label: "การจราจร",
      icon: CarFront,
      tone: "bg-amber-50 text-amber-700",
    },
    tourism: {
      label: "ท่องเที่ยว",
      icon: MapPin,
      tone: "bg-emerald-50 text-emerald-700",
    },
  };

function CameraStream({
  camera,
  shouldPlay,
  onStart,
  onStop,
  compact = false,
}: {
  camera: PublicCamera;
  shouldPlay: boolean;
  onStart: () => void;
  onStop: () => void;
  compact?: boolean;
}) {
  const streamUrl =
    buildPublicCameraUrl(camera);
  const isConfigured =
    Boolean(streamUrl);
  const isAvailable =
    isConfigured &&
    camera.status === "online";

  return (
    <div className="group relative aspect-video overflow-hidden rounded-2xl bg-slate-950 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.9)] ring-1 ring-white/10">
      {shouldPlay && isAvailable && streamUrl ? (
        <iframe
          src={streamUrl}
          title={`กล้องสด ${camera.name}`}
          loading="lazy"
          scrolling="no"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0 bg-black"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.28),_transparent_52%),linear-gradient(145deg,#0f172a,#020617)] px-6 text-center text-white">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-emerald-300 shadow-2xl backdrop-blur sm:h-16 sm:w-16">
            {isAvailable ? (
              <MonitorPlay className="h-7 w-7" />
            ) : (
              <WifiOff className="h-7 w-7" />
            )}
          </span>
          <p className={`${compact ? "mt-3 text-sm" : "mt-5 text-base sm:text-lg"} font-bold`}>
            {camera.status === "maintenance"
              ? "กล้องอยู่ระหว่างบำรุงรักษา"
              : camera.status === "offline"
                ? "กล้องออฟไลน์ชั่วคราว"
                : isConfigured
                  ? "หยุดสตรีมเพื่อประหยัดข้อมูล"
                  : "รอเปิดให้รับชม"}
          </p>
          {!compact && (
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400 sm:text-sm">
              {isAvailable
                ? "ระบบจะเชื่อมกล้องเมื่อคุณกดเริ่มรับชมเท่านั้น"
                : camera.status !== "online"
                  ? "เจ้าหน้าที่กำลังตรวจสอบและจะเปิดให้รับชมเมื่อพร้อม"
                  : "สตรีมนี้ยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง"}
            </p>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/75 to-transparent p-4 text-white">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold sm:text-sm">
            {camera.shortName}
          </p>
          {!compact && (
            <p className="mt-1 truncate text-[10px] text-white/65">
              {camera.location}
            </p>
          )}
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold ${shouldPlay ? "bg-red-600 text-white" : "bg-black/35 text-white/75 backdrop-blur"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${shouldPlay ? "animate-pulse bg-white" : isConfigured ? "bg-emerald-400" : "bg-slate-400"}`} />
          {shouldPlay && isAvailable
            ? "LIVE"
            : isAvailable
              ? "พร้อมรับชม"
              : camera.status === "maintenance"
                ? "บำรุงรักษา"
                : camera.status === "offline"
                  ? "ออฟไลน์"
                  : "ยังไม่เชื่อมต่อ"}
        </span>
      </div>

      {isAvailable && (
        <button
          type="button"
          onClick={
            shouldPlay
              ? onStop
              : onStart
          }
          className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 shadow-xl transition hover:scale-105 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
        >
          {shouldPlay ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
          {shouldPlay
            ? "หยุดรับชม"
            : "เริ่มรับชม"}
        </button>
      )}
    </div>
  );
}

const LiveCamerasView:
  React.FC<LiveCamerasViewProps> = ({
    setView,
    onGuideClick,
  }) => {
    const [filter, setFilter] =
      useState<CameraFilter>("all");
    const [cameras, setCameras] =
      useState<PublicCamera[]>(
        PUBLIC_CAMERAS,
      );
    const [catalogSource, setCatalogSource] =
      useState<
        "loading" | "database" | "fallback"
      >("loading");
    const [query, setQuery] =
      useState("");
    const [viewMode, setViewMode] =
      useState<ViewMode>("focus");
    const [activeCameraId, setActiveCameraId] =
      useState(PUBLIC_CAMERAS[0]?.id ?? "");
    const [focusPlaying, setFocusPlaying] =
      useState(false);
    const [gridCameraIds, setGridCameraIds] =
      useState<string[]>([]);
    const [documentVisible, setDocumentVisible] =
      useState(true);

    useEffect(() => {
      const handleVisibilityChange = () => {
        setDocumentVisible(
          document.visibilityState ===
            "visible",
        );
      };

      handleVisibilityChange();
      document.addEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      };
    }, []);

    useEffect(() => {
      const cameraQuery = firestoreQuery(
        collection(
          db,
          "public_cameras",
        ),
        where(
          "published",
          "==",
          true,
        ),
      );

      return onSnapshot(
        cameraQuery,
        (snapshot) => {
          const records =
            snapshot.docs.flatMap(
              (cameraDocument) => {
                const camera =
                  normalizePublicCamera(
                    cameraDocument.id,
                    cameraDocument.data(),
                  );

                return camera
                  ? [camera]
                  : [];
              },
            ).sort(
              (left, right) =>
                left.sortOrder -
                right.sortOrder,
            );

          setCameras(records);
          setFocusPlaying(false);
          setActiveCameraId(
            (current) =>
              records.some(
                (camera) =>
                  camera.id === current,
              )
                ? current
                : records[0]?.id ?? "",
          );
          setGridCameraIds(
            (current) =>
              current.filter((id) =>
                records.some(
                  (camera) =>
                    camera.id === id,
                ),
              ),
          );
          setCatalogSource("database");
        },
        (error) => {
          console.warn(
            "Public camera catalog unavailable:",
            error,
          );
          setCameras(PUBLIC_CAMERAS);
          setFocusPlaying(false);
          setActiveCameraId(
            (current) =>
              PUBLIC_CAMERAS.some(
                (camera) =>
                  camera.id === current,
              )
                ? current
                : PUBLIC_CAMERAS[0]
                    ?.id ?? "",
          );
          setCatalogSource("fallback");
        },
      );
    }, []);

    const gatewayConfigured =
      Boolean(
        getPublicStreamGatewayUrl(),
      );

    const filteredCameras =
      useMemo(() => {
        const normalizedQuery = query
          .trim()
          .toLocaleLowerCase("th-TH");

        return cameras.filter(
          (camera) => {
            const categoryMatches =
              filter === "all" ||
              camera.category === filter;
            const queryMatches =
              !normalizedQuery ||
              [
                camera.name,
                camera.shortName,
                camera.location,
              ].some((value) =>
                value
                  .toLocaleLowerCase(
                    "th-TH",
                  )
                  .includes(
                    normalizedQuery,
                  ),
              );

            return (
              categoryMatches &&
              queryMatches
            );
          },
        );
      }, [cameras, filter, query]);

    const activeCamera =
      cameras.find(
        (camera) =>
          camera.id === activeCameraId,
      ) ?? cameras[0];

    const gridCameras =
      gridCameraIds
        .map((id) =>
          cameras.find(
            (camera) => camera.id === id,
          ),
        )
        .filter(
          (
            camera,
          ): camera is PublicCamera =>
            Boolean(camera),
        );

    const selectFocusCamera = (
      camera: PublicCamera,
    ) => {
      setActiveCameraId(camera.id);
      setFocusPlaying(false);
    };

    const toggleGridCamera = (
      camera: PublicCamera,
    ) => {
      setGridCameraIds(
        (current) => {
          if (
            current.includes(camera.id)
          ) {
            return current.filter(
              (id) => id !== camera.id,
            );
          }

          if (
            current.length >=
            MAX_GRID_STREAMS
          ) {
            return current;
          }

          return [...current, camera.id];
        },
      );
    };

    return (
      <div className="min-h-screen bg-slate-50">
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.2),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(37,99,235,0.24),transparent_34%)]" />
          <div className="relative mx-auto max-w-7xl px-6 pb-12 pt-10 sm:pb-16 sm:pt-14">
            <button
              type="button"
              onClick={() => setView("home")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 backdrop-blur transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              กลับหน้าหลัก
            </button>

            <div className="mt-9 grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
                  กล้องออนไลน์สาธารณะ
                  <span className="mt-2 block text-emerald-300">
                    ดูสถานการณ์ก่อนออกเดินทาง
                  </span>
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  เลือกดูสภาพน้ำ การจราจร และแหล่งท่องเที่ยวก่อนออกเดินทาง
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    กล้องสาธารณะ
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {cameras.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    ดูพร้อมกันสูงสุด
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {MAX_GRID_STREAMS}
                    <span className="ml-1 text-xs text-slate-400">
                      กล้อง
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sticky top-20 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:pb-0">
              {PUBLIC_CAMERA_CATEGORIES.map(
                (category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      setFilter(category.id)
                    }
                    aria-pressed={
                      filter === category.id
                    }
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition ${filter === category.id ? "bg-slate-950 text-white shadow-lg" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    {category.label}
                  </button>
                ),
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative block min-w-0 sm:w-64">
                <span className="sr-only">
                  ค้นหากล้อง
                </span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) =>
                    setQuery(
                      event.target.value,
                    )
                  }
                  placeholder="ค้นหาสถานที่..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                />
              </label>

              <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() =>
                    setViewMode("focus")
                  }
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold transition ${viewMode === "focus" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                >
                  <MonitorPlay className="h-4 w-4" />
                  จอหลัก
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setViewMode("grid")
                  }
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold transition ${viewMode === "grid" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                >
                  <Grid2X2 className="h-4 w-4" />
                  หลายกล้อง
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-8 sm:py-10">
          {!gatewayConfigured && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-bold">
                  ระบบถ่ายทอดสดกำลังเตรียมพร้อม
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800">
                  รายการกล้องยังเปิดดูได้ตามปกติ และจะเริ่มรับชมได้เมื่อระบบเชื่อมต่อสำเร็จ
                </p>
              </div>
            </div>
          )}

          {viewMode === "focus" && activeCamera && (
            <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <CameraStream
                  camera={activeCamera}
                  shouldPlay={
                    focusPlaying &&
                    documentVisible
                  }
                  onStart={() =>
                    setFocusPlaying(true)
                  }
                  onStop={() =>
                    setFocusPlaying(false)
                  }
                />
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-950">
                          {activeCamera.name}
                        </h2>
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${CATEGORY_META[activeCamera.category].tone}`}>
                          {CATEGORY_META[
                            activeCamera.category
                          ].label}
                        </span>
                      </div>
                      <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <MapPin className="h-4 w-4" />
                        {activeCamera.location}
                      </p>
                      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                        {activeCamera.description}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700">
                      <ShieldCheck className="h-4 w-4" />
                      กล้องสาธารณะที่อนุมัติแล้ว
                    </span>
                  </div>
                </div>
              </div>

              <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-44">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slate-950">
                      เลือกจุดรับชม
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                    {filteredCameras.length} จุด
                  </span>
                </div>

                <div className="mt-5 max-h-[540px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {filteredCameras.map(
                    (camera) => {
                      const Icon =
                        CATEGORY_META[
                          camera.category
                        ].icon;
                      const isActive =
                        camera.id ===
                        activeCamera.id;

                      return (
                        <button
                          key={camera.id}
                          type="button"
                          onClick={() =>
                            selectFocusCamera(
                              camera,
                            )
                          }
                          aria-pressed={isActive}
                          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${isActive ? "border-emerald-200 bg-emerald-50 shadow-sm" : "border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white"}`}
                        >
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${CATEGORY_META[camera.category].tone}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-bold text-slate-900">
                              {camera.shortName}
                            </span>
                            <span className="mt-1 block truncate text-[10px] text-slate-500">
                              {camera.location}
                            </span>
                          </span>
                          {isActive && (
                            <CircleCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              </aside>
            </div>
          )}

          {viewMode === "focus" &&
            !activeCamera &&
            catalogSource !== "loading" && (
              <div className="flex min-h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 text-center">
                <WifiOff className="h-10 w-10 text-slate-300" />
                <h2 className="mt-4 font-bold text-slate-900">
                  ยังไม่มีกล้องที่เผยแพร่
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  โปรดลองใหม่ภายหลัง
                </p>
              </div>
            )}

          {viewMode === "grid" && (
            <div>
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-slate-950">
                    โหมดหลายกล้อง
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    เลือกได้สูงสุด {MAX_GRID_STREAMS} กล้อง
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">
                    {gridCameraIds.length}/{MAX_GRID_STREAMS}
                  </span>
                  {gridCameraIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setGridCameraIds([])
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      หยุดทั้งหมด
                    </button>
                  )}
                </div>
              </div>

              {gridCameras.length > 0 ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {gridCameras.map(
                    (camera) => (
                      <CameraStream
                        key={camera.id}
                        camera={camera}
                        compact
                        shouldPlay={
                          documentVisible
                        }
                        onStart={() => undefined}
                        onStop={() =>
                          toggleGridCamera(
                            camera,
                          )
                        }
                      />
                    ),
                  )}
                </div>
              ) : (
                <div className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 text-center">
                  <Grid2X2 className="h-10 w-10 text-slate-300" />
                  <p className="mt-4 font-bold text-slate-800">
                    ยังไม่ได้เลือกกล้อง
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    เลือกจากรายการด้านล่างเพื่อเริ่มสร้างหน้าจอเฝ้าดู
                  </p>
                </div>
              )}

              <div className="mt-8">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      รายการกล้อง
                    </h2>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {filteredCameras.length} จุด
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredCameras.map(
                    (camera) => {
                      const isSelected =
                        gridCameraIds.includes(
                          camera.id,
                        );
                      const unavailable =
                        camera.status !==
                        "online";
                      const limitReached =
                        !isSelected &&
                        gridCameraIds.length >=
                          MAX_GRID_STREAMS;
                      const Icon =
                        CATEGORY_META[
                          camera.category
                        ].icon;

                      return (
                        <button
                          key={camera.id}
                          type="button"
                          disabled={
                            limitReached ||
                            unavailable
                          }
                          onClick={() =>
                            toggleGridCamera(
                              camera,
                            )
                          }
                          aria-pressed={isSelected}
                          className={`group rounded-2xl border p-4 text-left transition ${isSelected ? "border-emerald-300 bg-emerald-50 shadow-md" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${CATEGORY_META[camera.category].tone}`}>
                              <Icon className="h-5 w-5" />
                            </span>
                            {isSelected ? (
                              <CircleCheck className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">
                                {unavailable
                                  ? "ไม่พร้อม"
                                  : "เลือก"}
                              </span>
                            )}
                          </div>
                          <p className="mt-4 truncate text-sm font-bold text-slate-950">
                            {camera.shortName}
                          </p>
                          <p className="mt-1 truncate text-[10px] text-slate-500">
                            {camera.location}
                          </p>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </div>
          )}

          <section className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-slate-200 py-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-900">สงสัยเรื่องการรับชมและความเป็นส่วนตัว?</h2>
              <p className="mt-1 text-xs text-slate-500">อ่านรายละเอียดเมื่อคุณต้องการ โดยไม่รบกวนการใช้งานหลัก</p>
            </div>
            <button type="button" onClick={onGuideClick} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
              <BookOpen className="h-4 w-4" />
              เปิดคู่มือกล้องออนไลน์
            </button>
          </section>
        </div>
      </div>
    );
  };

export default LiveCamerasView;
