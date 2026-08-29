import React, {
  useState,
} from "react";

import {
  Activity,
  Calendar,
  Car,
  ChevronRight,
  FileQuestion,
  FileText,
  Hammer,
  MapPin,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";

import type {
  CCTVRequest,
} from "../../types";

import {
  EVENT_TYPE_TH,
  formatEventDate,
  formatSubmitDate,
  getMiniThumbnailLink,
} from "./utils/formatters";

interface StatusConfig {
  color: string;
  rowClass?: string;
  cardClass?: string;
  icon: React.ElementType;
  label: string;
}

interface MobileCardListProps {
  requests: CCTVRequest[];
  onSelect:
    (request: CCTVRequest) => void;
  getStatusConfig:
    (status: string) => StatusConfig;
}
interface EventTypeIconProps {
  eventType: string;
  className?: string;
}

const EventTypeIcon:
  React.FC<EventTypeIconProps> = ({
    eventType,
    className,
  }) => {
    switch (eventType) {
      case "ACCIDENT":
        return (
          <Car
            className={className}
            aria-hidden="true"
          />
        );

      case "THEFT":
        return (
          <ShieldAlert
            className={className}
            aria-hidden="true"
          />
        );

      case "VANDALISM":
        return (
          <Hammer
            className={className}
            aria-hidden="true"
          />
        );

      case "DISPUTE":
        return (
          <Users
            className={className}
            aria-hidden="true"
          />
        );

      default:
        return (
          <FileQuestion
            className={className}
            aria-hidden="true"
          />
        );
    }
  };
interface MobilePreviewProps {
  url: string | null;
  eventType: string;
}

const MobilePreview:
  React.FC<MobilePreviewProps> = ({
    url,
    eventType,
  }) => {
    const [
      previewFailed,
      setPreviewFailed,
    ] = useState(false);



    const isPdf =
      Boolean(
        url &&
          /\.pdf(?:$|[?#])/i.test(
            url,
          ),
      );

    if (
      !url ||
      previewFailed ||
      isPdf
    ) {
      return (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isPdf ? (
            <FileText className="h-5 w-5 text-red-500" />
          ) : url ? (
            <FileQuestion className="h-5 w-5 text-amber-500" />
          ) : (
         <EventTypeIcon
  eventType={eventType}
  className="h-5 w-5 text-slate-300"
/>
         )}
        </div>
      );
    }

    return (
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Evidence URLs can come from multiple legacy storage providers. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getMiniThumbnailLink(
            url,
          )}
          alt=""
          loading="lazy"
          decoding="async"
          width={56}
          height={56}
          className="h-full w-full object-cover"
          onError={() =>
            setPreviewFailed(true)
          }
        />
      </div>
    );
  };

interface DocumentSummaryProps {
  request: CCTVRequest;
}

const DocumentSummary:
  React.FC<DocumentSummaryProps> = ({
    request,
  }) => {
    const hasIdCard =
      Boolean(
        request.attachments.idCard,
      );

    const hasReport =
      Boolean(
        request.attachments.report,
      );

    const sceneCount =
      request.attachments.scene.length;

    return (
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase text-slate-400">
          เอกสาร
        </span>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2.5 py-1.5">
          <span
            title="บัตรประชาชนหรือหนังสือเดินทาง"
            className={`h-2 w-2 rounded-full ${
              hasIdCard
                ? "bg-blue-500"
                : "border border-slate-300 bg-white"
            }`}
          />

          <span
            title="ใบแจ้งความ"
            className={`h-2 w-2 rounded-full ${
              hasReport
                ? "bg-amber-500"
                : "border border-slate-300 bg-white"
            }`}
          />

          <span
            title="ภาพเหตุการณ์"
            className={`h-2 w-2 rounded-full ${
              sceneCount > 0
                ? "bg-emerald-500"
                : "border border-slate-300 bg-white"
            }`}
          />

          {sceneCount > 0 && (
            <span className="text-[9px] font-bold text-slate-500">
              {sceneCount}
            </span>
          )}
        </div>
      </div>
    );
  };

export const MobileCardList:
  React.FC<MobileCardListProps> = ({
    requests,
    onSelect,
    getStatusConfig,
  }) => (
    <div className="mb-6 space-y-4 md:hidden">
      {requests.map(
        (request) => {
          const status =
            getStatusConfig(
              request.status,
            );

          const StatusIcon =
            status.icon;


          const previewUrl =
            request.attachments
              .scene[0] ??
            request.attachments
              .report ??
            request.attachments
              .idCard ??
            null;

          return (
            <button
              type="button"
              key={request.id}
              onClick={() =>
                onSelect(request)
              }
              className={`relative w-full overflow-hidden rounded-3xl border p-5 text-left shadow-sm outline-none transition active:scale-[0.985] focus-visible:ring-4 focus-visible:ring-blue-100 ${
                status.cardClass ??
                "border-slate-200 bg-white"
              }`}
            >
<EventTypeIcon
  eventType={
    request.eventType ||
    "OTHER"
  }
  className="pointer-events-none absolute -bottom-7 -right-7 h-36 w-36 -rotate-12 text-slate-900 opacity-[0.025]"
/>
              <div className="relative z-10">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <MobilePreview
                      url={previewUrl}
                      eventType={
                        request.eventType
                      }
                    />

                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-blue-900">
                          {
                            request.trackingId
                          }
                        </p>

                        <span
                          className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase ${
                            request.dataSource ===
                            "secure-v2"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white/80 text-slate-500"
                          }`}
                        >
                          {request.dataSource ===
                          "secure-v2"
                            ? "V2"
                            : "Legacy"}
                        </span>
                      </div>

                      <h3 className="truncate text-sm font-bold text-slate-950">
                        {request.name}
                      </h3>

                      <p className="mt-1 text-[9px] font-medium text-slate-400">
                        ยื่นเมื่อ{" "}
                        {formatSubmitDate(
                          request.createdAt,
                        )}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[9px] font-bold shadow-sm ${status.color}`}
                  >
                    <StatusIcon className="h-2.5 w-2.5" />
                    {status.label}
                  </span>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3 rounded-2xl border border-white/70 bg-white/55 p-4 backdrop-blur-sm">
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase text-slate-400">
                      <Activity className="h-3 w-3" />
                      ประเภทเหตุ
                    </p>

                    <p className="text-[11px] font-bold leading-relaxed text-slate-700">
                      {EVENT_TYPE_TH[
                        request.eventType
                      ] ??
                        EVENT_TYPE_TH.OTHER}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase text-slate-400">
                      <Calendar className="h-3 w-3" />
                      วันที่เกิดเหตุ
                    </p>

                    <p className="text-[11px] font-bold text-slate-700">
                      {formatEventDate(
                        request.eventDate,
                      )}
                    </p>
                  </div>

                  <div className="col-span-2 border-t border-slate-200/70 pt-3">
                    <p className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase text-slate-400">
                      <MapPin className="h-3 w-3" />
                      สถานที่
                    </p>

                    <p className="line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-600">
                      {request.location}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/70 pt-4">
                  <DocumentSummary
                    request={request}
                  />

                  <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2.5 py-1.5 text-[10px] font-bold text-blue-800 shadow-sm">
                    รายละเอียด
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </button>
          );
        },
      )}

      {requests.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center text-sm font-bold text-slate-400">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
            <Search className="h-7 w-7 opacity-40" />
          </div>

          <span>
            ไม่พบข้อมูลคำร้อง
          </span>

          <span className="text-xs font-medium text-slate-400">
            ลองเปลี่ยนคำค้นหาหรือตัวกรอง
          </span>
        </div>
      )}
    </div>
  );
