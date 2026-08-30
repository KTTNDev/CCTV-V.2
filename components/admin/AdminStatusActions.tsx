import {
  CheckCircle2,
  CircleX,
  FileSearch,
  MessageCircleQuestion,
  SearchCheck,
} from "lucide-react";

import type {
  AdminRequestStatus,
} from "../../lib/api-client";

const STATUS_ACTIONS: Array<{
  value: AdminRequestStatus;
  label: string;
  description: string;
  icon: typeof FileSearch;
  color: string;
}> = [
  {
    value: "verifying",
    label: "ตรวจเอกสาร",
    description: "ตรวจหลักฐานผู้ยื่น",
    icon: FileSearch,
    color:
      "border-blue-200 bg-blue-50 text-blue-800",
  },
  {
    value: "searching",
    label: "ค้นหาภาพ",
    description: "เริ่มตรวจสอบกล้อง",
    icon: SearchCheck,
    color:
      "border-indigo-200 bg-indigo-50 text-indigo-800",
  },
  {
    value: "waiting_for_information",
    label: "ขอข้อมูลเพิ่ม",
    description: "ต้องระบุเหตุผล",
    icon: MessageCircleQuestion,
    color:
      "border-amber-200 bg-amber-50 text-amber-900",
  },
  {
    value: "completed",
    label: "เสร็จสิ้น",
    description: "ปิดงานสำเร็จ",
    icon: CheckCircle2,
    color:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    value: "rejected",
    label: "ปฏิเสธคำร้อง",
    description: "ต้องระบุเหตุผล",
    icon: CircleX,
    color:
      "border-red-200 bg-red-50 text-red-800",
  },
];

interface AdminStatusActionsProps {
  currentStatus: string;
  selectedStatus:
    | AdminRequestStatus
    | "";
  disabled: boolean;
  onSelect: (
    status: AdminRequestStatus,
  ) => void;
}

export const AdminStatusActions = ({
  currentStatus,
  selectedStatus,
  disabled,
  onSelect,
}: AdminStatusActionsProps) => (
  <fieldset disabled={disabled}>
    <legend className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
      เลือกขั้นตอนถัดไป
    </legend>

    <div className="grid grid-cols-2 gap-2">
      {STATUS_ACTIONS.map(
        (action) => {
          const Icon = action.icon;
          const isSelected =
            selectedStatus ===
            action.value;
          const isCurrent =
            currentStatus ===
            action.value;

          return (
            <button
              key={action.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() =>
                onSelect(action.value)
              }
              className={`relative rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300/30 disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? `${action.color} ring-2 ring-current ring-offset-2 ring-offset-slate-950`
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <Icon
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                {isCurrent && (
                  <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide">
                    ปัจจุบัน
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px] font-bold">
                {action.label}
              </p>
              <p className={`mt-0.5 text-[8px] leading-relaxed ${
                isSelected
                  ? "opacity-70"
                  : "text-slate-500"
              }`}
              >
                {action.description}
              </p>
            </button>
          );
        },
      )}
    </div>
  </fieldset>
);
