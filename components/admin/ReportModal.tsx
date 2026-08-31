'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarRange,
  Car,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FilePenLine,
  FileSignature,
  FileBarChart,
  Landmark,
  ListFilter,
  Loader2,
  MapPinned,
  MapPinOff,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  XCircle,
} from 'lucide-react';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type {
  CCTVRequest,
} from '../../types';

import {
  buildExecutiveReportPdf,
  buildExecutiveReportModel,
  downloadExecutiveReportPdf,
  type ExecutiveReportCustomization,
  type OfficialMemoCover,
} from '../../lib/executive-report-pdf';

import {
  EVENT_TYPE_TH,
  STATUS_TH,
} from './utils/formatters';

import {
  useModalAccessibility,
} from '../../hooks/useModalAccessibility';

const ACCIDENT_SUBTYPE_TH:
  Record<string, string> = {
    MC_VS_MC: 'จยย. ชน จยย.',
    MC_VS_CAR:
      'จยย. ชน รถยนต์',
    CAR_VS_CAR:
      'รถยนต์ ชน รถยนต์',
    PEDESTRIAN:
      'ชนคนเดินเท้า',
    HIT_AND_RUN: 'ชนแล้วหนี',
    OTHER: 'อื่นๆ',
  };

interface ChartDataItem {
  name: string;
  value: number;
}

interface VisitorHistoryItem {
  date: string;
  views: number;
  requests: number;
}

interface ReportData {
  chartData: ChartDataItem[];
  pieData: ChartDataItem[];
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;

  filteredRequests:
    CCTVRequest[];

  reportData: ReportData;

  startDate: string;
  endDate: string;

  visitorHistory:
    VisitorHistoryItem[];

  visitorStats: {
    today: number;
    total: number;
  };
}

interface AnalyticsMapInstance {
  setView(
    coordinates: [number, number],
    zoom: number,
  ): AnalyticsMapInstance;

  remove(): void;
}

interface AnalyticsMapLayer {
  addTo(
    map: AnalyticsMapInstance,
  ): AnalyticsMapLayer;
}

interface AnalyticsCircleMarker {
  addTo(
    map: AnalyticsMapInstance,
  ): AnalyticsCircleMarker;

  bindPopup(
    html: string,
  ): AnalyticsCircleMarker;
}

interface AnalyticsLeafletNamespace {
  map(
    element: HTMLElement,
  ): AnalyticsMapInstance;

  tileLayer(
    url: string,
  ): AnalyticsMapLayer;

  circleMarker(
    coordinates: [number, number],
    options: {
      radius: number;
      fillColor: string;
      color: string;
      weight: number;
      opacity: number;
      fillOpacity: number;
    },
  ): AnalyticsCircleMarker;
}

type AnalyticsLeafletWindow =
  Window & {
    L?: AnalyticsLeafletNamespace;
  };

function getAnalyticsLeaflet():
  AnalyticsLeafletNamespace | null {
  if (
    typeof window === 'undefined'
  ) {
    return null;
  }

  return (
    (
      window as
        AnalyticsLeafletWindow
    ).L ?? null
  );
}

function escapeReportHtml(
  value: string,
): string {
  return value.replace(
    /[&<>"']/g,
    (character) => {
      const entities:
        Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        };

      return (
        entities[character] ??
        character
      );
    },
  );
}

function formatReportDate(
  value: string,
): string {
  if (!value) {
    return '';
  }

  const date = new Date(
    `${value}T12:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'th-TH',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  ).format(date);
}

function getReportStatusClass(
  status: string,
): string {
  if (status === 'completed') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (status === 'rejected') {
    return 'bg-red-100 text-red-700';
  }

  if (
    status ===
    'waiting_for_information'
  ) {
    return 'bg-amber-100 text-amber-800';
  }

  if (status === 'pending') {
    return 'bg-orange-100 text-orange-700';
  }

  return 'bg-blue-100 text-blue-700';
}

function getLocalDateInputValue(): string {
  const now = new Date();
  const timezoneOffset =
    now.getTimezoneOffset() * 60_000;

  return new Date(
    now.getTime() - timezoneOffset,
  )
    .toISOString()
    .slice(0, 10);
}

function splitEditorItems(
  value: string,
): string[] {
  return value
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitEditorParagraphs(
  value: string,
): string[] {
  return value
    .split(/\r?\n\s*\r?\n/u)
    .map((item) =>
      item.replace(/\s+/gu, ' ').trim(),
    )
    .filter(Boolean);
}

export const ReportModal = ({
  isOpen,
  onClose,
  filteredRequests,
  reportData,
  startDate,
  endDate,
  visitorHistory,
  visitorStats,
}: ReportModalProps) => {
  const [
    isExporting,
    setIsExporting,
  ] = useState(false);

  const [
    exportError,
    setExportError,
  ] = useState('');

  const [
    timeScale,
    setTimeScale,
  ] = useState<
    'day' | 'month' | 'year'
  >('day');

  const [memoCover, setMemoCover] =
    useState<OfficialMemoCover>(
      () => ({
        enabled: true,
        documentNumber: '',
        documentDate:
          getLocalDateInputValue(),
        subject:
          'รายงานสรุปผลการดำเนินงานคำร้องขอข้อมูลภาพกล้องวงจรปิด (CCTV)',
        recipient:
          'นายกเทศมนตรีตำบลราไวย์',
        signerName: '',
        signerPosition: '',
        signers: [
          {
            name: '',
            position: '',
          },
        ],
        useThaiDigits: true,
        urgency: '',
        confidentiality: '',
      }),
    );

  const [isPreviewOpen, setIsPreviewOpen] =
    useState(false);
  const [isPreviewLoading, setIsPreviewLoading] =
    useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] =
    useState('');
  const [previewInitialized, setPreviewInitialized] =
    useState(false);
  const [editableInsights, setEditableInsights] =
    useState('');
  const [editableRecommendations, setEditableRecommendations] =
    useState('');
  const [memoBodyText, setMemoBodyText] =
    useState('');
  const [memoClosingText, setMemoClosingText] =
    useState('จึงเรียนมาเพื่อโปรดทราบ');
  const [executiveFontScale, setExecutiveFontScale] =
    useState(1);
  const [executiveLineSpacing, setExecutiveLineSpacing] =
    useState(1);
  const [memoFontSize, setMemoFontSize] =
    useState(16);
  const [memoLineSpacing, setMemoLineSpacing] =
    useState(1);

  const updateMemoCover = <
    Key extends keyof OfficialMemoCover,
  >(
    key: Key,
    value: OfficialMemoCover[Key],
  ): void => {
    setMemoCover((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateMemoSigner = (
    index: number,
    key: 'name' | 'position',
    value: string,
  ): void => {
    setMemoCover((current) => {
      const signers = current.signers?.length
        ? current.signers.map(
            (signer) => ({ ...signer }),
          )
        : [
            {
              name: current.signerName,
              position:
                current.signerPosition,
            },
          ];

      signers[index] = {
        ...signers[index],
        [key]: value,
      };

      return {
        ...current,
        signers,
        signerName:
          signers[0]?.name ?? '',
        signerPosition:
          signers[0]?.position ?? '',
      };
    });
  };

  const addMemoSigner = (): void => {
    setMemoCover((current) => {
      const signers = current.signers?.length
        ? current.signers
        : [
            {
              name: current.signerName,
              position:
                current.signerPosition,
            },
          ];

      if (signers.length >= 4) {
        return current;
      }

      return {
        ...current,
        signers: [
          ...signers,
          { name: '', position: '' },
        ],
      };
    });
  };

  const removeMemoSigner = (
    index: number,
  ): void => {
    setMemoCover((current) => {
      const signers = current.signers?.length
        ? [...current.signers]
        : [
            {
              name: current.signerName,
              position:
                current.signerPosition,
            },
          ];

      if (signers.length === 1) {
        signers[0] = {
          name: '',
          position: '',
        };
      } else {
        signers.splice(index, 1);
      }

      return {
        ...current,
        signers,
        signerName:
          signers[0]?.name ?? '',
        signerPosition:
          signers[0]?.position ?? '',
      };
    });
  };

  const dialogRef =
    useModalAccessibility({
      isOpen,
      onClose,
      closeDisabled: isExporting,
    });

  const analyticsMapRef =
    useRef<HTMLDivElement>(null);

  const leafletAnalyticsInstance =
    useRef<AnalyticsMapInstance | null>(
      null,
    );

  const accidentSubtypeStats =
    useMemo(() => {
      const counts:
        Record<string, number> = {};

      for (
        const request
        of filteredRequests
      ) {
        if (
          request.eventType !==
            'ACCIDENT' ||
          !request.accidentSubtype
        ) {
          continue;
        }

        const label =
          ACCIDENT_SUBTYPE_TH[
            request.accidentSubtype
          ] ?? 'ไม่ระบุ';

        counts[label] =
          (counts[label] ?? 0) + 1;
      }

      return Object.entries(
        counts,
      ).map(
        ([name, value]) => ({
          name,
          value,
        }),
      );
    }, [filteredRequests]);

  const reportSummary =
    useMemo(() => {
      let completed = 0;
      let rejected = 0;
      let open = 0;

      for (const request of filteredRequests) {
        if (request.status === 'completed') {
          completed += 1;
        } else if (request.status === 'rejected') {
          rejected += 1;
        } else {
          open += 1;
        }
      }

      const total =
        filteredRequests.length;

      return {
        total,
        open,
        completed,
        rejected,
        completionRate:
          total > 0
            ? Math.round(
                (completed / total) * 100,
              )
            : 0,
        located: filteredRequests.filter(
          (request) =>
            request.latitude !== null &&
            request.longitude !== null,
        ).length,
      };
    }, [filteredRequests]);

  const reportPeriodLabel =
    useMemo(() => {
      if (startDate && endDate) {
        return `${formatReportDate(startDate)} - ${formatReportDate(endDate)}`;
      }

      if (startDate) {
        return `ตั้งแต่ ${formatReportDate(startDate)}`;
      }

      if (endDate) {
        return `ถึง ${formatReportDate(endDate)}`;
      }

      return 'ข้อมูลทุกช่วงเวลา';
    }, [startDate, endDate]);

  const executiveReportModel =
    useMemo(
      () =>
        buildExecutiveReportModel({
          requests:
            filteredRequests,
          startDate,
          endDate,
          visitorHistory,
          visitorStats,
        }),
      [
        filteredRequests,
        startDate,
        endDate,
        visitorHistory,
        visitorStats,
      ],
    );

  const getDefaultMemoParagraphs =
    (): string[] => [
      'ตามที่เทศบาลตำบลราไวย์ได้เปิดให้บริการระบบยื่นคำร้องขอข้อมูลภาพจากกล้องวงจรปิด (CCTV) เพื่ออำนวยความสะดวกแก่ประชาชน และสนับสนุนการติดตามผลการดำเนินงานของเจ้าหน้าที่ นั้น',
      `ศูนย์ควบคุมและสั่งการระบบ CCTV ได้จัดทำรายงานสรุปผลการดำเนินงานตามช่วง ${executiveReportModel.periodLabel} พบว่ามีคำร้องทั้งหมด ${executiveReportModel.total} รายการ ดำเนินการเสร็จ ${executiveReportModel.completed} รายการ อยู่ระหว่างดำเนินการ ${executiveReportModel.open} รายการ ค้างเกิน 7 วัน ${executiveReportModel.overdueSevenDays} รายการ และมีข้อมูลพิกัดครบถ้วนร้อยละ ${executiveReportModel.spatialCoverageRate} รายละเอียดปรากฏตามรายงานแนบท้าย`,
      'ในการนี้ จึงขอรายงานข้อมูลดังกล่าวเพื่อใช้ประกอบการกำกับติดตาม วิเคราะห์ปัญหา จัดลำดับงานเร่งด่วน วางแผนดูแลระบบกล้องวงจรปิด และพัฒนาคุณภาพการให้บริการประชาชนให้มีประสิทธิภาพยิ่งขึ้น',
    ];

  const getPreviewCustomization =
    (): ExecutiveReportCustomization => ({
      insights: splitEditorItems(
        editableInsights,
      ),
      recommendations: splitEditorItems(
        editableRecommendations,
      ),
      memoParagraphs: splitEditorParagraphs(
        memoBodyText,
      ),
      memoClosingText:
        memoClosingText.trim(),
      executiveFontScale,
      executiveLineSpacing,
      memoFontSize,
      memoLineSpacing,
    });

  const renderPdfPreview = async (
    customization:
      ExecutiveReportCustomization,
  ): Promise<void> => {
    setIsPreviewLoading(true);
    setExportError('');

    try {
      const pdf =
        await buildExecutiveReportPdf({
          requests: filteredRequests,
          startDate,
          endDate,
          visitorHistory,
          visitorStats,
          memoCover,
          customization,
        });
      const nextUrl =
        URL.createObjectURL(
          pdf.output('blob'),
        );

      setPreviewPdfUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(
            currentUrl,
          );
        }

        return nextUrl;
      });
    } catch (
      previewError: unknown
    ) {
      console.warn(
        'PDF preview failed:',
        previewError,
      );
      setExportError(
        'สร้างตัวอย่าง PDF ไม่สำเร็จ กรุณาตรวจสอบว่าฟอนต์รายงานอยู่ครบ แล้วลองอีกครั้ง',
      );
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const openPdfPreview =
    async (): Promise<void> => {
      let customization =
        getPreviewCustomization();

      if (!previewInitialized) {
        const insights =
          executiveReportModel.insights.join(
            '\n',
          );
        const recommendations =
          executiveReportModel.recommendations.join(
            '\n',
          );
        const memoBody =
          getDefaultMemoParagraphs().join(
            '\n\n',
          );

        setEditableInsights(insights);
        setEditableRecommendations(
          recommendations,
        );
        setMemoBodyText(memoBody);
        setPreviewInitialized(true);
        customization = {
          ...customization,
          insights:
            executiveReportModel.insights,
          recommendations:
            executiveReportModel.recommendations,
          memoParagraphs:
            getDefaultMemoParagraphs(),
        };
      }

      setIsPreviewOpen(true);
      await renderPdfPreview(
        customization,
      );
    };

  useEffect(() => {
    if (isOpen) return;

    setIsPreviewOpen(false);
    setPreviewInitialized(false);
    setPreviewPdfUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(
          currentUrl,
        );
      }

      return '';
    });
  }, [isOpen]);

  useEffect(
    () => () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(
          previewPdfUrl,
        );
      }
    },
    [previewPdfUrl],
  );

  const processedTrafficData =
    useMemo(() => {
      const getGroupKey = (
        dateString: string,
      ): string => {
        const [
          ,
          month,
          year,
        ] = dateString.split('/');

        if (
          timeScale === 'year'
        ) {
          return `ปี ${year ?? '-'}`;
        }

        if (
          timeScale === 'month'
        ) {
          return (
            `${month ?? '-'}/` +
            (year ?? '-')
          );
        }

        return dateString;
      };

      const groupedMap =
        new Map<
          string,
          VisitorHistoryItem
        >();

      for (
        const item
        of visitorHistory
      ) {
        const key =
          getGroupKey(item.date);

        const existing =
          groupedMap.get(key);

        if (existing) {
          existing.views +=
            item.views;

          existing.requests +=
            item.requests;

          continue;
        }

        groupedMap.set(key, {
          date: key,
          views: item.views,
          requests:
            item.requests,
        });
      }

      return Array.from(
        groupedMap.values(),
      );
    }, [
      visitorHistory,
      timeScale,
    ]);

  useEffect(() => {
    if (
      !isOpen ||
      !analyticsMapRef.current ||
      reportSummary.located === 0
    ) {
      return;
    }

    let cancelled = false;

    let initializeTimer:
      | number
      | null = null;

    let script:
      | HTMLScriptElement
      | null = null;

    const initializeMap = () => {
      if (
        cancelled ||
        !analyticsMapRef.current
      ) {
        return;
      }

      const leaflet =
        getAnalyticsLeaflet();

      if (!leaflet) {
        return;
      }

      leafletAnalyticsInstance
        .current
        ?.remove();

      const map =
        leaflet
          .map(
            analyticsMapRef.current,
          )
          .setView(
            [7.7858, 98.3225],
            14,
          );

      leafletAnalyticsInstance
        .current = map;

      leaflet
        .tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        )
        .addTo(map);

      for (
        const request
        of filteredRequests
      ) {
        if (
          request.latitude ===
            null ||
          request.longitude ===
            null
        ) {
          continue;
        }

        const color =
          request.status ===
          'completed'
            ? '#43b99a'
            : '#3b82f6';

        const eventLabel =
          EVENT_TYPE_TH[
            request.eventType ||
              'OTHER'
          ] ??
          EVENT_TYPE_TH.OTHER;

        leaflet
          .circleMarker(
            [
              request.latitude,
              request.longitude,
            ],
            {
              radius: 8,
              fillColor: color,
              color: '#fff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8,
            },
          )
          .addTo(map)
          .bindPopup(
            `<b>${escapeReportHtml(
              request.trackingId,
            )}</b><br>${escapeReportHtml(
              eventLabel,
            )}`,
          );
      }
    };

    if (
      !document.getElementById(
        'leaflet-css',
      )
    ) {
      const stylesheet =
        document.createElement(
          'link',
        );

      stylesheet.id =
        'leaflet-css';

      stylesheet.rel =
        'stylesheet';

      stylesheet.href =
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

      document.head.appendChild(
        stylesheet,
      );
    }

    if (getAnalyticsLeaflet()) {
      initializeTimer =
        window.setTimeout(
          initializeMap,
          100,
        );
    } else {
      script =
        document.getElementById(
          'leaflet-script',
        ) as
          | HTMLScriptElement
          | null;

      if (!script) {
        script =
          document.createElement(
            'script',
          );

        script.id =
          'leaflet-script';

        script.src =
          'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

        script.async = true;

        document.body.appendChild(
          script,
        );
      }

      script.addEventListener(
        'load',
        initializeMap,
      );
    }

    return () => {
      cancelled = true;

      if (
        initializeTimer !== null
      ) {
        window.clearTimeout(
          initializeTimer,
        );
      }

      script?.removeEventListener(
        'load',
        initializeMap,
      );

      leafletAnalyticsInstance
        .current
        ?.remove();

      leafletAnalyticsInstance
        .current = null;
    };
  }, [
    isOpen,
    filteredRequests,
    reportSummary.located,
  ]);

  const exportPDF =
    async (): Promise<void> => {
      setIsExporting(true);
      setExportError('');

      try {
        await downloadExecutiveReportPdf({
          requests:
            filteredRequests,
          startDate,
          endDate,
          visitorHistory,
          visitorStats,
          memoCover,
          customization:
            getPreviewCustomization(),
        });
      } catch (
        exportError: unknown
      ) {
        console.warn(
          'PDF export failed:',
          exportError,
        );
        setExportError(
          'สร้างไฟล์ PDF ไม่สำเร็จ กรุณาตรวจสอบว่าฟอนต์รายงานอยู่ครบ แล้วลองอีกครั้ง',
        );
      } finally {
        setIsExporting(false);
      }
    };
  if (!isOpen) return null;

  return (
    // ✅ 1. เปลี่ยน Padding ของ Overlay ให้มือถือชิดขอบ
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 bg-slate-900/90 backdrop-blur-2xl overflow-hidden font-sans">
      
      {/* ✅ 2. ปรับขอบโค้งและความสูงให้เหมาะกับมือถือ */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        tabIndex={-1}
        className="bg-[#fcfcfd] w-full max-w-6xl h-full md:h-[95vh] rounded-none md:rounded-3xl shadow-2xl flex flex-col my-0 md:my-4 animate-in zoom-in-95 duration-500 border border-white/20 outline-none"
      >
        
        {/* ✨ Header Section - จัดเรียง Flex ใหม่สำหรับมือถือ */}
        <div className="px-6 py-5 md:px-10 md:py-7 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-md rounded-none md:rounded-t-[4rem] shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 rounded-xl md:rounded-2xl text-white shadow-lg shrink-0">
              <FileBarChart className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <h2 id="report-modal-title" className="text-lg md:text-xl font-bold text-slate-900 tracking-tight leading-tight">ศูนย์รายงานและวิเคราะห์ข้อมูล</h2>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1">ระบบคำร้อง CCTV • เทศบาลตำบลราไวย์</p>
            </div>
          </div>
          
          {/* ปุ่มเครื่องมือ - Wrap และเรียงให้กดง่ายบนมือถือ */}
          <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-end mt-2 md:mt-0">
            <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1 overflow-x-auto hide-scrollbar">
              {(['day', 'month', 'year'] as const).map((v) => (
                 <button type="button" key={v} aria-pressed={timeScale === v} onClick={() => setTimeScale(v)} className={`px-3 py-1.5 md:px-4 md:py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all whitespace-nowrap ${timeScale === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                  {v === 'day' ? 'รายวัน' : v === 'month' ? 'รายเดือน' : 'รายปี'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={openPdfPreview} disabled={isExporting || isPreviewLoading} aria-live="polite" className="bg-slate-900 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl font-bold text-[9px] md:text-[10px] hover:bg-slate-800 shadow-xl flex items-center gap-2 transition-all disabled:cursor-not-allowed disabled:opacity-60">
                {isPreviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} <span>{isPreviewLoading ? 'กำลังสร้างตัวอย่าง…' : 'ตรวจและแก้ไข PDF'}</span>
              </button>
              <button type="button" onClick={onClose} disabled={isExporting} aria-label="ปิดรายงานวิเคราะห์" className="p-2.5 md:p-3 bg-white text-slate-300 hover:text-red-500 rounded-xl md:rounded-2xl border border-slate-100 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"><XCircle className="w-5 h-5 md:w-6 md:h-6"/></button>
            </div>
          </div>
        </div>

        {isPreviewOpen ? (
          <div className="flex min-h-0 flex-1 flex-col bg-slate-100 lg:flex-row">
            <aside className="w-full shrink-0 overflow-y-auto border-b border-slate-200 bg-white p-5 custom-scrollbar lg:w-[390px] lg:border-b-0 lg:border-r lg:p-6">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> กลับไปหน้ารายงาน
              </button>

              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <FilePenLine className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">แก้ไขก่อนสร้าง PDF</h3>
                  <p className="mt-1 text-[10px] leading-5 text-slate-500">แก้ข้อความและระยะจัดหน้า แล้วกด “อัปเดตตัวอย่าง” เพื่อดูหน้ากระดาษจริง</p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {memoCover.enabled && (
                  <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-700">หน้า 1 • บันทึกข้อความ</p>
                      <p className="mt-1 text-[10px] text-slate-500">เว้นหนึ่งบรรทัดเพื่อแบ่งย่อหน้า</p>
                    </div>
                    <label className="block space-y-1.5 text-[10px] font-bold text-slate-600">
                      เรื่อง
                      <input
                        type="text"
                        value={memoCover.subject}
                        onChange={(event) => updateMemoCover('subject', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-amber-500"
                      />
                    </label>
                    <label className="block space-y-1.5 text-[10px] font-bold text-slate-600">
                      เรียน
                      <input
                        type="text"
                        value={memoCover.recipient}
                        onChange={(event) => updateMemoCover('recipient', event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-amber-500"
                      />
                    </label>
                    <label className="block space-y-1.5 text-[10px] font-bold text-slate-600">
                      เนื้อหาบันทึก
                      <textarea
                        value={memoBodyText}
                        onChange={(event) => setMemoBodyText(event.target.value)}
                        rows={11}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium leading-5 text-slate-900 outline-none focus:border-amber-500"
                      />
                    </label>
                    <label className="block space-y-1.5 text-[10px] font-bold text-slate-600">
                      ข้อความลงท้าย
                      <input
                        type="text"
                        value={memoClosingText}
                        onChange={(event) => setMemoClosingText(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-amber-500"
                      />
                    </label>
                    <div className="space-y-2 rounded-xl border border-amber-100 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold text-slate-700">ผู้ลงนาม</p>
                          <p className="text-[9px] text-slate-400">จัดแนวเดียวกัน คนที่ 2 เป็นต้นไปมีส่วนความเห็น 2 บรรทัด</p>
                        </div>
                        <button type="button" onClick={addMemoSigner} disabled={(memoCover.signers?.length ?? 1) >= 4} className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-2 text-[9px] font-bold text-amber-800 disabled:cursor-not-allowed disabled:opacity-40">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> เพิ่ม
                        </button>
                      </div>
                      {(memoCover.signers?.length ? memoCover.signers : [{ name: memoCover.signerName, position: memoCover.signerPosition }]).map((signer, index) => (
                        <div key={`preview-signer-${index}`} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg bg-amber-50/60 p-2">
                          <div className="grid gap-2">
                            <input type="text" value={signer.name} onChange={(event) => updateMemoSigner(index, 'name', event.target.value)} aria-label={`ชื่อผู้ลงนามคนที่ ${index + 1}`} placeholder={`ชื่อผู้ลงนามคนที่ ${index + 1}`} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-900 outline-none focus:border-amber-500" />
                            <input type="text" value={signer.position} onChange={(event) => updateMemoSigner(index, 'position', event.target.value)} aria-label={`ตำแหน่งผู้ลงนามคนที่ ${index + 1}`} placeholder="ตำแหน่ง" className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-900 outline-none focus:border-amber-500" />
                          </div>
                          <button type="button" onClick={() => removeMemoSigner(index)} aria-label={`ลบผู้ลงนามคนที่ ${index + 1}`} className="self-center rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1.5 text-[9px] font-bold text-slate-500">
                        ขนาดตัวอักษร
                        <select value={memoFontSize} onChange={(event) => setMemoFontSize(Number(event.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] text-slate-800">
                          <option value={14}>14 pt</option>
                          <option value={15}>15 pt</option>
                          <option value={16}>16 pt (มาตรฐาน)</option>
                          <option value={17}>17 pt</option>
                          <option value={18}>18 pt</option>
                        </select>
                      </label>
                      <label className="space-y-1.5 text-[9px] font-bold text-slate-500">
                        ระยะบรรทัด
                        <select value={memoLineSpacing} onChange={(event) => setMemoLineSpacing(Number(event.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] text-slate-800">
                          <option value={0.9}>กระชับ</option>
                          <option value={1}>ปกติ</option>
                          <option value={1.15}>โปร่ง</option>
                          <option value={1.3}>โปร่งมาก</option>
                        </select>
                      </label>
                    </div>
                  </section>
                )}

                <section className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-blue-700">หน้าสรุปผู้บริหาร</p>
                    <p className="mt-1 text-[10px] text-slate-500">หนึ่งบรรทัดต่อหนึ่งหัวข้อ</p>
                  </div>
                  <label className="block space-y-1.5 text-[10px] font-bold text-slate-600">
                    ประเด็นสำคัญ
                    <textarea value={editableInsights} onChange={(event) => setEditableInsights(event.target.value)} rows={5} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium leading-5 text-slate-900 outline-none focus:border-blue-500" />
                  </label>
                  <label className="block space-y-1.5 text-[10px] font-bold text-slate-600">
                    ข้อเสนอแนะ
                    <textarea value={editableRecommendations} onChange={(event) => setEditableRecommendations(event.target.value)} rows={6} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium leading-5 text-slate-900 outline-none focus:border-blue-500" />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1.5 text-[9px] font-bold text-slate-500">
                      ขนาดข้อความ
                      <select value={executiveFontScale} onChange={(event) => setExecutiveFontScale(Number(event.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] text-slate-800">
                        <option value={0.9}>เล็ก</option>
                        <option value={1}>ปกติ</option>
                        <option value={1.1}>ใหญ่</option>
                      </select>
                    </label>
                    <label className="space-y-1.5 text-[9px] font-bold text-slate-500">
                      ระยะบรรทัด
                      <select value={executiveLineSpacing} onChange={(event) => setExecutiveLineSpacing(Number(event.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] text-slate-800">
                        <option value={0.9}>กระชับ</option>
                        <option value={1}>ปกติ</option>
                        <option value={1.15}>โปร่ง</option>
                      </select>
                    </label>
                  </div>
                </section>

                {exportError && (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[10px] font-semibold leading-5 text-red-700">{exportError}</div>
                )}

                <div className="sticky bottom-0 grid gap-2 border-t border-slate-100 bg-white/95 pt-4 backdrop-blur">
                  <button type="button" onClick={() => renderPdfPreview(getPreviewCustomization())} disabled={isPreviewLoading || isExporting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-[10px] font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:opacity-60">
                    {isPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {isPreviewLoading ? 'กำลังจัดหน้า…' : 'อัปเดตตัวอย่าง'}
                  </button>
                  <button type="button" onClick={exportPDF} disabled={isPreviewLoading || isExporting || !previewPdfUrl} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[10px] font-bold text-white transition hover:bg-slate-800 disabled:opacity-60">
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {isExporting ? 'กำลังสร้างไฟล์…' : 'ดาวน์โหลด PDF ฉบับนี้'}
                  </button>
                </div>
              </div>
            </aside>

            <section className="flex min-h-[55vh] min-w-0 flex-1 flex-col p-3 sm:p-5 lg:min-h-0 lg:p-6" aria-label="ตัวอย่างเอกสาร PDF">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-800">ตัวอย่างหน้ากระดาษจริง</p>
                  <p className="mt-0.5 text-[9px] text-slate-500">หน้าแรก A4 แนวตั้ง • หน้าวิเคราะห์ A4 แนวนอน</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[9px] font-bold text-emerald-700">PDF Preview</span>
              </div>
              <div className="relative min-h-[520px] flex-1 overflow-hidden rounded-2xl border border-slate-300 bg-slate-700 shadow-2xl">
                {isPreviewLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900/75 text-white backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-xs font-bold">กำลังจัดหน้ากระดาษ A4…</p>
                  </div>
                )}
                {previewPdfUrl ? (
                  <iframe title="ตัวอย่างรายงาน PDF ก่อนดาวน์โหลด" src={`${previewPdfUrl}#view=FitH&toolbar=1`} className="h-full min-h-[520px] w-full bg-white" />
                ) : (
                  <div className="flex h-full min-h-[520px] flex-col items-center justify-center gap-3 text-slate-300">
                    <Eye className="h-10 w-10" aria-hidden="true" />
                    <p className="text-xs font-bold">กำลังเตรียมตัวอย่างรายงาน</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
        /* 📄 Content Area - ปรับ Padding ด้านใน */
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          <div className="space-y-8 p-5 sm:p-6 md:space-y-12 md:p-12">

            <section className="flex flex-col gap-4 rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 to-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                  <CalendarRange className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">ขอบเขตรายงานปัจจุบัน</p>
                  <h3 className="mt-1 text-sm font-bold text-slate-900 md:text-base">{reportPeriodLabel}</h3>
                  <p className="mt-1 text-[10px] text-slate-500">อ้างอิงตัวกรองจากหน้าแผงควบคุม จำนวน {reportSummary.total.toLocaleString('th-TH')} คำร้อง</p>
                </div>
              </div>
              <div className="flex gap-2 text-[9px] font-bold">
                <span className="rounded-full border border-white bg-white/80 px-3 py-1.5 text-slate-600">มีพิกัด {reportSummary.located.toLocaleString('th-TH')}</span>
                <span className="rounded-full border border-white bg-white/80 px-3 py-1.5 text-red-600">ปฏิเสธ {reportSummary.rejected.toLocaleString('th-TH')}</span>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-amber-200 bg-[#fffdf7] shadow-sm">
              <div className="flex flex-col gap-4 border-b border-amber-100 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-7">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                    <Landmark className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-700">Official memorandum</p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">ใบปะหน้าบันทึกข้อความราชการ</h3>
                    <p id="memo-cover-description" className="mt-1 text-[10px] leading-5 text-slate-500">หน้าแรก A4 แนวตั้งตามโครงสร้างหนังสือภายใน ส่วนรายงานวิเคราะห์จะต่อท้ายแบบ A4 แนวนอน</p>
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-3 self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-700 sm:self-center">
                  <input
                    type="checkbox"
                    checked={memoCover.enabled}
                    onChange={(event) => updateMemoCover('enabled', event.target.checked)}
                    aria-describedby="memo-cover-description"
                    className="h-4 w-4 accent-amber-600"
                  />
                  แนบใบปะหน้าราชการ
                </label>
              </div>

              <div className={`space-y-5 p-5 transition-opacity md:p-7 ${memoCover.enabled ? 'opacity-100' : 'pointer-events-none opacity-45'}`} aria-disabled={!memoCover.enabled}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-amber-100 bg-white p-3.5">
                    <p className="text-[9px] font-bold text-slate-400">รูปแบบกระดาษ</p>
                    <p className="mt-1 text-xs font-bold text-slate-800">A4 210 × 297 มม.</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-white p-3.5">
                    <p className="text-[9px] font-bold text-slate-400">ระยะขอบมาตรฐาน</p>
                    <p className="mt-1 text-xs font-bold text-slate-800">ซ้าย 3 ซม. • ขวา 2 ซม.</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-white p-3.5">
                    <p className="text-[9px] font-bold text-slate-400">แบบอักษร</p>
                    <p className="mt-1 text-xs font-bold text-slate-800">TH Sarabun • เนื้อหา 16 pt</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <FileSignature className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-700">ข้อมูลส่วนราชการที่กำหนดคงที่</p>
                      <p className="mt-1 text-[10px] leading-5 text-slate-500">ศูนย์ควบคุมและสั่งการระบบ CCTV สำนักปลัดเทศบาล เทศบาลตำบลราไวย์</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5 text-[10px] font-bold text-slate-600">
                    เลขที่หนังสือ
                    <input
                      type="text"
                      value={memoCover.documentNumber}
                      onChange={(event) => updateMemoCover('documentNumber', event.target.value)}
                      placeholder="เช่น ภก 82601/123"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-medium text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                    />
                  </label>
                  <label className="space-y-1.5 text-[10px] font-bold text-slate-600">
                    วันที่หนังสือ
                    <input
                      type="date"
                      value={memoCover.documentDate}
                      onChange={(event) => updateMemoCover('documentDate', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-medium text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                    />
                  </label>
                  <label className="space-y-1.5 text-[10px] font-bold text-slate-600 md:col-span-2">
                    เรื่อง
                    <input
                      type="text"
                      value={memoCover.subject}
                      onChange={(event) => updateMemoCover('subject', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-medium text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                    />
                  </label>
                  <label className="space-y-1.5 text-[10px] font-bold text-slate-600 md:col-span-2">
                    เรียน
                    <input
                      type="text"
                      value={memoCover.recipient}
                      onChange={(event) => updateMemoCover('recipient', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-medium text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                    />
                  </label>
                  <div className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50/40 p-4 md:col-span-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-700">รายชื่อผู้ลงนาม</p>
                        <p className="mt-1 text-[9px] leading-4 text-slate-500">เพิ่มได้สูงสุด 4 คน ชื่อและตำแหน่งทุกคนอยู่แนวเดียวกับคนแรก พร้อมพื้นที่เซ็นประมาณ 4 บรรทัด โดยคนที่ 2 เป็นต้นไประบบจะสร้างหัวข้อ “ความเห็น + ตำแหน่ง” และเส้นประ 2 บรรทัดให้อัตโนมัติ</p>
                      </div>
                      <button type="button" onClick={addMemoSigner} disabled={(memoCover.signers?.length ?? 1) >= 4} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2.5 text-[10px] font-bold text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40">
                        <Plus className="h-4 w-4" aria-hidden="true" /> เพิ่มผู้ลงนาม
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(memoCover.signers?.length ? memoCover.signers : [{ name: memoCover.signerName, position: memoCover.signerPosition }]).map((signer, index) => (
                        <div key={`memo-signer-${index}`} className="rounded-xl border border-amber-100 bg-white p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-[9px] font-bold text-amber-700">ผู้ลงนามคนที่ {index + 1}{index > 0 ? ' • มีส่วนความเห็นก่อนลงนาม' : ''}</p>
                            <button type="button" onClick={() => removeMemoSigner(index)} aria-label={`ลบผู้ลงนามคนที่ ${index + 1}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                          <div className="grid gap-2">
                            <label className="space-y-1 text-[9px] font-bold text-slate-500">
                              ชื่อ-นามสกุล
                              <input type="text" value={signer.name} onChange={(event) => updateMemoSigner(index, 'name', event.target.value)} placeholder="เว้นว่างเพื่อแสดงเส้นสำหรับลงนาม" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-amber-500" />
                            </label>
                            <label className="space-y-1 text-[9px] font-bold text-slate-500">
                              ตำแหน่ง
                              <input type="text" value={signer.position} onChange={(event) => updateMemoSigner(index, 'position', event.target.value)} placeholder="เช่น หัวหน้าศูนย์ควบคุมและสั่งการระบบ CCTV" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-amber-500" />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <label className="space-y-1.5 text-[10px] font-bold text-slate-600">
                    ชั้นความเร็ว
                    <select
                      value={memoCover.urgency}
                      onChange={(event) => updateMemoCover('urgency', event.target.value as OfficialMemoCover['urgency'])}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-medium text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                    >
                      <option value="">ปกติ</option>
                      <option value="ด่วน">ด่วน</option>
                      <option value="ด่วนมาก">ด่วนมาก</option>
                      <option value="ด่วนที่สุด">ด่วนที่สุด</option>
                    </select>
                  </label>
                  <label className="space-y-1.5 text-[10px] font-bold text-slate-600">
                    ชั้นความลับ
                    <select
                      value={memoCover.confidentiality}
                      onChange={(event) => updateMemoCover('confidentiality', event.target.value as OfficialMemoCover['confidentiality'])}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-medium text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                    >
                      <option value="">ไม่กำหนด</option>
                      <option value="ลับ">ลับ</option>
                      <option value="ลับมาก">ลับมาก</option>
                      <option value="ลับที่สุด">ลับที่สุด</option>
                    </select>
                  </label>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-[10px] font-semibold leading-5 text-slate-600">
                  <input
                    type="checkbox"
                    checked={memoCover.useThaiDigits}
                    onChange={(event) => updateMemoCover('useThaiDigits', event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600"
                  />
                  ใช้เลขไทยบนใบปะหน้า เช่น 1 → ๑ และ 2569 → ๒๕๖๙ โดยรหัสติดตามในภาคผนวกรายงานยังคงเป็นเลขอารบิกเพื่อให้ค้นหาและตรวจสอบได้สะดวก
                </label>
              </div>
            </section>

            {exportError && (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {exportError}
              </div>
            )}

            <section className="overflow-hidden rounded-[2rem] bg-[#201c56] text-white shadow-2xl shadow-slate-200">
              <div className="grid gap-8 p-6 md:grid-cols-[1.15fr_0.85fr] md:p-9">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Executive brief
                    </span>
                    <span className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${executiveReportModel.operationalLevel === 'critical' ? 'bg-red-400/15 text-red-200' : executiveReportModel.operationalLevel === 'attention' ? 'bg-amber-300/15 text-amber-200' : 'bg-emerald-300/15 text-emerald-200'}`}>
                      {executiveReportModel.operationalLabel}
                    </span>
                  </div>
                  <h3 className="mt-5 text-2xl font-bold tracking-tight md:text-3xl">ภาพรวมเพื่อการตัดสินใจ</h3>
                  <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-300">
                    สรุปภาระงาน ประสิทธิภาพ จุดเสี่ยง และคุณภาพข้อมูลจากคำร้องในช่วงที่เลือก เพื่อให้ผู้บริหารเห็นสิ่งที่ควรเร่งดำเนินการได้ทันที
                  </p>
                  <div className="mt-6 space-y-3">
                    {executiveReportModel.insights.slice(0, 3).map((insight) => (
                      <div key={insight} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
                        <Target className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                        <p className="text-[11px] font-medium leading-5 text-slate-100">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 md:p-6">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">ข้อเสนอแนะเชิงปฏิบัติการ</p>
                  <ol className="mt-4 space-y-4">
                    {executiveReportModel.recommendations.slice(0, 4).map((recommendation, index) => (
                      <li key={recommendation} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#43b99a] text-[10px] font-black text-[#201c56]">{index + 1}</span>
                        <p className="text-[11px] leading-5 text-slate-200">{recommendation}</p>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5 text-[9px] font-semibold text-slate-400">
                    <Printer className="h-4 w-4 text-blue-300" aria-hidden="true" />
                    PDF A4 แนวนอน • ค้นหาข้อความได้ • ไม่แสดงข้อมูลส่วนบุคคล
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="report-kpi-title" className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-600">Management indicators</p>
                  <h3 id="report-kpi-title" className="mt-1 text-lg font-bold text-slate-900">ตัวชี้วัดสำคัญ</h3>
                </div>
                <p className="hidden text-[10px] text-slate-400 sm:block">คำนวณจาก {executiveReportModel.total.toLocaleString('th-TH')} คำร้องในรายงาน</p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                {[
                  { label: 'คำร้องทั้งหมด', value: executiveReportModel.total.toLocaleString('th-TH'), detail: 'รายการในช่วงที่เลือก', icon: FileBarChart, color: 'text-blue-600 bg-blue-50' },
                  { label: 'งานเปิดอยู่', value: executiveReportModel.open.toLocaleString('th-TH'), detail: 'ยังไม่ปิดกระบวนการ', icon: Clock3, color: 'text-slate-700 bg-slate-100' },
                  { label: 'เสร็จสิ้น', value: executiveReportModel.completed.toLocaleString('th-TH'), detail: `${executiveReportModel.completionRate}% ของทั้งหมด`, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'ค้างเกิน 7 วัน', value: executiveReportModel.overdueSevenDays.toLocaleString('th-TH'), detail: 'ควรตรวจสอบลำดับเร่งด่วน', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
                  { label: 'ความครบถ้วนพิกัด', value: `${executiveReportModel.spatialCoverageRate}%`, detail: `${executiveReportModel.located.toLocaleString('th-TH')} รายการมีพิกัด`, icon: MapPinned, color: 'text-indigo-600 bg-indigo-50' },
                  { label: 'เวลาปิดงานเฉลี่ย', value: executiveReportModel.averageResolutionHours === null ? '-' : executiveReportModel.averageResolutionHours < 24 ? `${Math.round(executiveReportModel.averageResolutionHours)} ชม.` : `${(executiveReportModel.averageResolutionHours / 24).toFixed(1)} วัน`, detail: 'เฉพาะรายการที่เสร็จสิ้น', icon: ShieldCheck, color: 'text-cyan-700 bg-cyan-50' },
                ].map(({ label, value, detail, icon: Icon, color }) => (
                  <article key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md md:p-5">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                    <p className="mt-4 text-[10px] font-bold text-slate-500">{label}</p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</p>
                    <p className="mt-1 text-[9px] leading-4 text-slate-400">{detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-600">Workload distribution</p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">สัดส่วนตามสถานะ</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">รวม {executiveReportModel.total.toLocaleString('th-TH')}</span>
                </div>
                <div className="mt-6 space-y-4">
                  {executiveReportModel.statusBreakdown.slice(0, 7).map((item) => (
                    <div key={item.name}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px]">
                        <span className="font-semibold text-slate-600">{item.name}</span>
                        <span className="font-bold text-slate-900">{item.value.toLocaleString('th-TH')} <span className="font-medium text-slate-400">({item.percentage}%)</span></span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500" style={{ width: `${Math.max(item.percentage, item.value > 0 ? 2 : 0)}%` }} />
                      </div>
                    </div>
                  ))}
                  {executiveReportModel.statusBreakdown.length === 0 && <p className="py-8 text-center text-xs text-slate-400">ยังไม่มีข้อมูลสถานะในช่วงนี้</p>}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 md:p-7">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-600">Backlog aging</p>
                <h3 className="mt-1 text-base font-bold text-slate-900">อายุงานที่ยังไม่ปิด</h3>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {executiveReportModel.backlogAgeBreakdown.map((item) => (
                    <article key={item.name} className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                      <p className="text-[9px] font-semibold text-slate-400">{item.name}</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{item.value.toLocaleString('th-TH')}</p>
                      <p className="mt-1 text-[9px] font-semibold text-amber-600">{item.percentage}% ของงานเปิด</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {/* 2. YouTube-Style Traffic Chart */}
            <div className="space-y-4 md:space-y-6">
               <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 md:gap-3 uppercase tracking-wider">
                 <Activity className="w-5 h-5 md:w-6 md:h-6 text-blue-500 shrink-0" /> 
                 <span className="truncate">แนวโน้มการเข้าใช้งาน <span className="text-slate-400 font-medium text-xs md:text-sm hidden sm:inline">(ผู้เข้าชมและคำร้อง)</span></span>
               </h3>
               {/* ลดความสูงกราฟบนมือถือ */}
               <p className="text-[10px] leading-relaxed text-slate-400">สถิติผู้เข้าชมเว็บไซต์เป็นข้อมูล Analytics แยกจากตัวกรองคำร้องด้านบน • วันนี้ {visitorStats.today.toLocaleString('th-TH')} ครั้ง • สะสม {visitorStats.total.toLocaleString('th-TH')} ครั้ง</p>
               <div role="img" aria-label="กราฟแนวโน้มผู้เข้าชมเว็บไซต์และจำนวนคำร้อง" className="bg-slate-50/50 p-4 md:p-10 rounded-3xl md:rounded-3xl border border-slate-100 h-[300px] md:h-[450px]">
                 {processedTrafficData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={processedTrafficData}>
                     <defs><linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                     <XAxis dataKey="date" tick={{fontSize: 9, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                     <YAxis tick={{fontSize: 9}} axisLine={false} tickLine={false} width={30} />
                     <ChartTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                     <Area type="monotone" dataKey="views" name="ยอดผู้เข้าชม" stroke="#3b82f6" strokeWidth={4} fill="url(#colorViews)">
                        <LabelList dataKey="views" position="top" style={{ fontSize: '9px', fontWeight: 'bold', fill: '#3b82f6' }} />
                     </Area>
                     <Area type="monotone" dataKey="requests" name="จำนวนคำร้อง" stroke="#43b99a" strokeWidth={3} fillOpacity={0} />
                     <Legend verticalAlign="top" align="right" wrapperStyle={{paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold'}} />
                   </AreaChart>
                 </ResponsiveContainer>
                 ) : (
                   <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-400">
                     <Activity className="h-9 w-9 opacity-40" aria-hidden="true" />
                     <p className="text-sm font-bold">ยังไม่มีข้อมูล Analytics ในช่วงนี้</p>
                     <p className="max-w-xs text-[10px] leading-relaxed">ข้อมูลจะปรากฏหลังระบบบันทึกสถิติผู้เข้าชมและจำนวนคำร้องรายวัน</p>
                   </div>
                 )}
               </div>
            </div>

            {/* 3. Incident Breakdown Charts - เรียงลงมา 1 คอลัมน์บนมือถือ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
              <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-3xl border border-slate-100 shadow-sm">
                <h4 className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 md:mb-10 flex items-center gap-2"><AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-orange-500" /> สถิติแยกตามประเภทเหตุ</h4>
                <div role="img" aria-label="กราฟจำนวนคำร้องแยกตามประเภทเหตุการณ์" className="h-60 md:h-72">
                  {reportData.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.chartData} layout="vertical" margin={{ left: -20, right: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 9, fontWeight: 'bold'}} width={90} axisLine={false} />
                      <Bar dataKey="value" name="จำนวนเคส" fill="#0f172a" radius={[0, 10, 10, 0]} barSize={20}>
                        <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fontWeight: 'black', fill: '#1e293b' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400">
                      <AlertTriangle className="h-8 w-8 opacity-30" aria-hidden="true" />
                      <p className="text-xs font-bold">ไม่มีข้อมูลประเภทเหตุในรายงานนี้</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-slate-900 p-6 md:p-10 rounded-3xl md:rounded-3xl text-white shadow-2xl">
                <h4 className="text-[9px] md:text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-6 md:mb-10 flex items-center gap-2"><Car className="w-4 h-4 md:w-5 md:h-5" /> เจาะลึกสถิติอุบัติเหตุ</h4>
                <div className="h-60 md:h-72">
                   {accidentSubtypeStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={accidentSubtypeStats}>
                          <XAxis dataKey="name" tick={{fontSize: 8, fill: '#fff', fontWeight: 'bold'}} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={60} />
                          <Bar dataKey="value" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={30}>
                            <LabelList dataKey="value" position="top" style={{ fontSize: '11px', fontWeight: 'black', fill: '#fff' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center opacity-30 text-xs md:text-sm italic">ไม่มีข้อมูลอุบัติเหตุในช่วงนี้</div>
                   )}
                </div>
              </div>
            </div>

            {/* 4. Spatial Map Analysis */}
            <div className="space-y-4 md:space-y-8">
               <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 md:gap-3 uppercase tracking-wider">
                 <MapPinned className="w-5 h-5 md:w-6 md:h-6 text-red-500 shrink-0" /> <span className="truncate">การวิเคราะห์เชิงพื้นที่</span>
               </h3>
               {/* ลดความสูงและขนาดขอบของแผนที่บนมือถือ */}
               {reportSummary.located > 0 ? (
                 <div ref={analyticsMapRef} role="img" aria-label={`แผนที่แสดงตำแหน่งคำร้อง ${reportSummary.located} จุด`} className="h-[350px] md:h-[550px] w-full rounded-3xl md:rounded-3xl border-8 md:border-[15px] border-slate-50 shadow-inner overflow-hidden" />
               ) : (
                 <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center text-slate-400">
                   <MapPinOff className="h-9 w-9" aria-hidden="true" />
                   <p className="text-sm font-bold">ไม่มีข้อมูลพิกัดในรายงานนี้</p>
                   <p className="text-[10px]">ลองปรับตัวกรองหรือช่วงวันที่จากหน้าแผงควบคุม</p>
                 </div>
               )}
            </div>

            {/* 5. Management registry */}
            <div className="space-y-4 md:space-y-8 pb-10">
              <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2 md:gap-3 uppercase tracking-wider">
                <ListFilter className="w-5 h-5 md:w-6 md:h-6 text-indigo-500 shrink-0" /> <span className="truncate">ทะเบียนคำร้องเพื่อการบริหาร</span>
              </h3>
              <p className="max-w-3xl text-[10px] leading-relaxed text-slate-400">แสดงข้อมูลที่จำเป็นต่อการติดตามงาน โดยไม่แสดงชื่อ เบอร์โทร เลขประจำตัว หรือข้อมูลส่วนบุคคลของผู้ยื่นคำร้อง</p>

              <div className="rounded-2xl md:rounded-3xl overflow-x-auto border border-slate-100 shadow-2xl shadow-slate-100/50 bg-white custom-scrollbar">
                <table className="w-full min-w-[920px] text-left">
                  <thead className="bg-slate-900 text-white text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                      <th className="p-5 md:p-7 whitespace-nowrap">เลขที่คำร้อง</th>
                      <th className="p-5 md:p-7 whitespace-nowrap">วันที่เกิดเหตุ</th>
                      <th className="p-5 md:p-7 whitespace-nowrap">ประเภทเหตุ</th>
                      <th className="p-5 md:p-7">พื้นที่ / จุดเกิดเหตุ</th>
                      <th className="p-5 md:p-7 whitespace-nowrap">สถานะล่าสุด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[10px] md:text-[11px]">
                    {filteredRequests.slice(0, 50).map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-all group">
                        <td className="p-5 md:p-7 font-bold text-blue-600 tracking-tight group-hover:translate-x-1 transition-transform whitespace-nowrap">{req.trackingId}</td>
                        <td className="p-5 md:p-7 font-semibold text-slate-600 whitespace-nowrap">{formatReportDate(req.eventDate) || '-'}</td>
                        <td className="p-5 md:p-7 font-bold text-slate-400 whitespace-nowrap">{EVENT_TYPE_TH[req.eventType || 'OTHER']}</td>
                        <td className="p-5 md:p-7 font-medium text-slate-600"><span className="line-clamp-2 max-w-sm">{req.location || 'ไม่ระบุพื้นที่'}</span></td>
                        <td className="p-5 md:p-7 whitespace-nowrap">
                           <span className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-widest ${getReportStatusClass(req.status)}`}>
                             {STATUS_TH[req.status] || req.status}
                           </span>
                        </td>
                      </tr>
                    ))}
                    {filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-10 md:p-20 text-center text-slate-400 font-bold">ไม่พบข้อมูลที่ตรงกับตัวกรอง</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredRequests.length > 50 && (
                <p className="text-right text-[10px] font-medium text-slate-400">
                  ตารางแสดง 50 รายการแรกจากทั้งหมด {filteredRequests.length.toLocaleString('th-TH')} รายการ
                </p>
              )}
              
              {/* Footer Branding */}
              <div className="flex flex-col items-center pt-10 md:pt-20 border-t border-slate-100 space-y-3 md:space-y-4">
                 <div className="flex items-center gap-3 md:gap-4 text-slate-300">
                    <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />
                    <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">End-to-End Encryption • PDPA</p>
                 </div>
                 <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center px-4">
                    Copyright © 2026 Rawai Municipality • Digital Master Plan Project
                 </p>
              </div>
            </div>

          </div>
        </div>
        )}
      </div>
    </div>
  );
};
