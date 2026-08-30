"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import {
  Archive,
  Camera,
  CheckCircle2,
  Cpu,
  Globe2,
  HardDrive,
  Loader2,
  Network,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Video,
  X,
} from "lucide-react";

import {
  ApiClientError,
  manageCamera,
  type CameraPrivateData,
  type CameraPublicData,
} from "../../lib/api-client";
import { db } from "../../lib/firebase";
import {
  useModalAccessibility,
} from "../../hooks/useModalAccessibility";

interface CameraManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CameraRecord {
  cameraId: string;
  publicData: CameraPublicData;
  privateData: CameraPrivateData;
}

type FormTab = "public" | "technical";

const EMPTY_PUBLIC_DATA:
  CameraPublicData = {
    name: "",
    shortName: "",
    description: "",
    category: "traffic",
    location: "",
    latitude: null,
    longitude: null,
    streamPath: "public/",
    status: "offline",
    published: false,
    sortOrder: 100,
  };

const EMPTY_PRIVATE_DATA:
  CameraPrivateData = {
    siteCode: "",
    cameraType: "fixed",
    brand: "",
    model: "",
    serialNumber: "",
    assetNumber: "",
    ipAddress: "",
    rtspPort: 554,
    rtspPath: "",
    managementUrl: "",
    nvrChannel: "",
    resolution: "",
    direction: "",
    installationDate: "",
    responsibleUnit:
      "ศูนย์ควบคุมและสั่งการระบบ CCTV",
    credentialReference: "",
    technicalNotes: "",
  };

function readString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value
    : "";
}

function readNumber(
  value: unknown,
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function normalizeRecord(
  cameraId: string,
  publicValue:
    Record<string, unknown>,
  privateValue:
    Record<string, unknown>,
): CameraRecord {
  const category = [
    "flood",
    "traffic",
    "tourism",
  ].includes(String(publicValue.category))
    ? (publicValue.category as CameraPublicData["category"])
    : "traffic";
  const status = [
    "online",
    "offline",
    "maintenance",
  ].includes(String(publicValue.status))
    ? (publicValue.status as CameraPublicData["status"])
    : "offline";
  const cameraType = [
    "fixed",
    "ptz",
    "lpr",
    "thermal",
    "other",
  ].includes(String(privateValue.cameraType))
    ? (privateValue.cameraType as CameraPrivateData["cameraType"])
    : "fixed";

  return {
    cameraId,
    publicData: {
      name: readString(
        publicValue.name,
      ),
      shortName: readString(
        publicValue.shortName,
      ),
      description: readString(
        publicValue.description,
      ),
      category,
      location: readString(
        publicValue.location,
      ),
      latitude: readNumber(
        publicValue.latitude,
      ),
      longitude: readNumber(
        publicValue.longitude,
      ),
      streamPath: readString(
        publicValue.streamPath,
      ),
      status,
      published:
        publicValue.published ===
        true,
      sortOrder:
        readNumber(
          publicValue.sortOrder,
        ) ?? 100,
    },
    privateData: {
      siteCode: readString(
        privateValue.siteCode,
      ),
      cameraType,
      brand: readString(
        privateValue.brand,
      ),
      model: readString(
        privateValue.model,
      ),
      serialNumber: readString(
        privateValue.serialNumber,
      ),
      assetNumber: readString(
        privateValue.assetNumber,
      ),
      ipAddress: readString(
        privateValue.ipAddress,
      ),
      rtspPort: readNumber(
        privateValue.rtspPort,
      ),
      rtspPath: readString(
        privateValue.rtspPath,
      ),
      managementUrl: readString(
        privateValue.managementUrl,
      ),
      nvrChannel: readString(
        privateValue.nvrChannel,
      ),
      resolution: readString(
        privateValue.resolution,
      ),
      direction: readString(
        privateValue.direction,
      ),
      installationDate: readString(
        privateValue.installationDate,
      ),
      responsibleUnit: readString(
        privateValue.responsibleUnit,
      ),
      credentialReference: readString(
        privateValue.credentialReference,
      ),
      technicalNotes: readString(
        privateValue.technicalNotes,
      ),
    },
  };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-[10px] leading-relaxed text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
}

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100";

export const CameraManagementModal:
  React.FC<
    CameraManagementModalProps
  > = ({ isOpen, onClose }) => {
    const [records, setRecords] =
      useState<CameraRecord[]>([]);
    const [selectedId, setSelectedId] =
      useState<string | null>(null);
    const [publicData, setPublicData] =
      useState<CameraPublicData>({
        ...EMPTY_PUBLIC_DATA,
      });
    const [privateData, setPrivateData] =
      useState<CameraPrivateData>({
        ...EMPTY_PRIVATE_DATA,
      });
    const [activeTab, setActiveTab] =
      useState<FormTab>("public");
    const [searchQuery, setSearchQuery] =
      useState("");
    const [loading, setLoading] =
      useState(false);
    const [saving, setSaving] =
      useState(false);
    const [errorMessage, setErrorMessage] =
      useState("");
    const [successMessage, setSuccessMessage] =
      useState("");

    const dialogRef =
      useModalAccessibility({
        isOpen,
        onClose,
        closeDisabled: saving,
      });

    const loadRecords =
      useCallback(async () => {
        setLoading(true);
        setErrorMessage("");

        try {
          const [
            publicSnapshot,
            privateSnapshot,
          ] = await Promise.all([
            getDocs(
              query(
                collection(
                  db,
                  "public_cameras",
                ),
                orderBy(
                  "sortOrder",
                  "asc",
                ),
              ),
            ),
            getDocs(
              collection(
                db,
                "camera_private_configs",
              ),
            ),
          ]);

          const privateById =
            new Map(
              privateSnapshot.docs.map(
                (cameraDocument) => [
                  cameraDocument.id,
                  cameraDocument.data(),
                ],
              ),
            );

          const nextRecords =
            publicSnapshot.docs
              .filter(
                (cameraDocument) =>
                  cameraDocument.data()
                    .archived !== true,
              )
              .map((cameraDocument) =>
                normalizeRecord(
                  cameraDocument.id,
                  cameraDocument.data(),
                  privateById.get(
                    cameraDocument.id,
                  ) ?? {},
                ),
              );

          setRecords(nextRecords);
        } catch (error) {
          console.warn(
            "Camera catalog load failed:",
            error,
          );
          setErrorMessage(
            "โหลดข้อมูลกล้องไม่สำเร็จ กรุณาตรวจสอบ Firestore Rules และสิทธิ์ Admin",
          );
        } finally {
          setLoading(false);
        }
      }, []);

    useEffect(() => {
      if (!isOpen) {
        return;
      }

      void loadRecords();
    }, [isOpen, loadRecords]);

    const filteredRecords =
      useMemo(() => {
        const queryValue =
          searchQuery
            .trim()
            .toLocaleLowerCase(
              "th-TH",
            );

        if (!queryValue) {
          return records;
        }

        return records.filter(
          (record) =>
            [
              record.publicData.name,
              record.publicData.location,
              record.privateData.siteCode,
              record.privateData.ipAddress,
              record.privateData.brand,
              record.privateData.model,
            ].some((value) =>
              value
                .toLocaleLowerCase(
                  "th-TH",
                )
                .includes(queryValue),
            ),
        );
      }, [records, searchQuery]);

    const startNew = () => {
      setSelectedId(null);
      setPublicData({
        ...EMPTY_PUBLIC_DATA,
      });
      setPrivateData({
        ...EMPTY_PRIVATE_DATA,
      });
      setActiveTab("public");
      setErrorMessage("");
      setSuccessMessage("");
    };

    const selectRecord = (
      record: CameraRecord,
    ) => {
      setSelectedId(record.cameraId);
      setPublicData({
        ...record.publicData,
      });
      setPrivateData({
        ...record.privateData,
      });
      setErrorMessage("");
      setSuccessMessage("");
    };

    const handleSave = async () => {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      try {
        const result =
          await manageCamera({
            action: "upsert",
            ...(selectedId
              ? {
                  cameraId:
                    selectedId,
                }
              : {}),
            publicData,
            privateData,
          });

        setSelectedId(
          result.cameraId,
        );
        setSuccessMessage(
          result.action === "created"
            ? "เพิ่มกล้องเรียบร้อยแล้ว"
            : "บันทึกข้อมูลกล้องเรียบร้อยแล้ว",
        );
        await loadRecords();
      } catch (error) {
        console.warn(
          "Camera save failed:",
          error,
        );
        setErrorMessage(
          error instanceof
            ApiClientError
            ? error.message
            : "บันทึกข้อมูลกล้องไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        );
      } finally {
        setSaving(false);
      }
    };

    const handleArchive = async () => {
      if (!selectedId) {
        return;
      }

      const confirmed =
        window.confirm(
          "เก็บกล้องนี้เข้าคลังและนำออกจากหน้าประชาชนหรือไม่? ข้อมูลจะยังคงอยู่ในฐานข้อมูล",
        );

      if (!confirmed) {
        return;
      }

      setSaving(true);
      setErrorMessage("");

      try {
        await manageCamera({
          action: "archive",
          cameraId: selectedId,
        });
        startNew();
        setSuccessMessage(
          "เก็บกล้องเข้าคลังเรียบร้อยแล้ว",
        );
        await loadRecords();
      } catch (error) {
        setErrorMessage(
          error instanceof
            ApiClientError
            ? error.message
            : "เก็บกล้องเข้าคลังไม่สำเร็จ",
        );
      } finally {
        setSaving(false);
      }
    };

    if (!isOpen) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-md md:p-6">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          onClick={() => {
            if (!saving) {
              onClose();
            }
          }}
        />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="camera-management-title"
          tabIndex={-1}
          className="relative z-10 flex max-h-[calc(100dvh-1rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-white/20 bg-slate-50 shadow-2xl outline-none md:max-h-[calc(100dvh-3rem)]"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 md:px-7">
            <div className="flex items-start gap-4">
              <span className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-blue-950 text-blue-200 sm:flex">
                <Camera className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-600">
                  Camera inventory
                </p>
                <h2
                  id="camera-management-title"
                  className="mt-1 text-xl font-bold text-slate-950 md:text-2xl"
                >
                  จัดการข้อมูลกล้อง CCTV
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  แยกข้อมูลสาธารณะออกจากข้อมูลเครือข่ายและทรัพย์สิน
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              aria-label="ปิดหน้าจัดการกล้อง"
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="grid min-h-0 flex-1 md:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-white md:border-b-0 md:border-r">
              <div className="border-b border-slate-100 p-4">
                <button
                  type="button"
                  onClick={startNew}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 py-3 text-xs font-bold text-white shadow-lg transition hover:bg-blue-900"
                >
                  <Plus className="h-4 w-4" />
                  เพิ่มกล้องใหม่
                </button>
                <label className="relative mt-3 block">
                  <span className="sr-only">
                    ค้นหากล้อง
                  </span>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) =>
                      setSearchQuery(
                        event.target.value,
                      )
                    }
                    placeholder="ชื่อ, IP, ยี่ห้อ..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-xs font-semibold outline-none focus:border-blue-400 focus:bg-white"
                  />
                </label>
              </div>

              <div className="max-h-64 min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin] md:max-h-none">
                {loading ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : filteredRecords.length > 0 ? (
                  <div className="space-y-2">
                    {filteredRecords.map(
                      (record) => {
                        const selected =
                          selectedId ===
                          record.cameraId;

                        return (
                          <button
                            key={record.cameraId}
                            type="button"
                            onClick={() =>
                              selectRecord(
                                record,
                              )
                            }
                            aria-pressed={selected}
                            className={`w-full rounded-2xl border p-3 text-left transition ${selected ? "border-blue-200 bg-blue-50 shadow-sm" : "border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white"}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-900">
                                  {record.publicData.shortName ||
                                    record.publicData.name}
                                </p>
                                <p className="mt-1 truncate text-[10px] text-slate-500">
                                  {record.privateData.siteCode ||
                                    record.publicData.location}
                                </p>
                              </div>
                              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${record.publicData.status === "online" ? "bg-emerald-500" : record.publicData.status === "maintenance" ? "bg-amber-500" : "bg-slate-400"}`} />
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2 text-[9px] font-bold">
                              <span className="truncate text-slate-400">
                                {record.privateData.ipAddress ||
                                  "ยังไม่ระบุ IP"}
                              </span>
                              <span className={record.publicData.published ? "text-emerald-600" : "text-slate-400"}>
                                {record.publicData.published
                                  ? "เผยแพร่"
                                  : "ฉบับร่าง"}
                              </span>
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                    ยังไม่มีข้อมูลกล้อง
                  </div>
                )}
              </div>
            </aside>

            <main className="min-h-0 overflow-y-auto p-5 [scrollbar-gutter:stable] md:p-7">
              <div className="mx-auto max-w-4xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {selectedId
                        ? `Camera ID: ${selectedId}`
                        : "New camera"}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-slate-950">
                      {selectedId
                        ? "แก้ไขข้อมูลกล้อง"
                        : "เพิ่มกล้องใหม่"}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab("public")
                      }
                      aria-pressed={activeTab === "public"}
                      className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition ${activeTab === "public" ? "bg-white text-blue-900 shadow-sm" : "text-slate-500"}`}
                    >
                      <Globe2 className="h-4 w-4" />
                      ประชาชน
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab("technical")
                      }
                      aria-pressed={activeTab === "technical"}
                      className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition ${activeTab === "technical" ? "bg-white text-blue-900 shadow-sm" : "text-slate-500"}`}
                    >
                      <Cpu className="h-4 w-4" />
                      เจ้าหน้าที่
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                    {errorMessage}
                  </div>
                )}
                {successMessage && (
                  <div role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {successMessage}
                  </div>
                )}

                {activeTab === "public" ? (
                  <div className="mt-6 space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <Video className="h-4 w-4 text-blue-600" />
                        ข้อมูลที่ประชาชนมองเห็น
                      </h4>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <Field label="ชื่อกล้องเต็ม">
                          <input className={inputClass} value={publicData.name} onChange={(event) => setPublicData((current) => ({ ...current, name: event.target.value }))} placeholder="เช่น กล้องตรวจการจราจรแยกไสยวน" />
                        </Field>
                        <Field label="ชื่อย่อบนการ์ด">
                          <input className={inputClass} value={publicData.shortName} onChange={(event) => setPublicData((current) => ({ ...current, shortName: event.target.value }))} placeholder="เช่น แยกไสยวน" />
                        </Field>
                        <Field label="หมวดหมู่">
                          <select className={inputClass} value={publicData.category} onChange={(event) => setPublicData((current) => ({ ...current, category: event.target.value as CameraPublicData["category"] }))}>
                            <option value="flood">เฝ้าระวังน้ำท่วม</option>
                            <option value="traffic">การจราจร</option>
                            <option value="tourism">แหล่งท่องเที่ยว</option>
                          </select>
                        </Field>
                        <Field label="สถานะ">
                          <select className={inputClass} value={publicData.status} onChange={(event) => setPublicData((current) => ({ ...current, status: event.target.value as CameraPublicData["status"] }))}>
                            <option value="online">ออนไลน์</option>
                            <option value="offline">ออฟไลน์</option>
                            <option value="maintenance">บำรุงรักษา</option>
                          </select>
                        </Field>
                        <Field label="จุดติดตั้ง">
                          <input className={inputClass} value={publicData.location} onChange={(event) => setPublicData((current) => ({ ...current, location: event.target.value }))} placeholder="สถานที่ที่ประชาชนเข้าใจได้" />
                        </Field>
                        <Field label="Media Gateway path" hint="เป็นชื่อ path สาธารณะ เช่น public/traffic-01 ไม่ใช่ RTSP URL">
                          <input className={inputClass} value={publicData.streamPath} onChange={(event) => setPublicData((current) => ({ ...current, streamPath: event.target.value }))} placeholder="public/traffic-01" />
                        </Field>
                        <Field label="ละติจูด">
                          <input type="number" step="any" className={inputClass} value={publicData.latitude ?? ""} onChange={(event) => setPublicData((current) => ({ ...current, latitude: event.target.value ? Number(event.target.value) : null }))} />
                        </Field>
                        <Field label="ลองจิจูด">
                          <input type="number" step="any" className={inputClass} value={publicData.longitude ?? ""} onChange={(event) => setPublicData((current) => ({ ...current, longitude: event.target.value ? Number(event.target.value) : null }))} />
                        </Field>
                        <Field label="ลำดับการแสดง">
                          <input type="number" min="0" max="9999" className={inputClass} value={publicData.sortOrder} onChange={(event) => setPublicData((current) => ({ ...current, sortOrder: Number(event.target.value) }))} />
                        </Field>
                        <label className="mt-7 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                          <input type="checkbox" checked={publicData.published} onChange={(event) => setPublicData((current) => ({ ...current, published: event.target.checked }))} className="h-4 w-4 accent-emerald-600" />
                          <span>
                            <span className="block text-xs font-bold text-emerald-900">เผยแพร่ให้ประชาชน</span>
                            <span className="mt-0.5 block text-[9px] text-emerald-700">เปิดเมื่อผ่านการตรวจมุมกล้องและความเป็นส่วนตัวแล้ว</span>
                          </span>
                        </label>
                      </div>
                      <Field label="คำอธิบาย">
                        <textarea rows={4} maxLength={500} className={`${inputClass} resize-none`} value={publicData.description} onChange={(event) => setPublicData((current) => ({ ...current, description: event.target.value }))} placeholder="อธิบายวัตถุประสงค์ของกล้องโดยไม่เปิดเผยข้อมูลภายใน" />
                      </Field>
                    </section>
                  </div>
                ) : (
                  <div className="mt-6 space-y-6">
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-xs font-bold">ข้อมูลส่วนนี้สำหรับ Admin เท่านั้น</p>
                        <p className="mt-1 text-[10px] leading-relaxed text-amber-800">ระบบไม่รับ username หรือ password ของกล้อง ให้เก็บ credential ที่ Media Gateway/Secret Manager และบันทึกเพียงชื่ออ้างอิง</p>
                      </div>
                    </div>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <HardDrive className="h-4 w-4 text-blue-600" />
                        ฮาร์ดแวร์และทรัพย์สิน
                      </h4>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Field label="รหัสจุดติดตั้ง"><input className={inputClass} value={privateData.siteCode} onChange={(event) => setPrivateData((current) => ({ ...current, siteCode: event.target.value }))} /></Field>
                        <Field label="ประเภทกล้อง"><select className={inputClass} value={privateData.cameraType} onChange={(event) => setPrivateData((current) => ({ ...current, cameraType: event.target.value as CameraPrivateData["cameraType"] }))}><option value="fixed">Fixed</option><option value="ptz">PTZ</option><option value="lpr">LPR อ่านป้ายทะเบียน</option><option value="thermal">Thermal</option><option value="other">อื่น ๆ</option></select></Field>
                        <Field label="ยี่ห้อ"><input className={inputClass} value={privateData.brand} onChange={(event) => setPrivateData((current) => ({ ...current, brand: event.target.value }))} /></Field>
                        <Field label="รุ่น"><input className={inputClass} value={privateData.model} onChange={(event) => setPrivateData((current) => ({ ...current, model: event.target.value }))} /></Field>
                        <Field label="Serial number"><input className={inputClass} value={privateData.serialNumber} onChange={(event) => setPrivateData((current) => ({ ...current, serialNumber: event.target.value }))} /></Field>
                        <Field label="เลขครุภัณฑ์"><input className={inputClass} value={privateData.assetNumber} onChange={(event) => setPrivateData((current) => ({ ...current, assetNumber: event.target.value }))} /></Field>
                        <Field label="ความละเอียด"><input className={inputClass} value={privateData.resolution} onChange={(event) => setPrivateData((current) => ({ ...current, resolution: event.target.value }))} placeholder="เช่น 1920x1080" /></Field>
                        <Field label="วันที่ติดตั้ง"><input type="date" className={inputClass} value={privateData.installationDate} onChange={(event) => setPrivateData((current) => ({ ...current, installationDate: event.target.value }))} /></Field>
                        <Field label="หน่วยงานรับผิดชอบ"><input className={inputClass} value={privateData.responsibleUnit} onChange={(event) => setPrivateData((current) => ({ ...current, responsibleUnit: event.target.value }))} /></Field>
                        <div className="sm:col-span-2 lg:col-span-3"><Field label="ทิศทาง/มุมกล้อง"><input className={inputClass} value={privateData.direction} onChange={(event) => setPrivateData((current) => ({ ...current, direction: event.target.value }))} placeholder="เช่น หันไปทางทิศเหนือ ครอบคลุมทางแยก" /></Field></div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <Network className="h-4 w-4 text-blue-600" />
                        เครือข่ายและระบบสตรีม
                      </h4>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Field label="IP หรือ hostname"><input className={inputClass} value={privateData.ipAddress} onChange={(event) => setPrivateData((current) => ({ ...current, ipAddress: event.target.value }))} placeholder="192.168.x.x" /></Field>
                        <Field label="RTSP port"><input type="number" min="1" max="65535" className={inputClass} value={privateData.rtspPort ?? ""} onChange={(event) => setPrivateData((current) => ({ ...current, rtspPort: event.target.value ? Number(event.target.value) : null }))} /></Field>
                        <Field label="NVR channel"><input className={inputClass} value={privateData.nvrChannel} onChange={(event) => setPrivateData((current) => ({ ...current, nvrChannel: event.target.value }))} /></Field>
                        <div className="sm:col-span-2"><Field label="RTSP path" hint="ใส่เฉพาะ path เช่น /Streaming/Channels/102"><input className={inputClass} value={privateData.rtspPath} onChange={(event) => setPrivateData((current) => ({ ...current, rtspPath: event.target.value }))} /></Field></div>
                        <Field label="Credential reference" hint="ชื่ออ้างอิงเท่านั้น ไม่ใช่รหัสผ่าน"><input className={inputClass} value={privateData.credentialReference} onChange={(event) => setPrivateData((current) => ({ ...current, credentialReference: event.target.value }))} placeholder="mediamtx:traffic-01" /></Field>
                        <div className="sm:col-span-2 lg:col-span-3"><Field label="ลิงก์หน้าจัดการกล้อง" hint="ข้อมูลนี้ไม่แสดงต่อประชาชน"><input type="url" className={inputClass} value={privateData.managementUrl} onChange={(event) => setPrivateData((current) => ({ ...current, managementUrl: event.target.value }))} placeholder="http://192.168.x.x" /></Field></div>
                      </div>
                      <Field label="หมายเหตุทางเทคนิค"><textarea rows={5} maxLength={2000} className={`${inputClass} resize-none`} value={privateData.technicalNotes} onChange={(event) => setPrivateData((current) => ({ ...current, technicalNotes: event.target.value }))} /></Field>
                    </section>
                  </div>
                )}

                <div className="sticky bottom-0 mt-7 flex flex-col gap-3 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {selectedId && (
                      <button type="button" onClick={() => void handleArchive()} disabled={saving} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-3 text-xs font-bold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50">
                        <Archive className="h-4 w-4" />
                        เก็บเข้าคลัง
                      </button>
                    )}
                  </div>
                  <button type="button" onClick={() => void handleSave()} disabled={saving} className="flex min-w-44 items-center justify-center gap-2 rounded-xl bg-blue-950 px-5 py-3.5 text-xs font-bold text-white shadow-lg transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลกล้อง"}
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  };
