import React, {
  useState,
} from "react";

import {
  Car,
  Eye,
  FileQuestion,
  FileText,
  FilterX,
  Hammer,
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

interface RequestTableProps {
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
interface AttachmentPreviewProps {
  url: string | null;
  eventType: string;
}

const AttachmentPreview:
  React.FC<
    AttachmentPreviewProps
  > = ({
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
            decodeURIComponent(url),
          ),
      );

    if (
      !url ||
      previewFailed ||
      isPdf
    ) {
      return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
          {isPdf ? (
            <FileText className="h-4 w-4 text-red-500" />
          ) : url ? (
            <FileQuestion className="h-4 w-4 text-amber-500" />
          ) : (
        <EventTypeIcon
  eventType={eventType}
  className="h-4 w-4 text-slate-300"
/>
          )}
        </div>
      );
    }

    return (
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Evidence URLs can come from multiple legacy storage providers. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getMiniThumbnailLink(
            url,
          )}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          width={44}
          height={44}
          onError={() =>
            setPreviewFailed(true)
          }
        />
      </div>
    );
  };

interface AttachmentIndicatorsProps {
  request: CCTVRequest;
}

const AttachmentIndicators:
  React.FC<
    AttachmentIndicatorsProps
  > = ({
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
      <div
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm"
        aria-label={`เอกสาร: บัตร ${
          hasIdCard ? "มี" : "ไม่มี"
        }, ใบแจ้งความ ${
          hasReport ? "มี" : "ไม่มี"
        }, ภาพเหตุการณ์ ${sceneCount} ภาพ`}
      >
        <span
          title="บัตรประชาชนหรือหนังสือเดินทาง"
          className={`h-2.5 w-2.5 rounded-full ${
            hasIdCard
              ? "bg-blue-500 shadow-[0_0_7px_rgba(59,130,246,0.45)]"
              : "border border-slate-300 bg-white"
          }`}
        />

        <span
          title="ใบแจ้งความ"
          className={`h-2.5 w-2.5 rounded-full ${
            hasReport
              ? "bg-amber-500 shadow-[0_0_7px_rgba(245,158,11,0.45)]"
              : "border border-slate-300 bg-white"
          }`}
        />

        <span
          title={`ภาพเหตุการณ์ ${sceneCount} ภาพ`}
          className={`h-2.5 w-2.5 rounded-full ${
            sceneCount > 0
              ? "bg-emerald-500 shadow-[0_0_7px_rgba(16,185,129,0.45)]"
              : "border border-slate-300 bg-white"
          }`}
        />

        {sceneCount > 0 && (
          <span className="ml-0.5 text-[9px] font-bold text-slate-500">
            {sceneCount}
          </span>
        )}
      </div>
    );
  };

export const RequestTable:
  React.FC<RequestTableProps> = ({
    requests,
    onSelect,
    getStatusConfig,
  }) => (
    <div className="mb-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90">
              <th className="w-28 px-5 py-5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                วันที่ยื่น
              </th>

              <th className="px-5 py-5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                ผู้ยื่นคำร้อง
              </th>

              <th className="px-5 py-5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                เหตุการณ์
              </th>

              <th className="px-5 py-5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                รับไฟล์
              </th>

              <th className="px-5 py-5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                เอกสาร
              </th>

              <th className="px-5 py-5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                สถานะ
              </th>

              <th className="w-20 px-5 py-5 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                จัดการ
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
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
                  <tr
                    key={request.id}
                    tabIndex={0}
                    onClick={() =>
                      onSelect(request)
                    }
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                          "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        onSelect(
                          request,
                        );
                      }
                    }}
                    className={`group cursor-pointer outline-none transition hover:bg-blue-50/40 focus-visible:bg-blue-50/60 ${
                      status.rowClass ??
                      ""
                    }`}
                  >
                    <td className="px-5 py-6 text-center">
                      <span className="text-xs font-bold text-slate-500">
                        {formatSubmitDate(
                          request.createdAt,
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-6">
                      <div className="flex items-center gap-3">
                        <AttachmentPreview
                          url={previewUrl}
                          eventType={
                            request.eventType
                          }
                        />

                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <p className="font-mono text-[11px] font-bold text-blue-900">
                              {
                                request.trackingId
                              }
                            </p>

                            <span
                              className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase ${
                                request.dataSource ===
                                "secure-v2"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-500"
                              }`}
                            >
                              {request.dataSource ===
                              "secure-v2"
                                ? "V2"
                                : "Legacy"}
                            </span>
                          </div>

                          <p className="max-w-[220px] truncate text-sm font-bold text-slate-900">
                            {request.name}
                          </p>

                          {request.phone && (
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {
                                request.phone
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="relative overflow-hidden px-5 py-6">
<EventTypeIcon
  eventType={
    request.eventType ||
    "OTHER"
  }
  className="pointer-events-none absolute -right-2 -top-2 h-20 w-20 -rotate-12 text-slate-900 opacity-[0.025]"
/>
                      <div className="relative z-10">
                        <p className="mb-1 text-xs font-bold text-slate-700">
                          {EVENT_TYPE_TH[
                            request.eventType
                          ] ??
                            EVENT_TYPE_TH.OTHER}
                        </p>

                        <p className="text-[10px] text-slate-500">
                          {formatEventDate(
                            request.eventDate,
                          )}
                        </p>

                        <p className="mt-1 max-w-[220px] truncate text-[10px] text-slate-400">
                          {request.location}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-6 text-center">
                      {request.deliveryMethod ===
                      "LINE" ? (
                        <span className="inline-flex rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">
                          LINE OA
                        </span>
                      ) : (
                        <span className="inline-flex rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-700">
                          รับที่ศูนย์
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-6 text-center">
                      <AttachmentIndicators
                        request={request}
                      />
                    </td>

                    <td className="px-5 py-6">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold ${status.color}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </td>

                    <td className="px-5 py-6 text-right">
                      <button
                        type="button"
                        onClick={(
                          event,
                        ) => {
                          event.stopPropagation();
                          onSelect(
                            request,
                          );
                        }}
                        aria-label={`เปิดรายละเอียด ${request.trackingId}`}
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>

      {requests.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-sm font-bold text-slate-400">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
            <FilterX className="h-7 w-7 opacity-40" />
          </div>

          ไม่พบข้อมูลคำร้องที่ตรงกับเงื่อนไข
        </div>
      )}
    </div>
  );
