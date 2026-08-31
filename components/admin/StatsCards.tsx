import React, {
  useMemo,
} from "react";
import {
  Activity,
  BarChart3,
  CheckCircle,
  Clock,
  Hourglass,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from "lucide-react";

import type {
  CCTVRequest,
} from "../../types";

interface StatsCardsProps {
  requests: CCTVRequest[];

  visitorStats: {
    today: number;
    total: number;
  };

  onRefresh: () => void;
}

interface MainStatCardProps {
  label: string;
  value: number;
  description: string;
  icon: React.ElementType;
  iconClassName: string;
}

const MainStatCard:
  React.FC<MainStatCardProps> = ({
    label,
    value,
    description,
    icon: Icon,
    iconClassName,
  }) => (
    <div className="group rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg sm:p-5">
      <div className="mb-3 flex items-start justify-between sm:mb-5">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${iconClassName}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-300">
          Live
        </span>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
        {value.toLocaleString(
          "th-TH",
        )}
      </p>

      <p className="mt-2 hidden text-[10px] leading-relaxed text-slate-400 sm:block">
        {description}
      </p>
    </div>
  );

export const StatsCards:
  React.FC<StatsCardsProps> = ({
    requests,
    visitorStats,
    onRefresh,
  }) => {
    const statistics =
      useMemo(() => {
        let pending = 0;
        let inProgress = 0;
        let waitingForInformation = 0;
        let completed = 0;
        let rejected = 0;

        for (
          const request of requests
        ) {
          switch (
            request.status
          ) {
            case "pending":
              pending += 1;
              break;

            case "processing":
            case "verifying":
            case "searching":
              inProgress += 1;
              break;

            case "waiting_for_information":
              waitingForInformation +=
                1;
              break;

            case "completed":
              completed += 1;
              break;

            case "rejected":
              rejected += 1;
              break;
          }
        }

        const total =
          requests.length;

        const open =
          pending +
          inProgress +
          waitingForInformation;

        const completionRate =
          total > 0
            ? Math.round(
                (completed / total) *
                  100,
              )
            : 0;

        return {
          total,
          pending,
          inProgress,
          waitingForInformation,
          completed,
          rejected,
          open,
          completionRate,
        };
      }, [requests]);

    return (
      <section
        aria-labelledby="admin-statistics-title"
        className="mb-6 sm:mb-8"
      >
        <div className="mb-4 flex items-center justify-between px-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />

                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>

              <h2
                id="admin-statistics-title"
                className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500"
              >
                ภาพรวมคิวงานแบบเรียลไทม์
              </h2>
            </div>

            <p className="mt-1 pl-[18px] text-[10px] text-slate-400">
              รวมข้อมูลเดิมและ Secure
              V2 โดยไม่นับคำร้อง draft
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            title="อัปเดตข้อมูลรายงาน"
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-500 shadow-sm transition hover:border-blue-300 hover:text-blue-700 active:scale-95"
          >
            <span className="hidden sm:inline">
              อัปเดตข้อมูล
            </span>

            <RefreshCw className="h-3.5 w-3.5 transition duration-500 group-hover:rotate-180" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
          <MainStatCard
            label="คำร้องทั้งหมด"
            value={statistics.total}
            description="คำร้องที่ส่งเข้าสู่ระบบแล้ว"
            icon={BarChart3}
            iconClassName="bg-blue-50 text-blue-700"
          />

          <MainStatCard
            label="รอตรวจสอบ"
            value={statistics.pending}
            description="คำร้องใหม่ที่ยังไม่ได้รับงาน"
            icon={Clock}
            iconClassName="bg-orange-50 text-orange-700"
          />

          <MainStatCard
            label="กำลังดำเนินการ"
            value={
              statistics.inProgress
            }
            description="ตรวจเอกสารหรือกำลังค้นหาภาพ"
            icon={Search}
            iconClassName="bg-indigo-50 text-indigo-700"
          />

          <MainStatCard
            label="รอข้อมูลเพิ่มเติม"
            value={
              statistics.waitingForInformation
            }
            description="รอประชาชนส่งข้อมูลเพิ่มเติม"
            icon={Hourglass}
            iconClassName="bg-amber-50 text-amber-700"
          />

          <div className="col-span-2 lg:col-span-1">
            <MainStatCard
              label="เสร็จสิ้น"
              value={
                statistics.completed
              }
              description="คำร้องที่ดำเนินการสำเร็จ"
              icon={CheckCircle}
              iconClassName="bg-emerald-50 text-emerald-700"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/70 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
              <XCircle className="h-4 w-4" />
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-red-500">
                ปฏิเสธ
              </p>

              <p className="text-lg font-bold text-red-800">
                {statistics.rejected.toLocaleString(
                  "th-TH",
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
              <Activity className="h-4 w-4" />
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-blue-500">
                งานคงค้าง
              </p>

              <p className="text-lg font-bold text-blue-900">
                {statistics.open.toLocaleString(
                  "th-TH",
                )}
              </p>
            </div>

            <div className="ml-auto text-right">
              <p className="text-[9px] text-blue-400">
                อัตราสำเร็จ
              </p>

              <p className="text-sm font-bold text-blue-800">
                {
                  statistics.completionRate
                }
                %
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl p-4 text-white shadow-lg shadow-emerald-100" style={{ background: "var(--brand-gradient)" }}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Users className="h-4 w-4" />
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-100">
                ผู้เข้าชมวันนี้
              </p>

              <p className="text-lg font-bold">
                {visitorStats.today.toLocaleString(
                  "th-TH",
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-200">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-blue-300">
              <Activity className="h-4 w-4" />
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                ผู้เข้าชมสะสม
              </p>

              <p className="text-lg font-bold">
                {visitorStats.total.toLocaleString(
                  "th-TH",
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  };
