import { jsPDF } from "jspdf";

import type {
  CCTVRequest,
  RequestTimestamp,
} from "../types";

const DAY_IN_MS =
  24 * 60 * 60 * 1000;

const STATUS_LABELS:
  Record<string, string> = {
    draft: "ฉบับร่าง",
    pending: "รอตรวจสอบ",
    processing: "กำลังดำเนินการ",
    verifying: "ตรวจเอกสาร",
    searching: "กำลังค้นหาภาพ",
    waiting_for_information:
      "รอข้อมูลเพิ่มเติม",
    completed: "เสร็จสิ้น",
    rejected: "ปฏิเสธ",
  };

const EVENT_LABELS:
  Record<string, string> = {
    ACCIDENT: "อุบัติเหตุ",
    THEFT: "ลักทรัพย์",
    VANDALISM: "ทำลายทรัพย์สิน",
    DISPUTE: "ข้อพิพาท",
    OTHER: "อื่น ๆ",
  };

const ACCIDENT_LABELS:
  Record<string, string> = {
    MC_VS_MC: "จยย. ชน จยย.",
    MC_VS_CAR: "จยย. ชน รถยนต์",
    CAR_VS_CAR: "รถยนต์ ชน รถยนต์",
    PEDESTRIAN: "ชนคนเดินเท้า",
    HIT_AND_RUN: "ชนแล้วหนี",
    OTHER: "อื่น ๆ",
  };

interface VisitorHistoryItem {
  date: string;
  views: number;
  requests: number;
}

export type OfficialMemoUrgency =
  | ""
  | "ด่วน"
  | "ด่วนมาก"
  | "ด่วนที่สุด";

export type OfficialMemoConfidentiality =
  | ""
  | "ลับ"
  | "ลับมาก"
  | "ลับที่สุด";

export interface OfficialMemoCover {
  enabled: boolean;
  documentNumber: string;
  documentDate: string;
  subject: string;
  recipient: string;
  signerName: string;
  signerPosition: string;
  signers?: OfficialMemoSigner[];
  useThaiDigits: boolean;
  urgency: OfficialMemoUrgency;
  confidentiality:
    OfficialMemoConfidentiality;
}

export interface OfficialMemoSigner {
  name: string;
  position: string;
}

export interface ExecutiveReportCustomization {
  insights?: string[];
  recommendations?: string[];
  memoParagraphs?: string[];
  memoClosingText?: string;
  executiveFontScale?: number;
  executiveLineSpacing?: number;
  memoFontSize?: number;
  memoLineSpacing?: number;
}

export interface ExecutiveReportInput {
  requests: CCTVRequest[];
  startDate: string;
  endDate: string;
  visitorHistory: VisitorHistoryItem[];
  visitorStats: {
    today: number;
    total: number;
  };
  memoCover?: OfficialMemoCover;
  customization?: ExecutiveReportCustomization;
}

export interface BreakdownItem {
  name: string;
  value: number;
  percentage: number;
}

export interface ExecutiveReportModel {
  generatedAt: Date;
  periodLabel: string;
  total: number;
  open: number;
  completed: number;
  rejected: number;
  overdueSevenDays: number;
  completionRate: number;
  spatialCoverageRate: number;
  located: number;
  averageResolutionHours:
    | number
    | null;
  operationalLevel:
    | "normal"
    | "attention"
    | "critical";
  operationalLabel: string;
  statusBreakdown: BreakdownItem[];
  eventBreakdown: BreakdownItem[];
  accidentBreakdown: BreakdownItem[];
  backlogAgeBreakdown: BreakdownItem[];
  topLocations: BreakdownItem[];
  insights: string[];
  recommendations: string[];
  analytics: {
    todayViews: number;
    totalViews: number;
    recordedDays: number;
    recordedRequests: number;
  };
}

interface BuildPdfOptions {
  fontBase64?: string;
  officialFontBase64?: string;
  officialBoldFontBase64?: string;
  garudaDataUrl?: string;
}

const COLORS = {
  navy: [15, 41, 66] as const,
  blue: [37, 99, 235] as const,
  emerald: [5, 150, 105] as const,
  amber: [217, 119, 6] as const,
  red: [220, 38, 38] as const,
  slate: [71, 85, 105] as const,
  muted: [148, 163, 184] as const,
  line: [226, 232, 240] as const,
  surface: [248, 250, 252] as const,
  white: [255, 255, 255] as const,
};

const OFFICIAL_MEMO_AGENCY =
  "ศูนย์ควบคุมและสั่งการระบบ CCTV สำนักปลัดเทศบาล เทศบาลตำบลราไวย์";

const THAI_DIGITS =
  ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"] as const;

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

export function toThaiDigits(
  value: string | number,
): string {
  return String(value).replace(
    /\d/g,
    (digit) =>
      THAI_DIGITS[Number(digit)] ??
      digit,
  );
}

function formatOfficialMemoDate(
  value: string,
  useThaiDigits: boolean,
): string {
  const date = value
    ? new Date(`${value}T12:00:00`)
    : new Date();

  if (Number.isNaN(date.getTime())) {
    return useThaiDigits
      ? toThaiDigits(value)
      : value;
  }

  const formatted =
    `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;

  return useThaiDigits
    ? toThaiDigits(formatted)
    : formatted;
}

function timestampToDate(
  value: RequestTimestamp,
): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(
      value.getTime(),
    )
      ? null
      : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  if (typeof value === "string") {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  if (value?.toDate) {
    const date = value.toDate();

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  if (
    value &&
    typeof value.seconds === "number"
  ) {
    const date = new Date(
      value.seconds * 1000,
    );

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  return null;
}

function formatDate(
  value: string | Date,
): string {
  const date =
    value instanceof Date
      ? value
      : new Date(
          `${value}T12:00:00`,
        );

  if (Number.isNaN(date.getTime())) {
    return typeof value === "string"
      ? value
      : "-";
  }

  return new Intl.DateTimeFormat(
    "th-TH",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function createPeriodLabel(
  startDate: string,
  endDate: string,
): string {
  if (startDate && endDate) {
    return (
      `${formatDate(startDate)} - ` +
      formatDate(endDate)
    );
  }

  if (startDate) {
    return `ตั้งแต่ ${formatDate(startDate)}`;
  }

  if (endDate) {
    return `ถึง ${formatDate(endDate)}`;
  }

  return "ข้อมูลทุกช่วงเวลา";
}

function toBreakdown(
  counts: Map<string, number>,
  total: number,
): BreakdownItem[] {
  return Array.from(counts.entries())
    .map(([name, value]) => ({
      name,
      value,
      percentage:
        total > 0
          ? Math.round(
              (value / total) * 100,
            )
          : 0,
    }))
    .sort(
      (left, right) =>
        right.value - left.value,
    );
}

function getOpenAgeDays(
  request: CCTVRequest,
  now: Date,
): number {
  const createdAt =
    timestampToDate(
      request.createdAt,
    );

  if (!createdAt) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (now.getTime() -
        createdAt.getTime()) /
        DAY_IN_MS,
    ),
  );
}

function getResolutionHours(
  request: CCTVRequest,
): number | null {
  if (request.status !== "completed") {
    return null;
  }

  const startedAt =
    timestampToDate(
      request.createdAt,
    );

  const completedHistory =
    [...(request.statusHistory ?? [])]
      .reverse()
      .find(
        (item) =>
          item.status ===
          "completed",
      );

  const completedAt =
    timestampToDate(
      completedHistory?.timestamp ??
        request.updatedAt,
    );

  if (!startedAt || !completedAt) {
    return null;
  }

  const duration =
    completedAt.getTime() -
    startedAt.getTime();

  return duration >= 0
    ? duration / (60 * 60 * 1000)
    : null;
}

function normalizeLocation(
  value: string,
): string {
  return value
    .trim()
    .replace(/\s+/gu, " ") ||
    "ไม่ระบุสถานที่";
}

export function buildExecutiveReportModel(
  input: ExecutiveReportInput,
): ExecutiveReportModel {
  const now = new Date();
  const statusCounts =
    new Map<string, number>();
  const eventCounts =
    new Map<string, number>();
  const accidentCounts =
    new Map<string, number>();
  const locationCounts =
    new Map<string, number>();
  const backlogCounts = new Map([
    ["ไม่เกิน 1 วัน", 0],
    ["2-3 วัน", 0],
    ["4-7 วัน", 0],
    ["เกิน 7 วัน", 0],
  ]);

  let completed = 0;
  let rejected = 0;
  let located = 0;
  let overdueSevenDays = 0;
  const resolutionHours: number[] = [];

  for (const request of input.requests) {
    const statusLabel =
      STATUS_LABELS[request.status] ??
      request.status;
    const eventLabel =
      EVENT_LABELS[request.eventType] ??
      EVENT_LABELS.OTHER;

    statusCounts.set(
      statusLabel,
      (statusCounts.get(statusLabel) ??
        0) + 1,
    );
    eventCounts.set(
      eventLabel,
      (eventCounts.get(eventLabel) ??
        0) + 1,
    );

    const location = normalizeLocation(
      request.location,
    );
    locationCounts.set(
      location,
      (locationCounts.get(location) ??
        0) + 1,
    );

    if (
      request.latitude !== null &&
      request.longitude !== null
    ) {
      located += 1;
    }

    if (request.status === "completed") {
      completed += 1;
      const duration =
        getResolutionHours(request);

      if (duration !== null) {
        resolutionHours.push(duration);
      }
    } else if (
      request.status === "rejected"
    ) {
      rejected += 1;
    } else {
      const ageDays = getOpenAgeDays(
        request,
        now,
      );

      if (ageDays <= 1) {
        backlogCounts.set(
          "ไม่เกิน 1 วัน",
          (backlogCounts.get(
            "ไม่เกิน 1 วัน",
          ) ?? 0) + 1,
        );
      } else if (ageDays <= 3) {
        backlogCounts.set(
          "2-3 วัน",
          (backlogCounts.get(
            "2-3 วัน",
          ) ?? 0) + 1,
        );
      } else if (ageDays <= 7) {
        backlogCounts.set(
          "4-7 วัน",
          (backlogCounts.get(
            "4-7 วัน",
          ) ?? 0) + 1,
        );
      } else {
        overdueSevenDays += 1;
        backlogCounts.set(
          "เกิน 7 วัน",
          (backlogCounts.get(
            "เกิน 7 วัน",
          ) ?? 0) + 1,
        );
      }
    }

    if (
      request.eventType ===
      "ACCIDENT"
    ) {
      const subtype =
        ACCIDENT_LABELS[
          request.accidentSubtype
        ] ?? "ไม่ระบุ";
      accidentCounts.set(
        subtype,
        (accidentCounts.get(subtype) ??
          0) + 1,
      );
    }
  }

  const total = input.requests.length;
  const open =
    total - completed - rejected;
  const completionRate =
    total > 0
      ? Math.round(
          (completed / total) * 100,
        )
      : 0;
  const spatialCoverageRate =
    total > 0
      ? Math.round(
          (located / total) * 100,
        )
      : 0;
  const overdueRate =
    open > 0
      ? overdueSevenDays / open
      : 0;

  const operationalLevel =
    overdueRate >= 0.3 ||
    (total >= 5 && completionRate < 40)
      ? "critical"
      : overdueSevenDays > 0 ||
          open > completed
        ? "attention"
        : "normal";

  const operationalLabel = {
    normal: "สถานการณ์ปกติ",
    attention: "ควรติดตามใกล้ชิด",
    critical: "ต้องเร่งดำเนินการ",
  }[operationalLevel];

  const eventBreakdown = toBreakdown(
    eventCounts,
    total,
  );
  const topLocations = toBreakdown(
    locationCounts,
    total,
  ).slice(0, 5);
  const insights: string[] = [];
  const recommendations: string[] = [];

  if (eventBreakdown[0]) {
    insights.push(
      `เหตุที่พบมากที่สุดคือ ${eventBreakdown[0].name} จำนวน ${eventBreakdown[0].value.toLocaleString("th-TH")} รายการ (${eventBreakdown[0].percentage}%)`,
    );
  }

  if (open > 0) {
    insights.push(
      `มีงานเปิดอยู่ ${open.toLocaleString("th-TH")} รายการ และค้างเกิน 7 วัน ${overdueSevenDays.toLocaleString("th-TH")} รายการ`,
    );
  }

  if (resolutionHours.length > 0) {
    const average =
      resolutionHours.reduce(
        (sum, value) =>
          sum + value,
        0,
      ) / resolutionHours.length;

    insights.push(
      `ระยะเวลาดำเนินการเฉลี่ยของงานที่เสร็จ ${average < 24 ? `${average.toFixed(1)} ชั่วโมง` : `${(average / 24).toFixed(1)} วัน`}`,
    );
  }

  if (insights.length === 0) {
    insights.push(
      "ยังไม่มีคำร้องในขอบเขตรายงาน จึงยังไม่สามารถสรุปแนวโน้มเชิงปฏิบัติการได้",
    );
  }

  if (spatialCoverageRate < 80 && total > 0) {
    recommendations.push(
      `เพิ่มความครบถ้วนของพิกัด ปัจจุบันมีพิกัด ${spatialCoverageRate}% เพื่อให้วิเคราะห์จุดเสี่ยงได้แม่นยำขึ้น`,
    );
  }

  if (overdueSevenDays > 0) {
    recommendations.push(
      `จัดลำดับเร่งรัดคำร้องค้างเกิน 7 วันจำนวน ${overdueSevenDays.toLocaleString("th-TH")} รายการ และบันทึกเหตุผลที่ล่าช้า`,
    );
  }

  if (eventBreakdown[0]) {
    recommendations.push(
      `ใช้ข้อมูลเหตุ ${eventBreakdown[0].name} วางแผนตรวจสภาพกล้องและมาตรการป้องกันในพื้นที่เกิดเหตุซ้ำ`,
    );
  }

  if (completionRate < 70 && total > 0) {
    recommendations.push(
      "ทบทวนภาระงานรายขั้นตอนและกำหนดผู้รับผิดชอบงานค้าง เพื่อเพิ่มอัตราปิดคำร้อง",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "รักษาระดับการดำเนินงานปัจจุบัน พร้อมติดตามคำร้องใหม่และคุณภาพข้อมูลอย่างต่อเนื่อง",
    );
  }

  const recordedRequests =
    input.visitorHistory.reduce(
      (sum, item) =>
        sum + item.requests,
      0,
    );

  return {
    generatedAt: now,
    periodLabel: createPeriodLabel(
      input.startDate,
      input.endDate,
    ),
    total,
    open,
    completed,
    rejected,
    overdueSevenDays,
    completionRate,
    spatialCoverageRate,
    located,
    averageResolutionHours:
      resolutionHours.length > 0
        ? resolutionHours.reduce(
            (sum, value) =>
              sum + value,
            0,
          ) / resolutionHours.length
        : null,
    operationalLevel,
    operationalLabel,
    statusBreakdown: toBreakdown(
      statusCounts,
      total,
    ),
    eventBreakdown,
    accidentBreakdown: toBreakdown(
      accidentCounts,
      Array.from(
        accidentCounts.values(),
      ).reduce(
        (sum, value) =>
          sum + value,
        0,
      ),
    ),
    backlogAgeBreakdown: toBreakdown(
      backlogCounts,
      open,
    ),
    topLocations,
    insights,
    recommendations,
    analytics: {
      todayViews:
        input.visitorStats.today,
      totalViews:
        input.visitorStats.total,
      recordedDays:
        input.visitorHistory.length,
      recordedRequests,
    },
  };
}

function arrayBufferToBase64(
  buffer: ArrayBuffer,
): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (
    let offset = 0;
    offset < bytes.length;
    offset += chunkSize
  ) {
    binary += String.fromCharCode(
      ...bytes.subarray(
        offset,
        offset + chunkSize,
      ),
    );
  }

  return btoa(binary);
}

async function loadThaiFont(
  pdf: jsPDF,
  suppliedBase64?: string,
): Promise<void> {
  let fontBase64 = suppliedBase64;

  if (!fontBase64) {
    const response = await fetch(
      "/fonts/Sarabun-Regular.ttf",
    );

    if (!response.ok) {
      throw new Error(
        "ไม่สามารถโหลดฟอนต์ภาษาไทยสำหรับ PDF ได้",
      );
    }

    fontBase64 = arrayBufferToBase64(
      await response.arrayBuffer(),
    );
  }

  const fontFileName =
    "Sarabun-Regular.ttf";

  pdf.addFileToVFS(
    fontFileName,
    fontBase64,
  );
  pdf.addFont(
    fontFileName,
    "Sarabun",
    "normal",
  );
  pdf.addFont(
    fontFileName,
    "Sarabun",
    "bold",
  );
  pdf.setFont(
    "Sarabun",
    "normal",
  );
}

async function fetchBase64Asset(
  url: string,
  errorMessage: string,
): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return arrayBufferToBase64(
    await response.arrayBuffer(),
  );
}

async function loadOfficialMemoAssets(
  pdf: jsPDF,
  options: BuildPdfOptions,
): Promise<string> {
  const regularBase64 =
    options.officialFontBase64 ??
    (await fetchBase64Asset(
      "/fonts/THSarabun-Regular.ttf",
      "ไม่สามารถโหลดฟอนต์ TH Sarabun สำหรับหนังสือราชการได้",
    ));
  const boldBase64 =
    options.officialBoldFontBase64 ??
    (await fetchBase64Asset(
      "/fonts/THSarabun-Bold.ttf",
      "ไม่สามารถโหลดฟอนต์ TH Sarabun ตัวหนาสำหรับหนังสือราชการได้",
    ));
  const garudaDataUrl =
    options.garudaDataUrl ??
    `data:image/png;base64,${await fetchBase64Asset(
      "/images/garuda-black.png",
      "ไม่สามารถโหลดตราครุฑสำหรับหนังสือราชการได้",
    )}`;

  pdf.addFileToVFS(
    "THSarabun-Regular.ttf",
    regularBase64,
  );
  pdf.addFileToVFS(
    "THSarabun-Bold.ttf",
    boldBase64,
  );
  pdf.addFont(
    "THSarabun-Regular.ttf",
    "THSarabun",
    "normal",
  );
  pdf.addFont(
    "THSarabun-Bold.ttf",
    "THSarabun",
    "bold",
  );

  return garudaDataUrl;
}

function setFill(
  pdf: jsPDF,
  color: readonly [
    number,
    number,
    number,
  ],
): void {
  pdf.setFillColor(
    color[0],
    color[1],
    color[2],
  );
}

function setText(
  pdf: jsPDF,
  color: readonly [
    number,
    number,
    number,
  ],
): void {
  pdf.setTextColor(
    color[0],
    color[1],
    color[2],
  );
}

function writeText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: {
    size?: number;
    color?: readonly [
      number,
      number,
      number,
    ];
    style?: "normal" | "bold";
    maxWidth?: number;
    align?: "left" | "center" | "right";
  },
): number {
  pdf.setFont(
    "Sarabun",
    options?.style ?? "normal",
  );
  pdf.setFontSize(options?.size ?? 9);
  setText(
    pdf,
    options?.color ?? COLORS.navy,
  );

  const lines = options?.maxWidth
    ? (pdf.splitTextToSize(
        text,
        options.maxWidth,
      ) as string[])
    : [text];

  pdf.text(lines, x, y, {
    align: options?.align ?? "left",
  });

  return lines.length *
    ((options?.size ?? 9) *
      0.42);
}

function writeOfficialText(
  pdf: jsPDF,
  text: string | string[],
  x: number,
  y: number,
  options?: {
    size?: number;
    style?: "normal" | "bold";
    align?: "left" | "center" | "right";
    maxWidth?: number;
    lineHeightFactor?: number;
  },
): void {
  pdf.setFont(
    "THSarabun",
    options?.style ?? "normal",
  );
  pdf.setFontSize(options?.size ?? 16);
  pdf.setTextColor(0, 0, 0);
  pdf.text(text, x, y, {
    align: options?.align ?? "left",
    maxWidth: options?.maxWidth,
    lineHeightFactor:
      options?.lineHeightFactor ??
      1.15,
  });
}

function drawOfficialDottedRule(
  pdf: jsPDF,
  x1: number,
  x2: number,
  y: number,
): void {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.22);
  pdf.setLineDashPattern(
    [0.35, 0.9],
    0,
  );
  pdf.line(x1, y, x2, y);
  pdf.setLineDashPattern([], 0);
}

function drawOfficialField(
  pdf: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  endX: number,
): void {
  writeOfficialText(
    pdf,
    label,
    x,
    y,
    {
      size: 20,
      style: "bold",
    },
  );
  pdf.setFont("THSarabun", "bold");
  pdf.setFontSize(20);
  const labelWidth =
    pdf.getTextWidth(label);
  const valueX =
    x + labelWidth + 2;

  drawOfficialDottedRule(
    pdf,
    valueX,
    endX,
    y + 1.2,
  );
  writeOfficialText(
    pdf,
    value || " ",
    valueX,
    y,
    {
      size: 16,
      maxWidth:
        endX - valueX - 1,
    },
  );
}

function drawOfficialParagraph(
  pdf: jsPDF,
  text: string,
  y: number,
  indentFirstLine = true,
  fontSize = 16,
  lineSpacing = 1,
): number {
  const left = 30;
  const right = 190;
  const indent = indentFirstLine
    ? 25
    : 0;
  const lineHeight =
    7.2 *
    (fontSize / 16) *
    lineSpacing;

  pdf.setFont("THSarabun", "normal");
  pdf.setFontSize(fontSize);

  if (!indentFirstLine) {
    const lines = pdf.splitTextToSize(
      text,
      right - left,
    ) as string[];

    writeOfficialText(
      pdf,
      lines,
      left,
      y,
      {
        size: fontSize,
        lineHeightFactor:
          1.28 * lineSpacing,
      },
    );

    return y +
      lines.length * lineHeight;
  }

  const narrowLines =
    pdf.splitTextToSize(
      text,
      right - left - indent,
    ) as string[];
  const firstLine =
    narrowLines[0] ?? text;
  const remainder = text
    .slice(firstLine.length)
    .trimStart();

  writeOfficialText(
    pdf,
    firstLine,
    left + indent,
    y,
    {
      size: fontSize,
    },
  );

  if (!remainder) {
    return y + lineHeight;
  }

  const remainingLines =
    pdf.splitTextToSize(
      remainder,
      right - left,
    ) as string[];

  writeOfficialText(
    pdf,
    remainingLines,
    left,
    y + lineHeight,
    {
      size: fontSize,
      lineHeightFactor:
        1.28 * lineSpacing,
    },
  );

  return y +
    (remainingLines.length + 1) *
      lineHeight;
}

function drawOfficialMemoCover(
  pdf: jsPDF,
  model: ExecutiveReportModel,
  memo: OfficialMemoCover,
  garudaDataUrl: string,
  customization?: ExecutiveReportCustomization,
): void {
  const renderValue = (
    value: string | number,
  ): string =>
    memo.useThaiDigits
      ? toThaiDigits(value)
      : String(value);
  const documentDate =
    formatOfficialMemoDate(
      memo.documentDate,
      memo.useThaiDigits,
    );

  if (memo.confidentiality) {
    writeOfficialText(
      pdf,
      memo.confidentiality,
      105,
      8,
      {
        size: 16,
        style: "bold",
        align: "center",
      },
    );
    writeOfficialText(
      pdf,
      memo.confidentiality,
      105,
      290,
      {
        size: 16,
        style: "bold",
        align: "center",
      },
    );
  }

  pdf.addImage(
    garudaDataUrl,
    "PNG",
    30,
    14,
    13.45,
    15,
  );

  if (memo.urgency) {
    writeOfficialText(
      pdf,
      memo.urgency,
      57,
      27,
      {
        size: 16,
        style: "bold",
        align: "center",
      },
    );
  }

  writeOfficialText(
    pdf,
    "บันทึกข้อความ",
    116,
    28,
    {
      size: 29,
      style: "bold",
      align: "center",
    },
  );

  const agency = renderValue(
    OFFICIAL_MEMO_AGENCY,
  );
  drawOfficialField(
    pdf,
    "ส่วนราชการ",
    agency,
    30,
    42,
    190,
  );
  drawOfficialField(
    pdf,
    "ที่",
    renderValue(
      memo.documentNumber ||
        "........................",
    ),
    30,
    53,
    105,
  );
  drawOfficialField(
    pdf,
    "วันที่",
    documentDate,
    109,
    53,
    190,
  );
  drawOfficialField(
    pdf,
    "เรื่อง",
    renderValue(memo.subject),
    30,
    64,
    190,
  );

  writeOfficialText(
    pdf,
    `เรียน  ${renderValue(memo.recipient)}`,
    30,
    78,
    { size: 16 },
  );

  let currentY = 94;
  const defaultParagraphs = [
    "ตามที่เทศบาลตำบลราไวย์ได้เปิดให้บริการระบบยื่นคำร้องขอข้อมูลภาพจากกล้องวงจรปิด (CCTV) เพื่ออำนวยความสะดวกแก่ประชาชน และสนับสนุนการติดตามผลการดำเนินงานของเจ้าหน้าที่ นั้น",
    `ศูนย์ควบคุมและสั่งการระบบ CCTV ได้จัดทำรายงานสรุปผลการดำเนินงานตามช่วง ${model.periodLabel} พบว่ามีคำร้องทั้งหมด ${model.total} รายการ ดำเนินการเสร็จ ${model.completed} รายการ อยู่ระหว่างดำเนินการ ${model.open} รายการ ค้างเกิน 7 วัน ${model.overdueSevenDays} รายการ และมีข้อมูลพิกัดครบถ้วนร้อยละ ${model.spatialCoverageRate} รายละเอียดปรากฏตามรายงานแนบท้าย`,
    `ในการนี้ จึงขอรายงานข้อมูลดังกล่าวเพื่อใช้ประกอบการกำกับติดตาม วิเคราะห์ปัญหา จัดลำดับงานเร่งด่วน วางแผนดูแลระบบกล้องวงจรปิด และพัฒนาคุณภาพการให้บริการประชาชนให้มีประสิทธิภาพยิ่งขึ้น`,
  ];
  const paragraphs =
    (customization?.memoParagraphs?.length
      ? customization.memoParagraphs
      : defaultParagraphs
    ).map(renderValue);
  const memoFontSize = Math.min(
    18,
    Math.max(
      14,
      customization?.memoFontSize ?? 16,
    ),
  );
  const memoLineSpacing = Math.min(
    1.35,
    Math.max(
      0.9,
      customization?.memoLineSpacing ?? 1,
    ),
  );

  for (const paragraph of paragraphs) {
    currentY =
      drawOfficialParagraph(
        pdf,
        paragraph,
        currentY,
        true,
        memoFontSize,
        memoLineSpacing,
      ) + 2;
  }

  currentY = Math.max(
    currentY + 2,
    177,
  );
  drawOfficialParagraph(
    pdf,
    renderValue(
      customization?.memoClosingText ||
        "จึงเรียนมาเพื่อโปรดทราบ",
    ),
    currentY,
    true,
    memoFontSize,
    memoLineSpacing,
  );

  const signers = (
    memo.signers?.length
      ? memo.signers
      : [
          {
            name: memo.signerName,
            position:
              memo.signerPosition,
          },
        ]
  ).slice(0, 4);
  const firstSigner = signers[0] ?? {
    name: "",
    position: "",
  };

  drawOfficialSignerBlock(
    pdf,
    firstSigner,
    132,
    195,
    renderValue,
  );
}

function drawOfficialSignerBlock(
  pdf: jsPDF,
  signer: OfficialMemoSigner,
  centerX: number,
  topY: number,
  renderValue: (
    value: string | number,
  ) => string,
): number {
  const blankSignatureLines = 4;
  const signatureLineHeight = 7.2;
  const nameY =
    topY +
    blankSignatureLines *
      signatureLineHeight;

  writeOfficialText(
    pdf,
    signer.name
      ? `(${renderValue(signer.name)})`
      : "(........................................................)",
    centerX,
    nameY,
    {
      size: 16,
      align: "center",
    },
  );
  writeOfficialText(
    pdf,
    signer.position ||
      "ผู้จัดทำรายงาน",
    centerX,
    nameY + 8,
    {
      size: 16,
      align: "center",
      maxWidth: 116,
    },
  );

  return nameY + 16;
}

function drawOfficialOpinionSignerBlock(
  pdf: jsPDF,
  signer: OfficialMemoSigner,
  topY: number,
  renderValue: (
    value: string | number,
  ) => string,
): number {
  const position =
    signer.position.trim();
  const opinionTitle = position
    ? `ความเห็น${renderValue(position)}`
    : "ความเห็นผู้พิจารณา";

  writeOfficialText(
    pdf,
    opinionTitle,
    30,
    topY,
    {
      size: 16,
    },
  );

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.setLineDashPattern(
    [0.8, 1.15],
    0,
  );
  pdf.line(
    30,
    topY + 8,
    190,
    topY + 8,
  );
  pdf.line(
    30,
    topY + 16,
    190,
    topY + 16,
  );
  pdf.setLineDashPattern([], 0);

  return drawOfficialSignerBlock(
    pdf,
    signer,
    132,
    topY + 22,
    renderValue,
  );
}

function drawOfficialSignatureContinuation(
  pdf: jsPDF,
  memo: OfficialMemoCover,
  signers: OfficialMemoSigner[],
): void {
  const renderValue = (
    value: string | number,
  ): string =>
    memo.useThaiDigits
      ? toThaiDigits(value)
      : String(value);

  if (memo.confidentiality) {
    writeOfficialText(
      pdf,
      memo.confidentiality,
      105,
      8,
      {
        size: 16,
        style: "bold",
        align: "center",
      },
    );
    writeOfficialText(
      pdf,
      memo.confidentiality,
      105,
      290,
      {
        size: 16,
        style: "bold",
        align: "center",
      },
    );
  }

  writeOfficialText(
    pdf,
    memo.useThaiDigits
      ? "- ๒ -"
      : "- 2 -",
    105,
    10,
    {
      size: 14,
      align: "center",
    },
  );

  let signerTopY = 27;

  for (const signer of signers) {
    signerTopY =
      drawOfficialOpinionSignerBlock(
        pdf,
        signer,
        signerTopY,
        renderValue,
      ) + 9;
  }
}

function drawHeader(
  pdf: jsPDF,
  title: string,
  subtitle: string,
): void {
  const width =
    pdf.internal.pageSize.getWidth();

  setFill(pdf, COLORS.navy);
  pdf.rect(0, 0, width, 25, "F");
  setFill(pdf, COLORS.emerald);
  pdf.rect(0, 25, width, 1.5, "F");

  writeText(pdf, title, 12, 10.5, {
    size: 16,
    color: COLORS.white,
    style: "bold",
  });
  writeText(pdf, subtitle, 12, 18.5, {
    size: 8,
    color: [203, 213, 225],
  });
  writeText(
    pdf,
    "CCTV RAWAI • EXECUTIVE INTELLIGENCE",
    width - 12,
    14,
    {
      size: 7,
      color: [110, 231, 183],
      style: "bold",
      align: "right",
    },
  );
}

function drawKpiCard(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  accent: readonly [
    number,
    number,
    number,
  ],
  detail: string,
): void {
  setFill(pdf, COLORS.surface);
  pdf.roundedRect(
    x,
    y,
    width,
    24,
    3,
    3,
    "F",
  );
  setFill(pdf, accent);
  pdf.roundedRect(
    x,
    y,
    3,
    24,
    1.5,
    1.5,
    "F",
  );
  writeText(pdf, label, x + 7, y + 7, {
    size: 7.2,
    color: COLORS.slate,
    style: "bold",
  });
  writeText(pdf, value, x + 7, y + 16, {
    size: 15,
    color: COLORS.navy,
    style: "bold",
  });
  writeText(
    pdf,
    detail,
    x + width - 5,
    y + 16,
    {
      size: 6.5,
      color: COLORS.muted,
      align: "right",
    },
  );
}

function drawSectionTitle(
  pdf: jsPDF,
  title: string,
  x: number,
  y: number,
): void {
  setFill(pdf, COLORS.emerald);
  pdf.roundedRect(
    x,
    y - 3.4,
    2,
    5,
    1,
    1,
    "F",
  );
  writeText(pdf, title, x + 5, y, {
    size: 9,
    style: "bold",
  });
}

function drawBreakdownBars(
  pdf: jsPDF,
  items: BreakdownItem[],
  x: number,
  y: number,
  width: number,
  maxItems = 6,
): number {
  const visibleItems =
    items.slice(0, maxItems);
  const maximum = Math.max(
    1,
    ...visibleItems.map(
      (item) => item.value,
    ),
  );
  let currentY = y;

  if (visibleItems.length === 0) {
    writeText(
      pdf,
      "ยังไม่มีข้อมูลสำหรับวิเคราะห์",
      x,
      currentY,
      {
        size: 7.5,
        color: COLORS.muted,
      },
    );

    return currentY + 8;
  }

  for (const item of visibleItems) {
    writeText(
      pdf,
      item.name,
      x,
      currentY,
      {
        size: 7.2,
        color: COLORS.slate,
        maxWidth: width - 25,
      },
    );
    writeText(
      pdf,
      `${item.value.toLocaleString("th-TH")} (${item.percentage}%)`,
      x + width,
      currentY,
      {
        size: 6.8,
        color: COLORS.slate,
        style: "bold",
        align: "right",
      },
    );

    setFill(pdf, COLORS.line);
    pdf.roundedRect(
      x,
      currentY + 2.5,
      width,
      2.8,
      1.4,
      1.4,
      "F",
    );
    if (item.value > 0) {
      setFill(pdf, COLORS.blue);
      pdf.roundedRect(
        x,
        currentY + 2.5,
        Math.max(
          1.5,
          (item.value / maximum) *
            width,
        ),
        2.8,
        1.4,
        1.4,
        "F",
      );
    }

    currentY += 10;
  }

  return currentY;
}

function drawBulletList(
  pdf: jsPDF,
  items: string[],
  x: number,
  y: number,
  width: number,
  color: readonly [number, number, number] =
    COLORS.emerald,
  maxItems = 5,
  fontScale = 1,
  lineSpacing = 1,
): number {
  let currentY = y;

  for (const item of
    items.slice(0, maxItems)) {
    setFill(pdf, color);
    pdf.circle(
      x + 1.5,
      currentY - 1.3,
      1.2,
      "F",
    );
    const height = writeText(
      pdf,
      item,
      x + 6,
      currentY,
      {
        size: 7.3 * fontScale,
        color: COLORS.slate,
        maxWidth: width - 6,
      },
    );
    currentY += Math.max(
      8,
      height + 2,
    ) * lineSpacing;
  }

  return currentY;
}

function formatResolution(
  hours: number | null,
): string {
  if (hours === null) {
    return "ยังไม่มีข้อมูล";
  }

  return hours < 24
    ? `${hours.toFixed(1)} ชม.`
    : `${(hours / 24).toFixed(1)} วัน`;
}

function truncateText(
  value: string,
  maxLength: number,
): string {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1)}…`
    : value;
}

function drawExecutiveOverview(
  pdf: jsPDF,
  model: ExecutiveReportModel,
  customization?: ExecutiveReportCustomization,
): void {
  drawHeader(
    pdf,
    "รายงานสรุปผลการดำเนินงานสำหรับผู้บริหาร",
    `ระบบคำร้องขอข้อมูลภาพกล้องวงจรปิด • ${model.periodLabel}`,
  );

  const badgeColor =
    model.operationalLevel ===
    "critical"
      ? COLORS.red
      : model.operationalLevel ===
          "attention"
        ? COLORS.amber
        : COLORS.emerald;

  writeText(
    pdf,
    `จัดทำเมื่อ ${formatDate(model.generatedAt)} เวลา ${model.generatedAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.`,
    12,
    34,
    {
      size: 7.2,
      color: COLORS.slate,
    },
  );
  setFill(pdf, badgeColor);
  pdf.roundedRect(
    225,
    29,
    60,
    9,
    4.5,
    4.5,
    "F",
  );
  writeText(
    pdf,
    model.operationalLabel,
    255,
    35,
    {
      size: 7.5,
      color: COLORS.white,
      style: "bold",
      align: "center",
    },
  );

  const cardWidth = 86.3;
  const cardXs = [12, 105.3, 198.6];
  drawKpiCard(
    pdf,
    cardXs[0],
    43,
    cardWidth,
    "คำร้องทั้งหมด",
    model.total.toLocaleString(
      "th-TH",
    ),
    COLORS.blue,
    "รายการ",
  );
  drawKpiCard(
    pdf,
    cardXs[1],
    43,
    cardWidth,
    "งานที่ยังเปิดอยู่",
    model.open.toLocaleString(
      "th-TH",
    ),
    COLORS.amber,
    "ต้องติดตาม",
  );
  drawKpiCard(
    pdf,
    cardXs[2],
    43,
    cardWidth,
    "ดำเนินการเสร็จ",
    model.completed.toLocaleString(
      "th-TH",
    ),
    COLORS.emerald,
    `${model.completionRate}%`,
  );
  drawKpiCard(
    pdf,
    cardXs[0],
    71,
    cardWidth,
    "ค้างเกิน 7 วัน",
    model.overdueSevenDays.toLocaleString(
      "th-TH",
    ),
    COLORS.red,
    "รายการ",
  );
  drawKpiCard(
    pdf,
    cardXs[1],
    71,
    cardWidth,
    "ความครบถ้วนของพิกัด",
    `${model.spatialCoverageRate}%`,
    COLORS.blue,
    `${model.located}/${model.total}`,
  );
  drawKpiCard(
    pdf,
    cardXs[2],
    71,
    cardWidth,
    "เวลาดำเนินการเฉลี่ย",
    formatResolution(
      model.averageResolutionHours,
    ),
    COLORS.emerald,
    "งานที่เสร็จ",
  );

  drawSectionTitle(
    pdf,
    "ภาพรวมสถานะคำร้อง",
    12,
    107,
  );
  drawBreakdownBars(
    pdf,
    model.statusBreakdown,
    12,
    115,
    126,
    7,
  );

  drawSectionTitle(
    pdf,
    "ประเด็นสำคัญเพื่อการตัดสินใจ",
    151,
    107,
  );
  drawBulletList(
    pdf,
    model.insights,
    151,
    116,
    134,
    COLORS.blue,
    5,
    customization?.executiveFontScale ?? 1,
    customization?.executiveLineSpacing ?? 1,
  );

  drawSectionTitle(
    pdf,
    "ข้อเสนอแนะเชิงปฏิบัติการ",
    151,
    153,
  );
  drawBulletList(
    pdf,
    model.recommendations,
    151,
    162,
    134,
    COLORS.emerald,
    4,
    customization?.executiveFontScale ?? 1,
    customization?.executiveLineSpacing ?? 1,
  );
}

function drawOperationalAnalysis(
  pdf: jsPDF,
  model: ExecutiveReportModel,
): void {
  drawHeader(
    pdf,
    "วิเคราะห์รูปแบบเหตุและประสิทธิภาพการให้บริการ",
    `ข้อมูลประกอบการบริหารจัดการ • ${model.periodLabel}`,
  );

  drawSectionTitle(
    pdf,
    "ประเภทเหตุที่ได้รับแจ้ง",
    12,
    37,
  );
  drawBreakdownBars(
    pdf,
    model.eventBreakdown,
    12,
    46,
    126,
    6,
  );

  drawSectionTitle(
    pdf,
    "อายุงานที่ยังไม่ปิด",
    151,
    37,
  );
  drawBreakdownBars(
    pdf,
    model.backlogAgeBreakdown,
    151,
    46,
    134,
    4,
  );

  drawSectionTitle(
    pdf,
    "ประเภทอุบัติเหตุ",
    12,
    111,
  );
  drawBreakdownBars(
    pdf,
    model.accidentBreakdown,
    12,
    120,
    126,
    6,
  );

  drawSectionTitle(
    pdf,
    "พื้นที่ที่มีการแจ้งเหตุสูง",
    151,
    99,
  );
  drawBreakdownBars(
    pdf,
    model.topLocations,
    151,
    108,
    134,
    5,
  );

  setFill(pdf, COLORS.surface);
  pdf.roundedRect(
    151,
    162,
    134,
    25,
    3,
    3,
    "F",
  );
  writeText(
    pdf,
    "การใช้งานระบบออนไลน์",
    157,
    170,
    {
      size: 8,
      style: "bold",
    },
  );
  writeText(
    pdf,
    `ผู้เข้าชมวันนี้ ${model.analytics.todayViews.toLocaleString("th-TH")} ครั้ง • สะสม ${model.analytics.totalViews.toLocaleString("th-TH")} ครั้ง`,
    157,
    177,
    {
      size: 7.2,
      color: COLORS.slate,
    },
  );
  writeText(
    pdf,
    `มีข้อมูลแนวโน้ม ${model.analytics.recordedDays.toLocaleString("th-TH")} ช่วง • บันทึกคำร้องใน Analytics ${model.analytics.recordedRequests.toLocaleString("th-TH")} รายการ`,
    157,
    183,
    {
      size: 6.8,
      color: COLORS.muted,
    },
  );
}

function drawRegistryHeader(
  pdf: jsPDF,
  model: ExecutiveReportModel,
): void {
  drawHeader(
    pdf,
    "ทะเบียนคำร้องประกอบรายงาน",
    `ไม่แสดงข้อมูลส่วนบุคคล • ${model.periodLabel}`,
  );

  const columns = [
    ["เลขที่คำร้อง", 12, 43],
    ["วันที่เกิดเหตุ", 55, 28],
    ["ประเภทเหตุ", 83, 35],
    ["สถานที่", 118, 92],
    ["สถานะ", 210, 48],
    ["อายุงาน", 258, 27],
  ] as const;

  setFill(pdf, COLORS.navy);
  pdf.rect(12, 31, 273, 9, "F");

  for (const [label, x] of columns) {
    writeText(pdf, label, x + 2, 37, {
      size: 7,
      color: COLORS.white,
      style: "bold",
    });
  }
}

function drawRegistry(
  pdf: jsPDF,
  model: ExecutiveReportModel,
  requests: CCTVRequest[],
): void {
  const sortedRequests = [...requests].sort(
    (left, right) =>
      (timestampToDate(
        right.createdAt,
      )?.getTime() ?? 0) -
      (timestampToDate(
        left.createdAt,
      )?.getTime() ?? 0),
  );
  const rowsPerPage = 19;
  const rowHeight = 8;

  if (sortedRequests.length === 0) {
    pdf.addPage("a4", "landscape");
    drawRegistryHeader(pdf, model);
    writeText(
      pdf,
      "ไม่พบรายการคำร้องตามขอบเขตรายงาน",
      148.5,
      85,
      {
        size: 12,
        color: COLORS.muted,
        align: "center",
      },
    );
    return;
  }

  for (
    let offset = 0;
    offset < sortedRequests.length;
    offset += rowsPerPage
  ) {
    pdf.addPage("a4", "landscape");
    drawRegistryHeader(pdf, model);
    const pageRows =
      sortedRequests.slice(
        offset,
        offset + rowsPerPage,
      );

    pageRows.forEach(
      (request, index) => {
        const y =
          40 + index * rowHeight;
        const age =
          request.status === "completed" ||
          request.status === "rejected"
            ? "ปิดแล้ว"
            : `${getOpenAgeDays(request, model.generatedAt)} วัน`;

        if (index % 2 === 0) {
          setFill(pdf, COLORS.surface);
          pdf.rect(
            12,
            y,
            273,
            rowHeight,
            "F",
          );
        }

        writeText(
          pdf,
          truncateText(
            request.trackingId,
            22,
          ),
          14,
          y + 5.3,
          {
            size: 6.7,
            color: COLORS.blue,
            style: "bold",
          },
        );
        writeText(
          pdf,
          request.eventDate || "-",
          57,
          y + 5.3,
          {
            size: 6.5,
            color: COLORS.slate,
          },
        );
        writeText(
          pdf,
          truncateText(
            EVENT_LABELS[
              request.eventType
            ] ?? "อื่น ๆ",
            18,
          ),
          85,
          y + 5.3,
          {
            size: 6.5,
            color: COLORS.slate,
          },
        );
        writeText(
          pdf,
          truncateText(
            normalizeLocation(
              request.location,
            ),
            52,
          ),
          120,
          y + 5.3,
          {
            size: 6.3,
            color: COLORS.slate,
          },
        );
        writeText(
          pdf,
          truncateText(
            STATUS_LABELS[
              request.status
            ] ?? request.status,
            23,
          ),
          212,
          y + 5.3,
          {
            size: 6.3,
            color:
              request.status ===
              "completed"
                ? COLORS.emerald
                : request.status ===
                    "rejected"
                  ? COLORS.red
                  : COLORS.amber,
            style: "bold",
          },
        );
        writeText(
          pdf,
          age,
          260,
          y + 5.3,
          {
            size: 6.3,
            color: COLORS.slate,
          },
        );
      },
    );

    writeText(
      pdf,
      `แสดงรายการ ${offset + 1}-${Math.min(offset + rowsPerPage, sortedRequests.length)} จาก ${sortedRequests.length.toLocaleString("th-TH")} รายการ`,
      12,
      198,
      {
        size: 6.5,
        color: COLORS.muted,
      },
    );
  }
}

function addPageFooters(
  pdf: jsPDF,
  generatedAt: Date,
  startPage = 1,
): void {
  const pageCount =
    pdf.getNumberOfPages();
  const reportPageCount =
    pageCount - startPage + 1;
  const pageWidth =
    pdf.internal.pageSize.getWidth();
  const pageHeight =
    pdf.internal.pageSize.getHeight();

  for (
    let pageNumber = startPage;
    pageNumber <= pageCount;
    pageNumber += 1
  ) {
    pdf.setPage(pageNumber);
    setFill(pdf, COLORS.line);
    pdf.rect(
      12,
      pageHeight - 8,
      pageWidth - 24,
      0.3,
      "F",
    );
    writeText(
      pdf,
      `เทศบาลตำบลราไวย์ • สร้างจากระบบเมื่อ ${generatedAt.toLocaleString("th-TH")}`,
      12,
      pageHeight - 4,
      {
        size: 5.8,
        color: COLORS.muted,
      },
    );
    writeText(
      pdf,
      `หน้า ${pageNumber - startPage + 1}/${reportPageCount}`,
      pageWidth - 12,
      pageHeight - 4,
      {
        size: 5.8,
        color: COLORS.muted,
        align: "right",
      },
    );
  }
}

export async function buildExecutiveReportPdf(
  input: ExecutiveReportInput,
  options: BuildPdfOptions = {},
): Promise<jsPDF> {
  const model =
    buildExecutiveReportModel(input);
  if (input.customization?.insights) {
    model.insights =
      input.customization.insights;
  }
  if (input.customization?.recommendations) {
    model.recommendations =
      input.customization.recommendations;
  }
  const includeMemoCover =
    input.memoCover?.enabled === true;
  const memoSigners =
    input.memoCover?.signers?.length
      ? input.memoCover.signers.slice(
          0,
          4,
        )
      : input.memoCover
        ? [
            {
              name:
                input.memoCover.signerName,
              position:
                input.memoCover
                  .signerPosition,
            },
          ]
        : [];
  const hasSignatureContinuation =
    includeMemoCover &&
    memoSigners.length > 1;
  const pdf = new jsPDF({
    orientation: includeMemoCover
      ? "portrait"
      : "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });

  pdf.setProperties({
    title:
      "รายงานสรุปผลการดำเนินงานคำร้อง CCTV สำหรับผู้บริหาร",
    subject:
      `สรุปคำร้อง สถานะ ประสิทธิภาพ และประเด็นเพื่อการตัดสินใจ - ${model.periodLabel}`,
    author: "เทศบาลตำบลราไวย์",
    creator: "CCTV Rawai E-Service Portal",
    keywords:
      "CCTV, Rawai, executive report, service request, municipal operations",
  });

  await loadThaiFont(
    pdf,
    options.fontBase64,
  );

  if (
    includeMemoCover &&
    input.memoCover
  ) {
    const garudaDataUrl =
      await loadOfficialMemoAssets(
        pdf,
        options,
      );

    drawOfficialMemoCover(
      pdf,
      model,
      input.memoCover,
      garudaDataUrl,
      input.customization,
    );
    if (hasSignatureContinuation) {
      pdf.addPage(
        "a4",
        "portrait",
      );
      drawOfficialSignatureContinuation(
        pdf,
        input.memoCover,
        memoSigners.slice(1),
      );
    }
    pdf.addPage(
      "a4",
      "landscape",
    );
  }

  drawExecutiveOverview(
    pdf,
    model,
    input.customization,
  );
  pdf.addPage("a4", "landscape");
  drawOperationalAnalysis(pdf, model);
  drawRegistry(
    pdf,
    model,
    input.requests,
  );
  addPageFooters(
    pdf,
    model.generatedAt,
    includeMemoCover
      ? hasSignatureContinuation
        ? 3
        : 2
      : 1,
  );

  return pdf;
}

export async function downloadExecutiveReportPdf(
  input: ExecutiveReportInput,
): Promise<void> {
  const pdf =
    await buildExecutiveReportPdf(
      input,
    );
  const start =
    input.startDate || "all";
  const end = input.endDate || "all";

  pdf.save(
    `Rawai_CCTV_Executive_Report_${start}_${end}.pdf`,
  );
}
