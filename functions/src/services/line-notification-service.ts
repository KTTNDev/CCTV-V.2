const LINE_PUSH_ENDPOINT =
  "https://api.line.me/v2/bot/message/push";

const ADMIN_PORTAL_URL =
  "https://db-rawaicctv.web.app/";

const REQUEST_TIMEOUT_MS =
  10_000;

export interface LineNewRequestNotification {
  trackingId: string;
  eventType: string;
  eventDate: string;
  eventTimeStart: string;
  eventTimeEnd: string;
  location: string;

  /**
   * UUID ที่เก็บไว้กับ Outbox Job
   * ต้องใช้ค่าเดิมเมื่อส่งซ้ำ
   */
  retryKey: string;
}

export interface LinePushResult {
  lineRequestId: string | null;
}

export class LineMessagingApiError
  extends Error {
  readonly status: number;
  readonly lineRequestId:
    | string
    | null;

  constructor(options: {
    status: number;
    message: string;
    lineRequestId:
      | string
      | null;
  }) {
    super(options.message);

    this.name =
      "LineMessagingApiError";

    this.status =
      options.status;

    this.lineRequestId =
      options.lineRequestId;

    Object.setPrototypeOf(
      this,
      LineMessagingApiError.prototype,
    );
  }
}

function sanitizeText(
  value: string,
  maximumLength: number,
  fallback: string,
): string {
  const normalized = value
    .replace(
      /[\u0000-\u001F\u007F]/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);

  return normalized || fallback;
}

function getEventPresentation(
  eventType: string,
): {
  label: string;
  color: string;
} {
  switch (eventType) {
    case "ACCIDENT":
      return {
        label:
          "อุบัติเหตุจราจร",
        color: "#DC2626",
      };

    case "THEFT":
      return {
        label:
          "โจรกรรม / ลักทรัพย์",
        color: "#B91C1C",
      };

    case "VANDALISM":
      return {
        label:
          "ทำลายทรัพย์สิน",
        color: "#D97706",
      };

    case "DISPUTE":
      return {
        label:
          "ข้อพิพาท / ทะเลาะวิวาท",
        color: "#EA580C",
      };

    default:
      return {
        label:
          "เหตุการณ์อื่น ๆ",
        color: "#2563EB",
      };
  }
}

function createFlexMessage(
  input:
    LineNewRequestNotification,
): Record<string, unknown> {
  const event =
    getEventPresentation(
      input.eventType,
    );

  const trackingId =
    sanitizeText(
      input.trackingId,
      128,
      "-",
    );

  const location =
    sanitizeText(
      input.location,
      300,
      "ไม่ระบุสถานที่",
    );

  const eventDate =
    sanitizeText(
      input.eventDate,
      20,
      "-",
    );

  const startTime =
    sanitizeText(
      input.eventTimeStart,
      10,
      "-",
    );

  const endTime =
    sanitizeText(
      input.eventTimeEnd,
      10,
      "-",
    );

  return {
    type: "flex",

    altText:
      `คำร้อง CCTV ใหม่: ` +
      event.label,

    contents: {
      type: "bubble",

      body: {
        type: "box",
        layout: "vertical",

        contents: [
          {
            type: "text",
            text:
              "คำร้องขอ CCTV ใหม่",
            weight: "bold",
            size: "lg",
            color: event.color,
          },
          {
            type: "text",
            text: event.label,
            weight: "bold",
            size: "xl",
            margin: "xs",
            color: "#0F172A",
            wrap: true,
          },
          {
            type: "separator",
            margin: "lg",
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "md",

            contents: [
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",

                contents: [
                  {
                    type: "text",
                    text: "ID",
                    color:
                      "#94A3B8",
                    size: "sm",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text:
                      trackingId,
                    wrap: true,
                    color:
                      "#334155",
                    size: "sm",
                    flex: 4,
                    weight: "bold",
                  },
                ],
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",

                contents: [
                  {
                    type: "text",
                    text: "สถานที่",
                    color:
                      "#94A3B8",
                    size: "sm",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text:
                      location,
                    wrap: true,
                    color:
                      "#334155",
                    size: "sm",
                    flex: 4,
                  },
                ],
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",

                contents: [
                  {
                    type: "text",
                    text: "เวลา",
                    color:
                      "#94A3B8",
                    size: "sm",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text:
                      `${eventDate} ` +
                      `(${startTime}–${endTime})`,
                    wrap: true,
                    color:
                      "#334155",
                    size: "sm",
                    flex: 4,
                  },
                ],
              },
            ],
          },
        ],
      },

      footer: {
        type: "box",
        layout: "vertical",

        contents: [
          {
            type: "button",
            style: "primary",
            color: event.color,
            height: "sm",

            action: {
              type: "uri",
              label:
                "เข้าสู่ระบบเจ้าหน้าที่",
              uri:
                ADMIN_PORTAL_URL,
            },
          },
        ],
      },
    },
  };
}

function getRequiredSecret(
  name:
    | "LINE_CHANNEL_ACCESS_TOKEN"
    | "LINE_ADMIN_USER_ID",
): string {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} secret is missing`,
    );
  }

  return value;
}

async function getLineErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const body =
      await response.json();

    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message ===
        "string"
    ) {
      return body.message
        .trim()
        .slice(0, 300);
    }
  } catch {
    // ใช้ข้อความทั่วไปด้านล่าง
  }

  return (
    "LINE Messaging API " +
    "ปฏิเสธคำขอ"
  );
}

export async function sendLineNewRequestNotification(
  input:
    LineNewRequestNotification,
): Promise<LinePushResult> {
  const accessToken =
    getRequiredSecret(
      "LINE_CHANNEL_ACCESS_TOKEN",
    );

  const recipientId =
    getRequiredSecret(
      "LINE_ADMIN_USER_ID",
    );

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response =
      await fetch(
        LINE_PUSH_ENDPOINT,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${accessToken}`,

            "X-Line-Retry-Key":
              input.retryKey,
          },

          body: JSON.stringify({
            to: recipientId,

            messages: [
              createFlexMessage(
                input,
              ),
            ],

            notificationDisabled:
              false,
          }),

          signal:
            controller.signal,
        },
      );

  const lineRequestId =
  response.headers.get(
    "x-line-request-id",
  );

const acceptedRequestId =
  response.headers.get(
    "x-line-accepted-request-id",
  );

/**
 * LINE ตอบ 409 เมื่อ Retry Key นี้
 * เคยถูกยอมรับและส่งสำเร็จแล้ว
 * จึงต้องถือว่างานสำเร็จเพื่อป้องกัน
 * การส่งข้อความซ้ำ
 */
if (
  response.status === 409 &&
  acceptedRequestId
) {
  return {
    lineRequestId:
      acceptedRequestId,
  };
}

if (!response.ok) {
  throw new LineMessagingApiError({
    status:
      response.status,

    message:
      await getLineErrorMessage(
        response,
      ),

    lineRequestId,
  });
}

return {
  lineRequestId,
};
  } finally {
    clearTimeout(timeout);
  }
}