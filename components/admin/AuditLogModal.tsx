"use client";

import React, {
  useEffect,
  useState,
} from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  FileClock,
  Loader2,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../../lib/firebase";
import {
  formatDateTime,
  STATUS_TH,
} from "./utils/formatters";

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AuditActor {
  uid: string;
  email: string | null;
  role: string;
}

interface AuditLogEntry {
  id: string;
  requestId: string;
  trackingId: string | null;

  previousStatus: string;
  newStatus: string;

  note: string;
  action: string;

  actor: AuditActor;
  apiRequestId: string | null;

  createdAt: unknown;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getString(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string"
    ? value.trim()
    : fallback;
}

function normalizeAuditLog(
  id: string,
  data: Record<string, unknown>,
): AuditLogEntry {
  const actorData =
    isRecord(data.actor)
      ? data.actor
      : {};

  return {
    id,

    requestId:
      getString(data.requestId),

    trackingId:
      getString(
        data.trackingId,
      ) || null,

    previousStatus:
      getString(
        data.previousStatus,
        "unknown",
      ),

    newStatus:
      getString(
        data.newStatus,
        "unknown",
      ),

    note:
      getString(data.note) ||
      "ไม่มีหมายเหตุ",

    action:
      getString(
        data.action,
        "request.status_updated",
      ),

    actor: {
      uid:
        getString(actorData.uid) ||
        "unknown",

      email:
        getString(
          actorData.email,
        ) || null,

      role:
        getString(
          actorData.role,
          "unknown",
        ),
    },

    apiRequestId:
      getString(
        data.apiRequestId,
      ) || null,

    createdAt:
      data.createdAt ?? null,
  };
}

export const AuditLogModal:
  React.FC<AuditLogModalProps> = ({
    isOpen,
    onClose,
  }) => {
    const [logs, setLogs] =
      useState<AuditLogEntry[]>(
        [],
      );

    const [loading, setLoading] =
      useState(false);

    const [error, setError] =
      useState("");

    useEffect(() => {
      if (!isOpen) {
        return;
      }

      setLoading(true);
      setError("");

      const auditQuery = query(
        collection(
          db,
          "audit_logs",
        ),
        orderBy(
          "createdAt",
          "desc",
        ),
        limit(100),
      );

      const unsubscribe =
        onSnapshot(
          auditQuery,
          (snapshot) => {
            const nextLogs =
              snapshot.docs.map(
                (document) =>
                  normalizeAuditLog(
                    document.id,
                    document.data(),
                  ),
              );

            setLogs(nextLogs);
            setLoading(false);
          },
          (snapshotError) => {
            console.warn(
              "Audit log listener failed:",
              snapshotError,
            );

            setError(
              "ไม่สามารถโหลด Audit Log ได้ กรุณาตรวจสอบบัญชี Admin และ Firestore Rules",
            );

            setLoading(false);
          },
        );

      return unsubscribe;
    }, [isOpen]);

    useEffect(() => {
      if (!isOpen) {
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      const handleKeyDown = (
        event: KeyboardEvent,
      ) => {
        if (
          event.key === "Escape"
        ) {
          onClose();
        }
      };

      window.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        document.body.style.overflow =
          previousOverflow;

        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    }, [isOpen, onClose]);

    if (!isOpen) {
      return null;
    }

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-log-title"
        className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-md md:p-8"
      >
        <button
          type="button"
          aria-label="ปิด Audit Log"
          onClick={onClose}
          className="absolute inset-0 cursor-default"
        />

        <div className="relative z-10 flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/20 bg-slate-50 shadow-2xl">
          <header className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-5 md:px-8 md:py-6">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />

                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                  Security Audit
                </span>
              </div>

              <h2
                id="audit-log-title"
                className="text-xl font-bold text-slate-950 md:text-2xl"
              >
                ประวัติการจัดการคำร้อง
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                แสดงรายการล่าสุดไม่เกิน
                100 รายการ
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="overflow-y-auto p-4 md:p-6">
            {loading && (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />

                <p className="text-xs font-semibold">
                  กำลังโหลด Audit
                  Log...
                </p>
              </div>
            )}

            {!loading && error && (
              <div
                role="alert"
                className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700"
              >
                <AlertCircle className="h-8 w-8" />

                <p className="max-w-lg text-sm font-semibold">
                  {error}
                </p>
              </div>
            )}

            {!loading &&
              !error &&
              logs.length === 0 && (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white text-center text-slate-400">
                  <FileClock className="h-10 w-10 opacity-40" />

                  <div>
                    <p className="text-sm font-bold">
                      ยังไม่มี Audit
                      Log
                    </p>

                    <p className="mt-1 text-xs">
                      รายการจะปรากฏเมื่อ
                      Admin เปลี่ยนสถานะคำร้อง
                    </p>
                  </div>
                </div>
              )}

            {!loading &&
              !error &&
              logs.length > 0 && (
                <div className="space-y-3">
                  {logs.map(
                    (log) => (
                      <article
                        key={log.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md md:p-5"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-blue-50 px-3 py-1 font-mono text-[10px] font-bold text-blue-800">
                                {log.trackingId ??
                                  log.requestId}
                              </span>

                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold text-slate-500">
                                {log.action}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600">
                                {STATUS_TH[
                                  log
                                    .previousStatus
                                ] ??
                                  log
                                    .previousStatus}
                              </span>

                              <ArrowRight className="h-4 w-4 text-slate-300" />

                              <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-800">
                                {STATUS_TH[
                                  log
                                    .newStatus
                                ] ??
                                  log
                                    .newStatus}
                              </span>
                            </div>

                            <p className="mt-3 text-xs leading-relaxed text-slate-600">
                              {log.note}
                            </p>
                          </div>

                          <div className="shrink-0 rounded-xl border border-slate-100 bg-slate-50 p-3 md:min-w-56">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-slate-400" />

                              <div className="min-w-0">
                                <p className="truncate text-[10px] font-bold text-slate-700">
                                  {log.actor
                                    .email ??
                                    log.actor
                                      .uid}
                                </p>

                                <p className="text-[9px] uppercase text-slate-400">
                                  {
                                    log.actor
                                      .role
                                  }
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3">
                              <Activity className="h-3.5 w-3.5 text-slate-400" />

                              <p className="text-[10px] font-medium text-slate-500">
                                {formatDateTime(
                                  log.createdAt,
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {log.apiRequestId && (
                          <p className="mt-3 border-t border-slate-100 pt-3 font-mono text-[8px] text-slate-300">
                            Ref:{" "}
                            {
                              log.apiRequestId
                            }
                          </p>
                        )}
                      </article>
                    ),
                  )}
                </div>
              )}
          </div>
        </div>
      </div>
    );
  };