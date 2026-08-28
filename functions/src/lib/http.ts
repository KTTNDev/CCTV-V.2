import { randomUUID } from "node:crypto";

import { logger } from "firebase-functions";

import {
  createPublicApiError,
  HttpError,
  normalizeUnknownError,
} from "./http-error";

export interface ApiRequest {
  method: string;
  body: unknown;
  ip?: string;
  get(name: string): string | undefined;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): ApiResponse;
  set(name: string, value: string): ApiResponse;
}

export interface ApiHandlerContext {
  requestId: string;
}

export interface ApiHandlerResult<T> {
  status?: number;
  data: T;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId: string;
}

interface HandleApiRequestOptions<T> {
  request: ApiRequest;
  response: ApiResponse;
  allowedMethods: readonly string[];
  handler(
    context: ApiHandlerContext,
  ): Promise<ApiHandlerResult<T>>;
}

function createRequestId(
  request: ApiRequest,
): string {
  const suppliedRequestId = request.get("X-Request-Id");

  if (
    suppliedRequestId &&
    /^[a-zA-Z0-9_-]{8,80}$/.test(suppliedRequestId)
  ) {
    return suppliedRequestId;
  }

  return randomUUID();
}

function setCommonHeaders(
  response: ApiResponse,
): void {
  response.set(
    "Content-Type",
    "application/json; charset=utf-8",
  );
  response.set("Cache-Control", "no-store");
  response.set("Pragma", "no-cache");
  response.set("X-Content-Type-Options", "nosniff");
  response.set("Referrer-Policy", "no-referrer");
}

function writeErrorLog(
  requestId: string,
  request: ApiRequest,
  error: HttpError,
  originalError: unknown,
): void {
  const metadata = {
    requestId,
    method: request.method,
    status: error.status,
    code: error.code,
  };

  if (error.status >= 500) {
    logger.error(
      "Unhandled API error",
      originalError instanceof Error
        ? {
            ...metadata,
            errorName: originalError.name,
            stack: originalError.stack,
          }
        : metadata,
    );

    return;
  }

  logger.warn("API request rejected", metadata);
}

export async function handleApiRequest<T>(
  options: HandleApiRequestOptions<T>,
): Promise<void> {
  const {
    request,
    response,
    allowedMethods,
    handler,
  } = options;

  const requestId = createRequestId(request);

  setCommonHeaders(response);

  try {
    const method = request.method.toUpperCase();

    if (!allowedMethods.includes(method)) {
      response.set("Allow", allowedMethods.join(", "));

      throw new HttpError({
        status: 405,
        code: "METHOD_NOT_ALLOWED",
        message: "HTTP method นี้ไม่รองรับ",
      });
    }

    const result = await handler({ requestId });

    const responseBody: ApiSuccess<T> = {
      success: true,
      data: result.data,
      requestId,
    };

    response
      .status(result.status ?? 200)
      .json(responseBody);
  } catch (originalError) {
    const error =
      normalizeUnknownError(originalError);

    writeErrorLog(
      requestId,
      request,
      error,
      originalError,
    );

    response.status(error.status).json({
      ...createPublicApiError(error),
      requestId,
    });
  }
}