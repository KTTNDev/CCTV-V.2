"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  Clock,
  Cctv,
  FileClock,
  LayoutDashboard,
  Loader2,
  LogOut,
  Search as SearchIcon,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import type { CCTVRequest } from "../../types";
import {
  normalizeAdminRequests,
  requestTimestampToMillis,
} from "../../lib/admin-request";
import { db } from "../../lib/firebase";


import {
  AuditLogModal,
} from "../admin/AuditLogModal";
import {
  CameraManagementModal,
} from "../admin/CameraManagementModal";
import { DetailModal } from "../admin/DetailModal";
import { FilterBar } from "../admin/FilterBar";
import { MobileCardList } from "../admin/MobileCardList";
import { Pagination } from "../admin/Pagination";
import { ReportModal } from "../admin/ReportModal";
import { RequestTable } from "../admin/RequestTable";
import { StatsCards } from "../admin/StatsCards";
import {
  matchesWorkQueue,
  WorkQueueBar,
} from "../admin/WorkQueueBar";
import type {
  WorkQueueFilter,
} from "../admin/WorkQueueBar";
import {
  EVENT_TYPE_TH,
  STATUS_TH,
} from "../admin/utils/formatters";
import ThemeToggle from "../ui/ThemeToggle";

interface AdminViewProps {
  onLogout: () => void;
  initialRequestId?: string | null;
  onInitialRequestHandled?: () => void;
}

interface VisitorHistoryItem {
  date: string;
  views: number;
  requests: number;
}

const AdminView: React.FC<AdminViewProps> = ({
  onLogout,
  initialRequestId = null,
  onInitialRequestHandled,
}) => {
  const [requests, setRequests] = useState<
    CCTVRequest[]
  >([]);

  const [
    selectedRequest,
    setSelectedRequest,
  ] = useState<CCTVRequest | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const handledInitialRequestId =
    useRef<string | null>(null);

  const [
    visitorStats,
    setVisitorStats,
  ] = useState({
    today: 0,
    total: 0,
  });

  const [
    visitorHistory,
    setVisitorHistory,
  ] = useState<VisitorHistoryItem[]>([]);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [filterStatus, setFilterStatus] =
    useState("all");

  const [
    workQueueFilter,
    setWorkQueueFilter,
  ] = useState<WorkQueueFilter>(
    "all",
  );

  const [queueClock, setQueueClock] =
    useState(0);

  useEffect(() => {
    const updateClock = () => {
      setQueueClock(Date.now());
    };

    updateClock();

    const timer = window.setInterval(
      updateClock,
      60_000,
    );

    return () =>
      window.clearInterval(timer);
  }, []);

  const [
    filterEventType,
    setFilterEventType,
  ] = useState("all");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [itemsPerPage, setItemsPerPage] =
    useState(10);

  const [showReport, setShowReport] =
    useState(false);
const [
  showAuditLog,
  setShowAuditLog,
] = useState(false);
  const [
    showCameraManagement,
    setShowCameraManagement,
  ] = useState(false);
  useEffect(() => {
    let isActive = true;
    let normalizationVersion = 0;

    const requestCollection =
      collection(db, "cctv_requests");

    const unsubscribeRequests =
      onSnapshot(
        requestCollection,
        async (snapshot) => {
          const currentVersion =
            normalizationVersion + 1;

          normalizationVersion =
            currentVersion;

          try {
            const normalizedRequests =
              await normalizeAdminRequests(
                snapshot.docs,
              );

            if (
              !isActive ||
              currentVersion !==
                normalizationVersion
            ) {
              return;
            }

            // draft คือรายการที่ยังอัปโหลด
            // และส่งคำร้องไม่สำเร็จ จึงไม่แสดง
            const submittedRequests =
              normalizedRequests.filter(
                (request) =>
                  request.status !==
                  "draft",
              );

            setRequests(
              submittedRequests,
            );

            setLoadError("");
          } catch (error) {
            console.warn(
              "Admin request normalization failed:",
              error,
            );

            if (isActive) {
              setLoadError(
                "ไม่สามารถจัดรูปแบบข้อมูลคำร้องได้",
              );
            }
          } finally {
            if (
              isActive &&
              currentVersion ===
                normalizationVersion
            ) {
              setLoading(false);
            }
          }
        },
        (error) => {
          console.warn(
            "Firestore requests listener failed:",
            error,
          );

          if (isActive) {
            setLoadError(
              "ไม่สามารถโหลดคำร้องได้ กรุณาตรวจสอบบัญชี Admin และ Firestore Rules",
            );

            setLoading(false);
          }
        },
      );

    const todayId =
      new Date().toLocaleDateString(
        "en-CA",
      );

    const unsubscribeToday =
      onSnapshot(
        doc(
          db,
          "site_analytics",
          todayId,
        ),
        (snapshot) => {
          if (!snapshot.exists()) {
            return;
          }

          const visits =
            snapshot.data().visits;

          setVisitorStats(
            (current) => ({
              ...current,
              today:
                typeof visits ===
                "number"
                  ? visits
                  : 0,
            }),
          );
        },
        (error) => {
          console.warn(
            "Today analytics listener failed:",
            error,
          );
        },
      );

    const unsubscribeTotal =
      onSnapshot(
        doc(
          db,
          "site_analytics",
          "global_stats",
        ),
        (snapshot) => {
          if (!snapshot.exists()) {
            return;
          }

          const totalVisits =
            snapshot.data().totalVisits;

          setVisitorStats(
            (current) => ({
              ...current,
              total:
                typeof totalVisits ===
                "number"
                  ? totalVisits
                  : 0,
            }),
          );
        },
        (error) => {
          console.warn(
            "Total analytics listener failed:",
            error,
          );
        },
      );

    return () => {
      isActive = false;

      unsubscribeRequests();
      unsubscribeToday();
      unsubscribeTotal();
    };
  }, []);

  useEffect(() => {
    if (!selectedRequest) {
      return;
    }

    const updatedRequest =
      requests.find(
        (request) =>
          request.id ===
          selectedRequest.id,
      );

    if (
      updatedRequest &&
      updatedRequest !== selectedRequest
    ) {
      setSelectedRequest(
        updatedRequest,
      );
    }
  }, [requests, selectedRequest]);

  useEffect(() => {
    if (
      loading ||
      !initialRequestId ||
      handledInitialRequestId.current ===
        initialRequestId
    ) {
      return;
    }

    handledInitialRequestId.current =
      initialRequestId;

    const linkedRequest = requests.find(
      (request) =>
        request.id === initialRequestId,
    );

    if (linkedRequest) {
      setSelectedRequest(linkedRequest);
    } else {
      setLoadError(
        "ไม่พบคำร้องจากลิงก์ LINE อาจถูกลบหรือบัญชีนี้ไม่มีสิทธิ์เข้าถึง",
      );
    }

    onInitialRequestHandled?.();
  }, [
    initialRequestId,
    loading,
    onInitialRequestHandled,
    requests,
  ]);

  const fetchAnalyticsHistory =
    useCallback(async () => {
      try {
        const analyticsCollection =
          collection(
            db,
            "site_analytics",
          );

        const analyticsQuery = query(
          analyticsCollection,
          where(
            "date",
            "!=",
            "global_stats",
          ),
          orderBy("date", "desc"),
        );

        const snapshot =
          await getDocs(
            analyticsQuery,
          );

        const history =
          snapshot.docs
            .map(
              (
                analyticsDocument,
              ): VisitorHistoryItem => {
                const data =
                  analyticsDocument.data();

                const dateId =
                  typeof data.date ===
                  "string"
                    ? data.date
                    : analyticsDocument.id;

                const dailyRequests =
                  requests.filter(
                    (request) => {
                      const milliseconds =
                        requestTimestampToMillis(
                          request.createdAt,
                        );

                      if (
                        milliseconds <= 0
                      ) {
                        return false;
                      }

                      const requestDate =
                        new Date(
                          milliseconds,
                        ).toLocaleDateString(
                          "en-CA",
                        );

                      return (
                        requestDate ===
                        dateId
                      );
                    },
                  ).length;

                return {
                  date: dateId
                    .split("-")
                    .slice(1)
                    .reverse()
                    .join("/"),

                  views:
                    typeof data.visits ===
                    "number"
                      ? data.visits
                      : 0,

                  requests:
                    dailyRequests,
                };
              },
            )
            .reverse();

        setVisitorHistory(
          history,
        );
      } catch (error) {
        console.warn(
          "Analytics history failed:",
          error,
        );

        setVisitorHistory([]);
      }
    }, [requests]);

  useEffect(() => {
    if (showReport) {
      void fetchAnalyticsHistory();
    }
  }, [
    showReport,
    fetchAnalyticsHistory,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    filterStatus,
    workQueueFilter,
    filterEventType,
    startDate,
    endDate,
    itemsPerPage,
  ]);

  const filteredRequests =
    useMemo(() => {
      const normalizedSearch =
        searchQuery
          .trim()
          .toLocaleLowerCase("th");

      return requests.filter(
        (request) => {
          const matchesStatus =
            matchesWorkQueue(
              request,
              workQueueFilter,
              queueClock,
            ) &&
            (filterStatus === "all" ||
              request.status ===
                filterStatus);

          const matchesEventType =
            filterEventType ===
              "all" ||
            request.eventType ===
              filterEventType;

          const matchesSearch =
            !normalizedSearch ||
            request.name
              .toLocaleLowerCase(
                "th",
              )
              .includes(
                normalizedSearch,
              ) ||
            request.trackingId
              .toLocaleLowerCase(
                "th",
              )
              .includes(
                normalizedSearch,
              ) ||
            request.phone.includes(
              normalizedSearch,
            );

          let matchesDate = true;

          if (
            startDate ||
            endDate
          ) {
            const createdAt =
              requestTimestampToMillis(
                request.createdAt,
              );

            if (createdAt <= 0) {
              matchesDate = false;
            } else {
              if (startDate) {
                const start =
                  new Date(
                    `${startDate}T00:00:00`,
                  ).getTime();

                if (
                  createdAt < start
                ) {
                  matchesDate =
                    false;
                }
              }

              if (endDate) {
                const end =
                  new Date(
                    `${endDate}T23:59:59.999`,
                  ).getTime();

                if (
                  createdAt > end
                ) {
                  matchesDate =
                    false;
                }
              }
            }
          }

          return (
            matchesStatus &&
            matchesEventType &&
            matchesSearch &&
            matchesDate
          );
        },
      );
    }, [
      requests,
      filterStatus,
      workQueueFilter,
      queueClock,
      searchQuery,
      filterEventType,
      startDate,
      endDate,
    ]);

  const reportData = useMemo(() => {
    const eventCounts:
      Record<string, number> = {};

    const statusCounts:
      Record<string, number> = {};

    for (
      const request of
      filteredRequests
    ) {
      const eventLabel =
        EVENT_TYPE_TH[
          request.eventType
        ] ??
        EVENT_TYPE_TH.OTHER;

      const statusLabel =
        STATUS_TH[
          request.status
        ] ??
        request.status;

      eventCounts[eventLabel] =
        (eventCounts[
          eventLabel
        ] ?? 0) + 1;

      statusCounts[statusLabel] =
        (statusCounts[
          statusLabel
        ] ?? 0) + 1;
    }

    return {
      chartData:
        Object.entries(
          eventCounts,
        ).map(
          ([name, value]) => ({
            name,
            value,
          }),
        ),

      pieData:
        Object.entries(
          statusCounts,
        ).map(
          ([name, value]) => ({
            name,
            value,
          }),
        ),
    };
  }, [filteredRequests]);

  const totalItems =
    filteredRequests.length;

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalItems / itemsPerPage,
    ),
  );

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages,
    );

  const startIndex =
    (safeCurrentPage - 1) *
    itemsPerPage;

  const paginatedRequests =
    filteredRequests.slice(
      startIndex,
      startIndex +
        itemsPerPage,
    );

  const getStatusConfig = (
    status: string,
  ) => {
    const configs = {
      pending: {
        color:
          "bg-orange-100 text-orange-700 border-orange-200",
        rowClass:
          "bg-orange-50/20 hover:bg-orange-50/60",
        cardClass:
          "bg-orange-50/30 border-orange-100",
        icon: Clock,
        label: "รอตรวจสอบ",
      },

      processing: {
        color:
          "bg-indigo-100 text-indigo-700 border-indigo-200",
        rowClass:
          "bg-indigo-50/20 hover:bg-indigo-50/60",
        cardClass:
          "bg-indigo-50/30 border-indigo-100",
        icon: SearchIcon,
        label: "กำลังดำเนินการ",
      },

      verifying: {
        color:
          "bg-blue-100 text-blue-700 border-blue-200",
        rowClass:
          "bg-blue-50/20 hover:bg-blue-50/60",
        cardClass:
          "bg-blue-50/30 border-blue-100",
        icon: ShieldCheck,
        label: "ตรวจเอกสาร",
      },

      searching: {
        color:
          "bg-indigo-100 text-indigo-700 border-indigo-200",
        rowClass:
          "bg-indigo-50/20 hover:bg-indigo-50/60",
        cardClass:
          "bg-indigo-50/30 border-indigo-100",
        icon: SearchIcon,
        label: "กำลังหาภาพ",
      },

      waiting_for_information: {
        color:
          "bg-amber-100 text-amber-800 border-amber-200",
        rowClass:
          "bg-amber-50/20 hover:bg-amber-50/60",
        cardClass:
          "bg-amber-50/30 border-amber-100",
        icon: AlertCircle,
        label: "รอข้อมูลเพิ่มเติม",
      },

      completed: {
        color:
          "bg-emerald-50 text-emerald-700 border-emerald-200",
        rowClass:
          "bg-emerald-50/20 hover:bg-emerald-50/60",
        cardClass:
          "bg-emerald-50/30 border-emerald-100",
        icon: CheckCircle,
        label: "เสร็จสิ้น",
      },

      rejected: {
        color:
          "bg-red-50 text-red-700 border-red-200",
        rowClass:
          "bg-red-50/20 hover:bg-red-50/60",
        cardClass:
          "bg-red-50/30 border-red-100",
        icon: XCircle,
        label: "ปฏิเสธ",
      },
    };

    return (
      configs[
        status as keyof typeof configs
      ] ?? configs.pending
    );
  };

  const messageTemplates = [
    {
      label:
        "🟢 พบภาพ (Line OA)",
      text:
        "เจ้าหน้าที่ได้ตรวจสอบกล้องวงจรปิดเรียบร้อยแล้ว 'พบภาพเหตุการณ์' ตามที่ท่านแจ้ง กรุณาติดต่อขอรับลิงก์ดาวน์โหลดไฟล์ภาพผ่านทาง Line OA :@745jasmc หรือ QR-Code ที่ปรากฏ โดยแจ้งเลขที่คำร้อง [ID] ให้เจ้าหน้าที่ทราบครับ/ค่ะ",
    },
    {
      label:
        "🟢 พบภาพ (รับเอง)",
      text:
        "ตรวจสอบพบภาพเหตุการณ์เรียบร้อยแล้วครับ/ค่ะ ท่านสามารถนำอุปกรณ์จัดเก็บข้อมูลมาติดต่อรับไฟล์ภาพได้ที่ ศูนย์ CCTV เทศบาลตำบลราไวย์ ในวันและเวลาทำการ โปรดเตรียมบัตรประชาชนตัวจริงมาแสดงด้วยครับ/ค่ะ",
    },
    {
      label:
        "🟡 ขอพิกัดเพิ่ม",
      text:
        "เจ้าหน้าที่ได้รับคำร้องของท่านแล้ว แต่เพื่อความแม่นยำในการระบุตำแหน่งกล้อง รบกวนท่านส่ง 'ภาพถ่ายสถานที่เกิดเหตุจริง' หรือจุดสังเกตเพิ่มเติมเข้ามาทาง Line OA พร้อมแจ้งเลขที่คำร้องด้วยครับ/ค่ะ",
    },
    {
      label:
        "🟡 ขอเวลาเพิ่ม",
      text:
        "เนื่องจากช่วงเวลาที่ท่านแจ้งค่อนข้างกว้าง รบกวนท่านระบุ 'ช่วงเวลาที่เกิดเหตุให้แคบลง' (บวกลบไม่เกิน 30 นาที) เพื่อความรวดเร็วในการค้นหาครับ/ค่ะ",
    },
    {
      label:
        "🔴 ไม่พบภาพ (นอกรัศมี)",
      text:
        "เจ้าหน้าที่ดำเนินการตรวจสอบกล้องบริเวณดังกล่าวอย่างละเอียดแล้ว 'ไม่พบภาพเหตุการณ์' เนื่องจากจุดที่เกิดเหตุอยู่นอกรัศมีการทำงานของกล้องวงจรปิดในบริเวณนั้น ต้องขออภัยมา ณ ที่นี้ด้วยครับ/ค่ะ",
    },
    {
      label:
        "🔴 ไม่พบภาพ (บันทึกทับ)",
      text:
        "จากการตรวจสอบ พบว่าเหตุการณ์ที่ท่านแจ้งเกิดขึ้นนานเกินกว่าระยะเวลาที่ระบบจัดเก็บข้อมูลไว้ ทำให้ข้อมูลเดิมถูกบันทึกทับไปแล้ว จึงไม่สามารถกู้คืนภาพได้ครับ/ค่ะ",
    },
    {
      label:
        "❌ ปฏิเสธ (ขาดใบแจ้งความ)",
      text:
        "ไม่สามารถดำเนินการให้ได้เนื่องจากจำเป็นต้องมี 'ใบแจ้งความจากสถานีตำรวจ' แนบมาด้วยเพื่อเป็นหลักฐานทางกฎหมาย รบกวนท่านแนบเอกสารเพิ่มและยื่นคำร้องใหม่อีกครั้งครับ/ค่ะ",
    },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12 font-sans text-slate-900 selection:bg-blue-100">
      <div className="mx-auto max-w-[1600px] p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="flex items-center gap-3 text-xl font-bold text-slate-900 md:text-2xl">
            <LayoutDashboard className="h-7 w-7 text-blue-900" />
            แผงควบคุม
            <span className="text-blue-600">
              CCTV RAWAI
            </span>
          </h1>

  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <ThemeToggle
              showLabel
              className="hidden sm:inline-flex"
            />
            <ThemeToggle className="sm:hidden" />
            <button
              type="button"
              onClick={() =>
                setShowCameraManagement(
                  true,
                )
              }
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <Cctv className="h-4 w-4" />
              จัดการกล้อง
            </button>
           <button
  type="button"
  onClick={() =>
    setShowAuditLog(true)
  }
  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
>
  <FileClock className="h-4 w-4" />

  <span>
    Audit Log
  </span>
</button>
            <button
              onClick={() =>
                setShowReport(true)
              }
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:brightness-110"
              style={{ background: "var(--brand-gradient)" }}
            >
              <BarChart3 className="h-4 w-4" />
              ดูรายงานสถิติ
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-500 shadow-sm transition-all hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </button>
          </div>
        </div>

        {loadError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            {loadError}
          </div>
        )}

        <StatsCards
          requests={requests}
          visitorStats={visitorStats}
          onRefresh={() => {
            void fetchAnalyticsHistory();
          }}
        />

        <WorkQueueBar
          requests={requests}
          selected={workQueueFilter}
          now={queueClock}
          onSelect={(filter) => {
            setWorkQueueFilter(filter);
            setFilterStatus("all");
          }}
        />

        <FilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterStatus={filterStatus}
          setFilterStatus={(status) => {
            setFilterStatus(status);
            setWorkQueueFilter("all");
          }}
          filterEventType={
            filterEventType
          }
          setFilterEventType={
            setFilterEventType
          }
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          isFiltering={Boolean(
            searchQuery ||
              workQueueFilter !==
                "all" ||
              filterStatus !==
                "all" ||
              filterEventType !==
                "all" ||
              startDate ||
              endDate,
          )}
          clearFilters={() => {
            setSearchQuery("");
            setWorkQueueFilter(
              "all",
            );
            setFilterStatus("all");
            setFilterEventType(
              "all",
            );
            setStartDate("");
            setEndDate("");
          }}
        />

        <MobileCardList
          requests={
            paginatedRequests
          }
          onSelect={
            setSelectedRequest
          }
          getStatusConfig={
            getStatusConfig
          }
        />

        <RequestTable
          requests={
            paginatedRequests
          }
          onSelect={
            setSelectedRequest
          }
          getStatusConfig={
            getStatusConfig
          }
        />

        <Pagination
          currentPage={
            safeCurrentPage
          }
          totalPages={totalPages}
          totalItems={totalItems}
          startIndex={startIndex}
          itemsPerPage={
            itemsPerPage
          }
          setCurrentPage={
            setCurrentPage
          }
          setItemsPerPage={
            setItemsPerPage
          }
        />

        <DetailModal
          isOpen={Boolean(
            selectedRequest,
          )}
          data={selectedRequest}
          onClose={() =>
            setSelectedRequest(null)
          }
          getStatusConfig={
            getStatusConfig
          }
          messageTemplates={
            messageTemplates
          }
        />

        <ReportModal
          isOpen={showReport}
          onClose={() =>
            setShowReport(false)
          }
          filteredRequests={
            filteredRequests
          }
          reportData={reportData}
          startDate={startDate}
          endDate={endDate}
          visitorHistory={
            visitorHistory
          }
          visitorStats={
            visitorStats
          }
        />
        <AuditLogModal
  isOpen={showAuditLog}
  onClose={() =>
    setShowAuditLog(false)
  }
/>
        <CameraManagementModal
          isOpen={
            showCameraManagement
          }
          onClose={() =>
            setShowCameraManagement(
              false,
            )
          }
        />
      </div>
    </div>
  );
};

export default AdminView;
