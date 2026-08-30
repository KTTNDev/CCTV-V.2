import {
  AlertTriangle,
  Inbox,
  MessageCircleMore,
  Radar,
  Sparkles,
} from "lucide-react";

import type {
  CCTVRequest,
} from "../../types";
import {
  requestTimestampToMillis,
} from "../../lib/admin-request";

export type WorkQueueFilter =
  | "all"
  | "new"
  | "active"
  | "waiting"
  | "overdue";

const OPEN_STATUSES = new Set([
  "pending",
  "processing",
  "verifying",
  "searching",
  "waiting_for_information",
]);

const ACTIVE_STATUSES = new Set([
  "processing",
  "verifying",
  "searching",
]);

const DAY_IN_MILLISECONDS =
  24 * 60 * 60 * 1000;

export function matchesWorkQueue(
  request: CCTVRequest,
  filter: WorkQueueFilter,
  now: number,
): boolean {
  switch (filter) {
    case "new":
      return request.status === "pending";

    case "active":
      return ACTIVE_STATUSES.has(
        request.status,
      );

    case "waiting":
      return (
        request.status ===
        "waiting_for_information"
      );

    case "overdue": {
      if (
        !OPEN_STATUSES.has(
          request.status,
        )
      ) {
        return false;
      }

      const createdAt =
        requestTimestampToMillis(
          request.createdAt,
        );

      return (
        createdAt > 0 &&
        now - createdAt >=
          DAY_IN_MILLISECONDS
      );
    }

    default:
      return true;
  }
}

interface WorkQueueBarProps {
  requests: CCTVRequest[];
  selected: WorkQueueFilter;
  now: number;
  onSelect: (
    filter: WorkQueueFilter,
  ) => void;
}

export const WorkQueueBar = ({
  requests,
  selected,
  now,
  onSelect,
}: WorkQueueBarProps) => {
  const queueItems = [
    {
      value: "all" as const,
      label: "ทั้งหมด",
      description: "ทุกคำร้อง",
      count: requests.length,
      icon: Inbox,
      accent:
        "border-blue-200 bg-blue-50 text-blue-800",
    },
    {
      value: "new" as const,
      label: "คำร้องใหม่",
      description: "ยังไม่ได้รับงาน",
      count: requests.filter(
        (request) =>
          matchesWorkQueue(
            request,
            "new",
            now,
          ),
      ).length,
      icon: Sparkles,
      accent:
        "border-orange-200 bg-orange-50 text-orange-800",
    },
    {
      value: "active" as const,
      label: "กำลังดำเนินการ",
      description: "ตรวจเอกสารและค้นหาภาพ",
      count: requests.filter(
        (request) =>
          matchesWorkQueue(
            request,
            "active",
            now,
          ),
      ).length,
      icon: Radar,
      accent:
        "border-indigo-200 bg-indigo-50 text-indigo-800",
    },
    {
      value: "waiting" as const,
      label: "รอข้อมูล",
      description: "รอประชาชนตอบกลับ",
      count: requests.filter(
        (request) =>
          matchesWorkQueue(
            request,
            "waiting",
            now,
          ),
      ).length,
      icon: MessageCircleMore,
      accent:
        "border-amber-200 bg-amber-50 text-amber-900",
    },
    {
      value: "overdue" as const,
      label: "เปิดเกิน 24 ชม.",
      description: "ควรตรวจสอบก่อน",
      count: requests.filter(
        (request) =>
          matchesWorkQueue(
            request,
            "overdue",
            now,
          ),
      ).length,
      icon: AlertTriangle,
      accent:
        "border-red-200 bg-red-50 text-red-800",
    },
  ];

  return (
    <section
      aria-labelledby="admin-work-queue-title"
      className="mb-6"
    >
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <h2
            id="admin-work-queue-title"
            className="text-sm font-bold text-slate-900"
          >
            คิวงานเจ้าหน้าที่
          </h2>
          <p className="mt-1 text-[10px] text-slate-400">
            เลือกกลุ่มงานเพื่อเริ่มดำเนินการได้ทันที
          </p>
        </div>

        {selected !== "all" && (
          <button
            type="button"
            onClick={() => onSelect("all")}
            className="text-[10px] font-bold text-blue-700 underline-offset-4 hover:underline"
          >
            แสดงทั้งหมด
          </button>
        )}
      </div>

      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        {queueItems.map((item) => {
          const Icon = item.icon;
          const isSelected =
            selected === item.value;

          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() =>
                onSelect(item.value)
              }
              className={`group min-w-[172px] snap-start rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 sm:min-w-0 ${
                isSelected
                  ? `${item.accent} ring-2 ring-current ring-offset-2`
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isSelected
                      ? "bg-white/70"
                      : item.accent
                  }`}
                >
                  <Icon
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </span>
                <span className="text-2xl font-black tracking-tight">
                  {item.count.toLocaleString(
                    "th-TH",
                  )}
                </span>
              </div>
              <p className="mt-4 text-xs font-bold">
                {item.label}
              </p>
              <p className={`mt-1 text-[9px] ${
                isSelected
                  ? "opacity-70"
                  : "text-slate-400"
              }`}
              >
                {item.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};
