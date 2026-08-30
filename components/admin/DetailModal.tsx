import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  MapPin,
  MapPinned,
  MessageSquare,
  Save,
  User,
  X,
} from "lucide-react";


import type {
  CCTVRequest,
} from "../../types";
import {
  ApiClientError,
  type AdminRequestStatus,
  updateAdminRequest,
} from "../../lib/api-client";
import {
  useModalAccessibility,
} from "../../hooks/useModalAccessibility";
import {
  AdminStatusActions,
} from "./AdminStatusActions";
import {
  ACCIDENT_SUBTYPE_TH,
  EVENT_TYPE_TH,
  STATUS_TH,
  formatDateTime,
  formatEventDate,
  formatNationalId,
  formatPhoneNumber,
  getDirectDriveLink,
} from "./utils/formatters";

interface DetailMapInstance {
  setView(
    coordinates: [number, number],
    zoom: number,
  ): DetailMapInstance;

  invalidateSize(): void;
  remove(): void;
}

interface DetailMapLayer {
  addTo(
    map: DetailMapInstance,
  ): DetailMapLayer;
}

interface DetailMapMarker {
  addTo(
    map: DetailMapInstance,
  ): DetailMapMarker;

  bindPopup(
    content: string,
  ): DetailMapMarker;

  openPopup():
    DetailMapMarker;
}

interface DetailLeafletNamespace {
  map(
    element: HTMLElement,
  ): DetailMapInstance;

  tileLayer(
    url: string,
    options: {
      attribution: string;
    },
  ): DetailMapLayer;

  marker(
    coordinates: [number, number],
  ): DetailMapMarker;
}

type DetailLeafletWindow =
  Window & {
    L?: DetailLeafletNamespace;
  };

function getDetailLeaflet():
  DetailLeafletNamespace | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  return (
    (
      window as
        DetailLeafletWindow
    ).L ?? null
  );
}

function escapeMapPopup(
  value: string,
): string {
  return value.replace(
    /[&<>"']/g,
    (character) => {
      const entities:
        Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        };

      return (
        entities[character] ??
        character
      );
    },
  );
}

const ADMIN_STATUSES = [
  "pending",
  "verifying",
  "searching",
  "waiting_for_information",
  "completed",
  "rejected",
] as const satisfies readonly AdminRequestStatus[];

interface StatusConfig {
  color: string;
  icon: React.ElementType;
  label: string;
}

interface MessageTemplate {
  label: string;
  text: string;
}

interface DetailModalProps {
  isOpen: boolean;
  data: CCTVRequest | null;
  onClose: () => void;
  getStatusConfig:
    (status: string) => StatusConfig;
  messageTemplates:
    MessageTemplate[];
}

interface AttachmentThumbnailProps {
  label: string;
  url: string;
}

const AttachmentThumbnail:
  React.FC<
    AttachmentThumbnailProps
  > = ({
    label,
    url,
  }) => {
    const [
      previewFailed,
      setPreviewFailed,
    ] = useState(false);

    return (
      <div className="group relative h-36 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:h-44">
        {!previewFailed ? (
          // Evidence URLs can come from legacy Google Drive or Firebase records.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getDirectDriveLink(
              url,
            )}
            alt={label}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            onError={() =>
              setPreviewFailed(true)
            }
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-blue-50 text-slate-400">
            <FileText className="h-9 w-9" />

            <span className="px-3 text-center text-[10px] font-semibold">
              ไม่สามารถแสดงตัวอย่างได้
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 border-t border-white/50 bg-white/95 px-3 py-2 text-center text-[10px] font-bold text-slate-700 backdrop-blur">
          {label}
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`เปิด ${label}`}
          className="absolute inset-0 flex items-center justify-center bg-slate-950/55 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <span className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-900 shadow-xl">
            <ExternalLink className="h-4 w-4" />
            เปิดไฟล์
          </span>
        </a>
      </div>
    );
  };

interface InfoItemProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

const InfoItem:
  React.FC<InfoItemProps> = ({
    label,
    value,
    mono = false,
  }) => (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div
        className={
          mono
            ? "font-mono text-sm font-semibold text-slate-800"
            : "text-sm font-semibold text-slate-800"
        }
      >
        {value || "-"}
      </div>
    </div>
  );

export const DetailModal:
  React.FC<DetailModalProps> = ({
    isOpen,
    data,
    onClose,
    getStatusConfig,
    messageTemplates,
  }) => {
const [
  tempStatus,
  setTempStatus,
] = useState<
  AdminRequestStatus | ""
>("");
    const [
      adminNote,
      setAdminNote,
    ] = useState("");

    const [
      isUpdating,
      setIsUpdating,
    ] = useState(false);

    const dialogRef =
      useModalAccessibility({
        isOpen,
        onClose,
        closeDisabled: isUpdating,
      });

    const [
      successMessage,
      setSuccessMessage,
    ] = useState("");

    const [
      errorMessage,
      setErrorMessage,
    ] = useState("");

    const requestId =
      data?.id ?? null;
    const requestStatus =
      data?.status ?? "";
    const requestAdminNote =
      data?.adminNote ?? "";

    const mapContainerRef =
      useRef<HTMLDivElement>(null);

    const adminNoteRef =
      useRef<HTMLTextAreaElement>(null);

    const activeRequestIdRef =
      useRef<string | null>(null);

   const mapInstanceRef =
  useRef<DetailMapInstance | null>(
    null,
  );

    useEffect(() => {
      if (!requestId) {
        activeRequestIdRef.current =
          null;
        setTempStatus("");
        setAdminNote("");
        return;
      }

      const isNewRequest =
        activeRequestIdRef.current !==
        requestId;

      activeRequestIdRef.current =
        requestId;

const reusableStatus =
  ADMIN_STATUSES.find(
    (status) =>
      status === requestStatus,
  );

setTempStatus(
  reusableStatus ?? "",
);

      setAdminNote(
        requestAdminNote,
      );

      if (isNewRequest) {
        setSuccessMessage("");
        setErrorMessage("");
      }
    }, [
      requestId,
      requestStatus,
      requestAdminNote,
    ]);

    useEffect(() => {
    if (
  !isOpen ||
  !data ||
  data.latitude === null ||
  data.longitude === null
) {
  return;
}

const latitude =
  data.latitude;

const longitude =
  data.longitude;

const location =
  data.location ||
  "จุดเกิดเหตุ";

let cancelled = false;

      const initializeMap = () => {
        if (
          cancelled ||
          !mapContainerRef.current
        ) {
          return;
        }

    const leaflet =
  getDetailLeaflet();

        if (!leaflet) {
          return;
        }

        if (
          mapInstanceRef.current
        ) {
          mapInstanceRef.current.remove();
        }

        const map = leaflet
          .map(
            mapContainerRef.current,
          )
          .setView(
           [
  latitude,
  longitude,
],
            16,
          );

        leaflet
          .tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              attribution:
                "&copy; OpenStreetMap contributors",
            },
          )
          .addTo(map);

       leaflet
  .marker([
    latitude,
    longitude,
  ])
  .addTo(map)
  .bindPopup(
    escapeMapPopup(
      location,
    ),
  )
  .openPopup();

        mapInstanceRef.current =
          map;

        window.setTimeout(() => {
          map.invalidateSize();
        }, 100);
      };

      if (
        !document.getElementById(
          "leaflet-css",
        )
      ) {
        const stylesheet =
          document.createElement(
            "link",
          );

        stylesheet.id =
          "leaflet-css";
        stylesheet.rel =
          "stylesheet";
        stylesheet.href =
          "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

        document.head.appendChild(
          stylesheet,
        );
      }

      const existingLeaflet =
  getDetailLeaflet();

      let script:
        | HTMLScriptElement
        | null = null;

      if (existingLeaflet) {
        initializeMap();
      } else {
        script =
          document.querySelector(
            'script[src*="leaflet"]',
          );

        if (!script) {
          script =
            document.createElement(
              "script",
            );

          script.id =
            "leaflet-script";
          script.src =
            "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.async = true;

          document.body.appendChild(
            script,
          );
        }

        script.addEventListener(
          "load",
          initializeMap,
          {
            once: true,
          },
        );
      }

      return () => {
        cancelled = true;

        script?.removeEventListener(
          "load",
          initializeMap,
        );

        if (
          mapInstanceRef.current
        ) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current =
            null;
        }
      };
   }, [
  isOpen,
  data,
]);
    if (!isOpen || !data) {
      return null;
    }

    const currentStatus =
      getStatusConfig(data.status);

    const CurrentStatusIcon =
      currentStatus.icon;

    const storedStatus =
      ADMIN_STATUSES.find(
        (status) =>
          status === data.status,
      ) ?? "";

    const requiresReason =
      tempStatus ===
        "waiting_for_information" ||
      tempStatus === "rejected";

    const hasUnsavedChanges =
      tempStatus !== storedStatus ||
      adminNote.trim() !==
        (data.adminNote ?? "").trim();

    const handleStatusSelect = (
      status: AdminRequestStatus,
    ) => {
      setTempStatus(status);
      setErrorMessage("");
      setSuccessMessage("");

      if (
        status ===
          "waiting_for_information" ||
        status === "rejected"
      ) {
        window.requestAnimationFrame(
          () => {
            adminNoteRef.current?.focus();
          },
        );
      }
    };

    const identityLabel =
      data.applicantType ===
      "FOREIGNER"
        ? "หมายเลขหนังสือเดินทาง"
        : "เลขประจำตัวประชาชน";

    const identityValue =
      data.applicantType ===
      "FOREIGNER"
        ? data.passportNumber || "-"
        : formatNationalId(
            data.nationalId,
          );

    const attachmentItems = [
      {
        label: "บัตรประชาชน/หนังสือเดินทาง",
        url: data.attachments.idCard,
      },
      {
        label: "ใบแจ้งความ",
        url: data.attachments.report,
      },
      ...data.attachments.scene.map(
        (url, index) => ({
          label:
            `ภาพเหตุการณ์ ${index + 1}`,
          url,
        }),
      ),
    ];

    const handleCopy = async (
      text: string,
    ) => {
      if (!text) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          text,
        );

        setSuccessMessage(
          "คัดลอกข้อมูลเรียบร้อยแล้ว",
        );

        window.setTimeout(() => {
          setSuccessMessage("");
        }, 2500);
      } catch {
        setErrorMessage(
          "ไม่สามารถคัดลอกข้อมูลได้",
        );
      }
    };

 const handleSaveChanges =
  async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!tempStatus) {
      setErrorMessage(
        "กรุณาเลือกสถานะใหม่ก่อนบันทึก",
      );

      return;
    }

    const normalizedNote =
      adminNote.trim();

    if (
      normalizedNote.length >
      2000
    ) {
      setErrorMessage(
        "หมายเหตุต้องไม่เกิน 2,000 ตัวอักษร",
      );

      return;
    }

    if (
      (
        tempStatus ===
          "waiting_for_information" ||
        tempStatus ===
          "rejected"
      ) &&
      normalizedNote.length < 5
    ) {
      setErrorMessage(
        "สถานะนี้ต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร",
      );

      return;
    }

    setIsUpdating(true);

    try {
      await updateAdminRequest({
        requestId: data.id,
        status: tempStatus,
        adminNote:
          normalizedNote,
      });

      setSuccessMessage(
        "บันทึกการอัปเดตและ Audit Log เรียบร้อยแล้ว",
      );
    } catch (error) {
      console.warn(
        "Admin request update failed:",
        error,
      );

      if (
        error instanceof
        ApiClientError
      ) {
        const reference =
          error.requestId
            ? ` (Ref: ${error.requestId})`
            : "";

        setErrorMessage(
          `${error.message}${reference}`,
        );
      } else {
        setErrorMessage(
          "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        );
      }
    } finally {
      setIsUpdating(false);
    }
  };

    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-md md:p-8"
      >
        <div
          aria-hidden="true"
          onClick={() => {
            if (!isUpdating) {
              onClose();
            }
          }}
          className="absolute inset-0 cursor-default"
        />

        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-detail-title"
          tabIndex={-1}
          className="relative z-10 flex max-h-[calc(100dvh-1rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl outline-none md:max-h-[calc(100dvh-4rem)]"
        >
          <header className="z-20 flex shrink-0 items-start justify-between border-b border-slate-100 bg-white px-5 py-5 md:px-8">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 font-mono text-[10px] font-bold text-blue-800">
                  {data.trackingId}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold ${currentStatus.color}`}
                >
                  <CurrentStatusIcon className="h-3 w-3" />
                  {currentStatus.label}
                </span>

                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[9px] font-bold uppercase text-slate-500">
                  {data.dataSource ===
                  "secure-v2"
                    ? "Secure V2"
                    : "Legacy"}
                </span>
              </div>

              <h2
                id="request-detail-title"
                className="text-xl font-bold text-slate-950 md:text-2xl"
              >
                รายละเอียดคำร้อง
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                ยื่นเมื่อ{" "}
                {formatDateTime(
                  data.createdAt,
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isUpdating}
              aria-label="ปิด"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
            <div className="grid grid-cols-1 items-start gap-8 p-5 md:p-8 xl:grid-cols-[minmax(0,1fr)_360px]">
              <main className="order-2 space-y-8 xl:order-none">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 md:p-6">
                    <h3 className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                      <User className="h-4 w-4" />
                      ข้อมูลผู้ยื่น
                    </h3>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <InfoItem
                        label="ชื่อ-นามสกุล"
                        value={data.name}
                      />

                      <InfoItem
                        label="ประเภทผู้ยื่น"
                        value={
                          data.applicantType ===
                          "FOREIGNER"
                            ? "ชาวต่างชาติ"
                            : "บุคคลสัญชาติไทย"
                        }
                      />

                      <InfoItem
                        label={identityLabel}
                        value={identityValue}
                        mono
                      />

                      <InfoItem
                        label="อีเมล"
                        value={
                          data.email || "-"
                        }
                      />

                      <InfoItem
                        label="เบอร์ติดต่อ"
                        value={
                          <span className="inline-flex items-center gap-2">
                            {formatPhoneNumber(
                              data.phone,
                            )}

                            {data.phone && (
                              <button
                                type="button"
                                aria-label="คัดลอกเบอร์โทรศัพท์"
                                onClick={() => {
                                  void handleCopy(
                                    data.phone,
                                  );
                                }}
                                className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-blue-700"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </span>
                        }
                      />

                      <InfoItem
                        label="ช่องทางรับไฟล์"
                        value={
                          data.deliveryMethod ===
                          "LINE"
                            ? "LINE OA"
                            : "รับด้วยตนเองที่ศูนย์"
                        }
                      />
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 md:p-6">
                    <h3 className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                      <Activity className="h-4 w-4" />
                      ข้อมูลเหตุการณ์
                    </h3>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <InfoItem
                        label="วันที่เกิดเหตุ"
                        value={formatEventDate(
                          data.eventDate,
                        )}
                      />

                      <InfoItem
                        label="ช่วงเวลา"
                        value={
                          data.eventTimeStart ||
                          data.eventTimeEnd
                            ? `${
                                data.eventTimeStart ||
                                "-"
                              } - ${
                                data.eventTimeEnd ||
                                "-"
                              }`
                            : "-"
                        }
                      />

                      <InfoItem
                        label="ประเภทเหตุ"
                        value={
                          EVENT_TYPE_TH[
                            data.eventType
                          ] ??
                          data.eventType
                        }
                      />

                      {data.accidentSubtype && (
                        <InfoItem
                          label="ลักษณะอุบัติเหตุ"
                          value={
                            ACCIDENT_SUBTYPE_TH[
                              data
                                .accidentSubtype
                            ] ??
                            data
                              .accidentSubtype
                          }
                        />
                      )}
                    </div>

                    <div className="mt-5 border-t border-slate-200 pt-5">
                      <InfoItem
                        label="รายละเอียดเพิ่มเติม"
                        value={
                          data.description ||
                          "ไม่ได้ระบุรายละเอียดเพิ่มเติม"
                        }
                      />
                    </div>
                  </section>
                </div>

                <section>
                  <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <MapPin className="h-4 w-4 text-red-500" />
                    พิกัดสถานที่เกิดเหตุ
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <p className="font-semibold text-slate-900">
                        {data.location}
                      </p>

                      <div className="mt-4 border-t border-slate-100 pt-4 font-mono text-[10px] text-slate-500">
                        <p>
                          LAT:{" "}
                          {data.latitude ??
                            "-"}
                        </p>
                        <p>
                          LNG:{" "}
                          {data.longitude ??
                            "-"}
                        </p>
                      </div>

                      {data.latitude !==
                        null &&
                        data.longitude !==
                          null && (
                          <a
                            href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800 transition hover:bg-blue-700 hover:text-white"
                          >
                            <MapPinned className="h-4 w-4" />
                            เปิด Google Maps
                          </a>
                        )}
                    </div>

                    <div className="h-64 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      {data.latitude !==
                        null &&
                      data.longitude !==
                        null ? (
                        <div
                          ref={
                            mapContainerRef
                          }
                          className="h-full w-full"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                          <MapPin className="h-8 w-8" />
                          <span className="text-xs font-semibold">
                            ไม่มีข้อมูลพิกัด
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <ImageIcon className="h-4 w-4" />
                    เอกสารและหลักฐาน
                  </h3>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {attachmentItems.map(
                      (
                        attachment,
                        index,
                      ) =>
                        attachment.url ? (
                          <AttachmentThumbnail
                            key={`${attachment.label}-${index}`}
                            label={
                              attachment.label
                            }
                            url={
                              attachment.url
                            }
                          />
                        ) : (
                          <div
                            key={`${attachment.label}-${index}`}
                            className="flex h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 text-center text-slate-400 md:h-44"
                          >
                            <ImageIcon className="h-7 w-7" />
                            <span className="text-[10px] font-semibold">
                              ไม่มี{" "}
                              {
                                attachment.label
                              }
                            </span>
                          </div>
                        ),
                    )}
                  </div>
                </section>
              </main>

              <aside className="contents xl:sticky xl:top-0 xl:block xl:max-h-[calc(100dvh-12rem)] xl:self-start xl:space-y-6 xl:overflow-y-auto xl:overscroll-contain xl:pr-1 xl:[scrollbar-gutter:stable] xl:[scrollbar-width:thin]">
                <section className="order-1 rounded-3xl bg-slate-950 p-5 text-white shadow-xl 2xl:p-6">
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">
                        ดำเนินการคำร้อง
                      </h3>
                      <p className="mt-1 text-[9px] text-slate-500">
                        เลือกสถานะ เติมหมายเหตุ แล้วบันทึก
                      </p>
                    </div>
                    {hasUnsavedChanges && (
                      <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[8px] font-bold text-amber-200">
                        ยังไม่บันทึก
                      </span>
                    )}
                  </div>

                  {data.status ===
                    "processing" && (
                    <div className="mb-5 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-[11px] leading-relaxed text-amber-200">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      รายการนี้ใช้สถานะจากระบบเดิม กรุณาเลือกสถานะใหม่ก่อนบันทึก
                    </div>
                  )}

                  <AdminStatusActions
                    currentStatus={data.status}
                    selectedStatus={tempStatus}
                    disabled={isUpdating}
                    onSelect={handleStatusSelect}
                  />

                  <div className="mt-5 space-y-3">
                    <label
                      htmlFor="admin-status"
                      className="block text-[10px] font-bold uppercase tracking-wide text-slate-400"
                    >
                      สถานะคำร้อง
                    </label>

                    <div className="relative">
                      <select
                        id="admin-status"
                        value={tempStatus}
                       onChange={(event) => {
  const selectedStatus =
    event.target.value;

  const validStatus =
    ADMIN_STATUSES.find(
      (status) =>
        status ===
        selectedStatus,
    );

  if (validStatus) {
    handleStatusSelect(
      validStatus,
    );
  } else {
    setTempStatus("");
  }
}}  
                        disabled={isUpdating}
                        className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-xs font-semibold text-white outline-none focus:border-blue-400"
                      >
                        <option
                          value=""
                          className="bg-slate-900"
                        >
                          -- เลือกสถานะ --
                        </option>

                        {ADMIN_STATUSES.map(
                          (status) => (
                            <option
                              key={status}
                              value={status}
                              className="bg-slate-900"
                            >
                              {STATUS_TH[
                                status
                              ]}
                            </option>
                          ),
                        )}
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <label
                      htmlFor="message-template"
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      ข้อความรวดเร็ว
                    </label>

                    <select
                      id="message-template"
                      defaultValue=""
                      disabled={isUpdating}
                      onChange={(event) => {
                        const value =
                          event.target.value;

                        if (value) {
                          setAdminNote(
                            value.replace(
                              "[ID]",
                              data.trackingId,
                            ),
                          );
                        }

                        event.target.value =
                          "";
                      }}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-300 outline-none"
                    >
                      <option
                        value=""
                        className="bg-slate-900"
                      >
                        -- เลือกข้อความ --
                      </option>

                      {messageTemplates.map(
                        (
                          template,
                          index,
                        ) => (
                          <option
                            key={`${template.label}-${index}`}
                            value={
                              template.text
                            }
                            className="bg-slate-900 text-white"
                          >
                            {template.label}
                          </option>
                        ),
                      )}
                    </select>

                    <textarea
                      ref={adminNoteRef}
                      id="admin-note"
                      rows={6}
                      maxLength={2000}
                      value={adminNote}
                      disabled={isUpdating}
                      onChange={(event) =>
                        setAdminNote(
                          event.target.value,
                        )
                      }
                      placeholder="หมายเหตุสำหรับประชาชน..."
                      aria-describedby={requiresReason ? "admin-note-requirement admin-note-count" : "admin-note-count"}
                      className="min-h-32 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-white outline-none placeholder:text-slate-600 focus:border-blue-400"
                    />

                    <div className="flex items-start justify-between gap-3">
                      <p
                        id="admin-note-requirement"
                        className={`text-[9px] leading-relaxed ${
                          requiresReason
                            ? "text-amber-200"
                            : "text-slate-500"
                        }`}
                      >
                        {requiresReason
                          ? "สถานะนี้ต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร"
                          : "หมายเหตุจะแสดงในประวัติการดำเนินงาน"}
                      </p>
                      <p id="admin-note-count" className="shrink-0 text-right text-[9px] text-slate-500">
                        {adminNote.length}/2,000
                      </p>
                    </div>
                  </div>

                  {errorMessage && (
                    <div
                      role="alert"
                      className="mt-4 flex gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-[11px] text-red-200"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {errorMessage}
                    </div>
                  )}

                  {successMessage && (
                    <div
                      role="status"
                      className="mt-4 flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-[11px] text-emerald-200"
                    >
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      {successMessage}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      void handleSaveChanges();
                    }}
                    disabled={
                      isUpdating ||
                      !tempStatus ||
                      !hasUnsavedChanges
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-4 text-xs font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}

                    {isUpdating
                      ? "กำลังบันทึก..."
                      : hasUnsavedChanges
                        ? "บันทึกการอัปเดต"
                        : "ข้อมูลเป็นปัจจุบันแล้ว"}
                  </button>
                </section>

                <section className="order-3 rounded-3xl border border-slate-200 bg-white p-6">
                  <h3 className="mb-6 text-xs font-bold uppercase tracking-wide text-slate-500">
                    ประวัติการดำเนินการ
                  </h3>

                  {data.statusHistory
                    .length > 0 ? (
                    <div className="space-y-6">
                      {data.statusHistory.map(
                        (
                          history,
                          index,
                        ) => (
                          <div
                            key={`${history.status}-${index}`}
                            className="relative pl-6"
                          >
                            {index <
                              data
                                .statusHistory
                                .length -
                                1 && (
                              <div className="absolute bottom-[-24px] left-[3px] top-4 w-px bg-slate-200" />
                            )}

                            <div className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-blue-600 ring-4 ring-blue-50" />

                            <p className="text-xs font-bold text-slate-900">
                              {STATUS_TH[
                                history.status
                              ] ??
                                history.status}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              {formatDateTime(
                                history.timestamp,
                              )}
                            </p>

                            <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                              {history.note}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                      ยังไม่มีประวัติการดำเนินการ
                    </div>
                  )}
                </section>
              </aside>
            </div>
          </div>
        </div>
      </div>
    );
  };
