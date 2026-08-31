export type PublicCameraCategory =
  | "flood"
  | "traffic"
  | "tourism";

export interface PublicCamera {
  id: string;
  name: string;
  shortName: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  category: PublicCameraCategory;
  streamPath: string;
  status:
    | "online"
    | "offline"
    | "maintenance";
  published: boolean;
  sortOrder: number;
}

export const PUBLIC_CAMERA_CATEGORIES = [
  {
    id: "all",
    label: "ทุกหมวด",
    description: "กล้องสาธารณะทั้งหมด",
  },
  {
    id: "flood",
    label: "เฝ้าระวังน้ำท่วม",
    description: "ติดตามระดับน้ำและจุดระบายน้ำ",
  },
  {
    id: "traffic",
    label: "การจราจร",
    description: "ตรวจสอบสภาพถนนและความหนาแน่น",
  },
  {
    id: "tourism",
    label: "แหล่งท่องเที่ยว",
    description: "ชมบรรยากาศสถานที่สาธารณะ",
  },
] as const;

/**
 * รายการนี้มีเฉพาะกล้องที่ได้รับอนุมัติให้เผยแพร่ต่อสาธารณะ
 * streamPath เป็นชื่อเส้นทางบน Media Gateway ไม่ใช่ RTSP URL ของกล้อง
 */
export const PUBLIC_CAMERAS:
  PublicCamera[] = [
    {
      id: "flood-01",
      name: "จุดเฝ้าระวังน้ำท่วม ถนนวิเศษ",
      shortName: "ถนนวิเศษ",
      location: "แนวถนนวิเศษ ตำบลราไวย์",
      latitude: null,
      longitude: null,
      description: "ใช้ประเมินน้ำรอการระบายและสภาพการสัญจรในช่วงฝนตก",
      category: "flood",
      streamPath: "public/flood-01",
      status: "online",
      published: true,
      sortOrder: 10,
    },
    {
      id: "flood-02",
      name: "จุดเฝ้าระวังน้ำท่วม ซอยไสยวน",
      shortName: "ซอยไสยวน",
      location: "พื้นที่ซอยไสยวน ตำบลราไวย์",
      latitude: null,
      longitude: null,
      description: "ติดตามสภาพน้ำและการระบายในพื้นที่ชุมชน",
      category: "flood",
      streamPath: "public/flood-02",
      status: "online",
      published: true,
      sortOrder: 20,
    },
    {
      id: "traffic-01",
      name: "สภาพการจราจร แยกไสยวน",
      shortName: "แยกไสยวน",
      location: "แยกไสยวน ตำบลราไวย์",
      latitude: null,
      longitude: null,
      description: "ตรวจสอบความหนาแน่นและวางแผนเส้นทางก่อนเดินทาง",
      category: "traffic",
      streamPath: "public/traffic-01",
      status: "online",
      published: true,
      sortOrder: 30,
    },
    {
      id: "traffic-02",
      name: "สภาพการจราจร วงเวียนราไวย์",
      shortName: "วงเวียนราไวย์",
      location: "วงเวียนหาดราไวย์",
      latitude: null,
      longitude: null,
      description: "ติดตามปริมาณรถบริเวณทางเชื่อมชายหาดและชุมชน",
      category: "traffic",
      streamPath: "public/traffic-02",
      status: "online",
      published: true,
      sortOrder: 40,
    },
    {
      id: "tourism-01",
      name: "บรรยากาศแหลมพรหมเทพ",
      shortName: "แหลมพรหมเทพ",
      location: "แหลมพรหมเทพ จังหวัดภูเก็ต",
      latitude: null,
      longitude: null,
      description: "ภาพบรรยากาศและสภาพอากาศบริเวณจุดชมวิวสาธารณะ",
      category: "tourism",
      streamPath: "public/tourism-01",
      status: "online",
      published: true,
      sortOrder: 50,
    },
    {
      id: "tourism-02",
      name: "บรรยากาศหาดในหาน",
      shortName: "หาดในหาน",
      location: "หาดในหาน ตำบลราไวย์",
      latitude: null,
      longitude: null,
      description: "ภาพรวมพื้นที่ชายหาดเพื่อประกอบการวางแผนเดินทาง",
      category: "tourism",
      streamPath: "public/tourism-02",
      status: "online",
      published: true,
      sortOrder: 60,
    },
    {
      id: "tourism-03",
      name: "บรรยากาศท่าเทียบเรือราไวย์",
      shortName: "ท่าเทียบเรือราไวย์",
      location: "ท่าเทียบเรือหาดราไวย์",
      latitude: null,
      longitude: null,
      description: "ติดตามสภาพพื้นที่สาธารณะและบรรยากาศบริเวณท่าเรือ",
      category: "tourism",
      streamPath: "public/tourism-03",
      status: "online",
      published: true,
      sortOrder: 70,
    },
  ];

export function getPublicStreamGatewayUrl():
  string {
  return (
    process.env
      .NEXT_PUBLIC_STREAM_GATEWAY_URL ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");
}

export function buildPublicCameraUrl(
  camera: PublicCamera,
): string | null {
  const gateway =
    getPublicStreamGatewayUrl();

  if (!gateway) {
    return null;
  }

  const path = camera.streamPath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${gateway}/${path}?controls=true&muted=true&autoplay=true&playsInline=true&disablepictureinpicture=false`;
}

function readString(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string"
    ? value.trim()
    : fallback;
}

function sanitizePublicText(
  value: unknown,
  fallback = "",
) {
  const text = readString(
    value,
    fallback,
  );

  return text
    .replace(
      /\brtsp:\/\/\S+/gi,
      "",
    )
    .replace(
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function normalizePublicCamera(
  id: string,
  value: Record<string, unknown>,
): PublicCamera | null {
  const category =
    value.category;
  const status = value.status;
  const name = sanitizePublicText(
    value.name,
  );
  const location = sanitizePublicText(
    value.location,
  );
  const streamPath = readString(
    value.streamPath,
  );

  if (
    !name ||
    !location ||
    !streamPath ||
    ![
      "flood",
      "traffic",
      "tourism",
    ].includes(String(category)) ||
    ![
      "online",
      "offline",
      "maintenance",
    ].includes(String(status))
  ) {
    return null;
  }

  return {
    id,
    name,
    shortName:
      sanitizePublicText(
        value.shortName,
        name,
      ),
    location,
    latitude:
      typeof value.latitude === "number" &&
      Number.isFinite(value.latitude)
        ? value.latitude
        : null,
    longitude:
      typeof value.longitude === "number" &&
      Number.isFinite(value.longitude)
        ? value.longitude
        : null,
    description:
      sanitizePublicText(
        value.description,
      ),
    category:
      category as PublicCameraCategory,
    streamPath,
    status:
      status as PublicCamera["status"],
    published:
      value.published === true,
    sortOrder:
      typeof value.sortOrder ===
      "number"
        ? value.sortOrder
        : 9999,
  };
}
