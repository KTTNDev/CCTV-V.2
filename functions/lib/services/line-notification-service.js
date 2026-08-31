"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineMessagingApiError = void 0;
exports.createAdminRequestUrl = createAdminRequestUrl;
exports.createLineNewRequestMessage = createLineNewRequestMessage;
exports.sendLineNewRequestNotification = sendLineNewRequestNotification;
const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";
const DEFAULT_STAFF_PORTAL_URL = "https://db-rawaicctv.web.app/";
const REQUEST_TIMEOUT_MS = 10_000;
class LineMessagingApiError extends Error {
    status;
    lineRequestId;
    constructor(options) {
        super(options.message);
        this.name = "LineMessagingApiError";
        this.status = options.status;
        this.lineRequestId = options.lineRequestId;
        Object.setPrototypeOf(this, LineMessagingApiError.prototype);
    }
}
exports.LineMessagingApiError = LineMessagingApiError;
function sanitizeText(value, maximumLength, fallback) {
    const normalized = value
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maximumLength);
    return normalized || fallback;
}
function getEventPresentation(eventType) {
    switch (eventType) {
        case "ACCIDENT":
            return {
                label: "อุบัติเหตุจราจร",
                color: "#DC2626",
            };
        case "THEFT":
            return {
                label: "โจรกรรม / ลักทรัพย์",
                color: "#B91C1C",
            };
        case "VANDALISM":
            return {
                label: "ทำลายทรัพย์สิน",
                color: "#D97706",
            };
        case "DISPUTE":
            return {
                label: "ข้อพิพาท / ทะเลาะวิวาท",
                color: "#EA580C",
            };
        default:
            return {
                label: "เหตุการณ์อื่น ๆ",
                color: "#2563EB",
            };
    }
}
function formatThaiDateTime(value) {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return sanitizeText(value, 40, "-");
    }
    return new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
    }).format(parsedDate);
}
function getStaffPortalBaseUrl() {
    const configuredUrl = process.env.STAFF_PORTAL_BASE_URL?.trim() ||
        DEFAULT_STAFF_PORTAL_URL;
    const parsedUrl = new URL(configuredUrl);
    if (parsedUrl.protocol !== "https:" &&
        parsedUrl.protocol !== "http:") {
        throw new Error("STAFF_PORTAL_BASE_URL must use HTTP or HTTPS");
    }
    return parsedUrl.toString();
}
function createAdminRequestUrl(requestId, baseUrl = DEFAULT_STAFF_PORTAL_URL) {
    const parsedUrl = new URL(baseUrl);
    parsedUrl.searchParams.set("adminRequest", requestId);
    return parsedUrl.toString();
}
function createDetailRow(label, value) {
    return {
        type: "box",
        layout: "baseline",
        spacing: "sm",
        contents: [
            {
                type: "text",
                text: label,
                color: "#94A3B8",
                size: "sm",
                flex: 2,
            },
            {
                type: "text",
                text: value,
                wrap: true,
                color: "#334155",
                size: "sm",
                flex: 5,
            },
        ],
    };
}
/**
 * สร้างเฉพาะข้อมูลที่เจ้าหน้าที่จำเป็นต้องใช้คัดกรองงาน
 * ห้ามเพิ่มเลขบัตรประชาชน อีเมล เบอร์โทร หรือ URL ไฟล์แนบในข้อความ LINE
 */
function createLineNewRequestMessage(input, portalBaseUrl = DEFAULT_STAFF_PORTAL_URL) {
    const event = getEventPresentation(input.eventType);
    const trackingId = sanitizeText(input.trackingId, 128, "-");
    const location = sanitizeText(input.location, 300, "ไม่ระบุสถานที่");
    const eventDate = sanitizeText(input.eventDate, 20, "-");
    const startTime = sanitizeText(input.eventTimeStart, 10, "-");
    const endTime = sanitizeText(input.eventTimeEnd, 10, "-");
    const submittedAt = formatThaiDateTime(input.submittedAt);
    const requestUrl = createAdminRequestUrl(input.requestId, portalBaseUrl);
    return {
        type: "flex",
        altText: `มีคำร้อง CCTV ใหม่ ${trackingId}: ` +
            event.label,
        contents: {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "มีคำร้อง CCTV ใหม่",
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
                            createDetailRow("เลขคำร้อง", trackingId),
                            createDetailRow("สถานะ", "รอตรวจสอบคำร้อง"),
                            createDetailRow("สถานที่", location),
                            createDetailRow("เวลาเหตุ", `${eventDate} (${startTime}–${endTime})`),
                            createDetailRow("รับเรื่องเมื่อ", submittedAt),
                        ],
                    },
                    {
                        type: "text",
                        text: "เข้าสู่ระบบก่อน ระบบจะเปิดคำร้องนี้ให้โดยตรง",
                        size: "xs",
                        color: "#64748B",
                        margin: "lg",
                        wrap: true,
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
                            label: "เปิดคำร้องนี้",
                            uri: requestUrl,
                        },
                    },
                ],
            },
        },
    };
}
function getRequiredSecret(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} secret is missing`);
    }
    return value;
}
function getNotificationTargetId() {
    const value = process.env.LINE_NOTIFICATION_TARGET_ID?.trim() ||
        process.env.LINE_ADMIN_USER_ID?.trim();
    if (!value) {
        throw new Error("LINE_NOTIFICATION_TARGET_ID secret is missing");
    }
    return value;
}
async function getLineErrorMessage(response) {
    try {
        const body = await response.json();
        if (typeof body === "object" &&
            body !== null &&
            "message" in body &&
            typeof body.message === "string") {
            return body.message.trim().slice(0, 300);
        }
    }
    catch {
        // ใช้ข้อความทั่วไปด้านล่าง
    }
    return "LINE Messaging API ปฏิเสธคำขอ";
}
async function sendLineNewRequestNotification(input) {
    const accessToken = getRequiredSecret("LINE_CHANNEL_ACCESS_TOKEN");
    const recipientId = getNotificationTargetId();
    const portalBaseUrl = getStaffPortalBaseUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(LINE_PUSH_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                "X-Line-Retry-Key": input.retryKey,
            },
            body: JSON.stringify({
                to: recipientId,
                messages: [
                    createLineNewRequestMessage(input, portalBaseUrl),
                ],
                notificationDisabled: false,
            }),
            signal: controller.signal,
        });
        const lineRequestId = response.headers.get("x-line-request-id");
        const acceptedRequestId = response.headers.get("x-line-accepted-request-id");
        /**
         * LINE ตอบ 409 เมื่อ Retry Key นี้เคยถูกยอมรับแล้ว
         * จึงถือว่างานสำเร็จเพื่อป้องกันข้อความซ้ำ
         */
        if (response.status === 409 &&
            acceptedRequestId) {
            return {
                lineRequestId: acceptedRequestId,
            };
        }
        if (!response.ok) {
            throw new LineMessagingApiError({
                status: response.status,
                message: await getLineErrorMessage(response),
                lineRequestId,
            });
        }
        return {
            lineRequestId,
        };
    }
    finally {
        clearTimeout(timeout);
    }
}
//# sourceMappingURL=line-notification-service.js.map