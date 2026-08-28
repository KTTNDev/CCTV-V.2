export type ApiErrorCode =
  | "BAD_REQUEST"
  | "INVALID_INPUT"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "UPLOAD_INCOMPLETE"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export interface PublicApiError {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fields?: Record<string, string[]>;

  constructor(options: {
    status: number;
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, string[]>;
  }) {
    super(options.message);

    this.name = "HttpError";
    this.status = options.status;
    this.code = options.code;
    this.fields = options.fields;

    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export function createPublicApiError(
  error: HttpError,
): PublicApiError {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.fields
        ? { fields: error.fields }
        : {}),
    },
  };
}

export function normalizeUnknownError(
  error: unknown,
): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  return new HttpError({
    status: 500,
    code: "INTERNAL_ERROR",
    message:
      "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง",
  });
}