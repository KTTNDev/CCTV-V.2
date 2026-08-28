import React from "react";
import {
  Activity,
  Calendar,
  ChevronDown,
  Filter,
  FilterX,
  Search,
  X,
} from "lucide-react";

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery:
    (value: string) => void;

  filterStatus: string;
  setFilterStatus:
    (value: string) => void;

  filterEventType: string;
  setFilterEventType:
    (value: string) => void;

  startDate: string;
  setStartDate:
    (value: string) => void;

  endDate: string;
  setEndDate:
    (value: string) => void;

  isFiltering: boolean;
  clearFilters: () => void;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange:
    (value: string) => void;
  icon: React.ElementType;
  children: React.ReactNode;
}

const SelectField:
  React.FC<SelectFieldProps> = ({
    id,
    label,
    value,
    onChange,
    icon: Icon,
    children,
  }) => (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-slate-400"
      >
        {label}
      </label>

      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <select
          id={id}
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-10 text-sm font-semibold text-slate-700 outline-none transition hover:bg-slate-100 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
        >
          {children}
        </select>

        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );

export const FilterBar:
  React.FC<FilterBarProps> = ({
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterEventType,
    setFilterEventType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    isFiltering,
    clearFilters,
  }) => {
    const activeFilterCount = [
      searchQuery.trim() !== "",
      filterStatus !== "all",
      filterEventType !== "all",
      startDate !== "",
      endDate !== "",
    ].filter(Boolean).length;

    return (
      <section
        aria-labelledby="request-filter-title"
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:mb-8 md:p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-700" />

              <h2
                id="request-filter-title"
                className="text-xs font-bold text-slate-800"
              >
                ค้นหาและกรองคำร้อง
              </h2>

              {activeFilterCount >
                0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1.5 text-[9px] font-bold text-white">
                  {
                    activeFilterCount
                  }
                </span>
              )}
            </div>

            <p className="mt-1 text-[10px] text-slate-400">
              ค้นหาจากชื่อ เบอร์โทร
              หรือหมายเลขติดตาม
            </p>
          </div>

          {isFiltering && (
            <button
              type="button"
              onClick={clearFilters}
              className="hidden items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-600 transition hover:bg-red-100 sm:flex"
            >
              <FilterX className="h-3.5 w-3.5" />
              ล้างตัวกรอง
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-5">
            <label
              htmlFor="admin-search"
              className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-slate-400"
            >
              คำค้นหา
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="admin-search"
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value,
                  )
                }
                placeholder="ชื่อ, เบอร์โทร หรือ Tracking ID"
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:bg-slate-100 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery("")
                  }
                  aria-label="ล้างคำค้นหา"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-3">
            <SelectField
              id="admin-status-filter"
              label="สถานะคำร้อง"
              value={filterStatus}
              onChange={
                setFilterStatus
              }
              icon={Filter}
            >
              <option value="all">
                สถานะทั้งหมด
              </option>

              <option value="pending">
                ⏳ รอตรวจสอบ
              </option>

              <option value="processing">
                ⚙️ กำลังดำเนินการ
                (ระบบเดิม)
              </option>

              <option value="verifying">
                📄 ตรวจเอกสาร
              </option>

              <option value="searching">
                🔍 กำลังค้นหาภาพ
              </option>

              <option value="waiting_for_information">
                📨 รอข้อมูลเพิ่มเติม
              </option>

              <option value="completed">
                ✅ เสร็จสิ้น
              </option>

              <option value="rejected">
                ❌ ปฏิเสธ
              </option>
            </SelectField>
          </div>

          <div className="md:col-span-4">
            <SelectField
              id="admin-event-filter"
              label="ประเภทเหตุการณ์"
              value={filterEventType}
              onChange={
                setFilterEventType
              }
              icon={Activity}
            >
              <option value="all">
                ประเภทเหตุการณ์ทั้งหมด
              </option>

              <option value="ACCIDENT">
                🚗 อุบัติเหตุจราจร
              </option>

              <option value="THEFT">
                🔓 โจรกรรม /
                ลักทรัพย์
              </option>

              <option value="VANDALISM">
                🔨 ทำลายทรัพย์สิน
              </option>

              <option value="DISPUTE">
                ⚖️ ข้อพิพาท /
                ทะเลาะวิวาท
              </option>

              <option value="OTHER">
                📋 อื่น ๆ
              </option>
            </SelectField>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />

            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              ช่วงวันที่ยื่นคำร้อง
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,220px)_auto_minmax(0,220px)_1fr] sm:items-end">
            <div>
              <label
                htmlFor="admin-start-date"
                className="mb-1.5 block text-[10px] font-semibold text-slate-500"
              >
                ตั้งแต่วันที่
              </label>

              <input
                id="admin-start-date"
                type="date"
                value={startDate}
                max={
                  endDate ||
                  undefined
                }
                onChange={(event) =>
                  setStartDate(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <span className="hidden pb-3 text-center text-xs font-bold text-slate-300 sm:block">
              ถึง
            </span>

            <div>
              <label
                htmlFor="admin-end-date"
                className="mb-1.5 block text-[10px] font-semibold text-slate-500"
              >
                ถึงวันที่
              </label>

              <input
                id="admin-end-date"
                type="date"
                value={endDate}
                min={
                  startDate ||
                  undefined
                }
                onChange={(event) =>
                  setEndDate(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>

            {isFiltering && (
              <div className="flex justify-end sm:hidden">
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600"
                >
                  <FilterX className="h-4 w-4" />
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  };