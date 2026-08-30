"use client";

import React, {
  useState,
} from "react";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  isAllowedAdminEmail,
} from "../../lib/adminEmails";
import { auth } from "../../lib/firebase";

interface AdminLoginViewProps {
  setView:
    (view: string) => void;
  onLoginSuccess: () => void;
}

function getAuthErrorCode(
  error: unknown,
): string | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof error.code !== "string"
  ) {
    return null;
  }

  return error.code;
}

function getLoginErrorMessage(
  error: unknown,
): string {
  const code =
    getAuthErrorCode(error);

  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-email":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";

    case "auth/too-many-requests":
      return "มีการพยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";

    case "auth/network-request-failed":
      return "ไม่สามารถเชื่อมต่อระบบยืนยันตัวตน กรุณาตรวจสอบอินเทอร์เน็ต";

    case "auth/popup-blocked":
      return "Browser ปิดกั้นหน้าต่างเข้าสู่ระบบ กรุณาอนุญาต Popup แล้วลองใหม่";

    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "ยกเลิกการเข้าสู่ระบบด้วย Google";

    case "auth/account-exists-with-different-credential":
      return "บัญชีนี้เคยเข้าสู่ระบบด้วยวิธีอื่น กรุณาใช้วิธีเดิม";

    default:
      return "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง";
  }
}

const AdminLoginView:
  React.FC<
    AdminLoginViewProps
  > = ({
    setView,
    onLoginSuccess,
  }) => {
    const [email, setEmail] =
      useState("");

    const [
      password,
      setPassword,
    ] = useState("");

    const [loading, setLoading] =
      useState(false);

    const [
      showPassword,
      setShowPassword,
    ] = useState(false);

    const [error, setError] =
      useState("");

    const checkAccess =
      async (
        userEmail:
          | string
          | null,
      ) => {
        if (
          isAllowedAdminEmail(
            userEmail,
          )
        ) {
          // บังคับโหลด Token ใหม่
          // เพื่อรับ Custom Claims ล่าสุด
          await auth.currentUser
            ?.getIdToken(true);

          onLoginSuccess();
          return;
        }

        await signOut(auth);

        throw new Error(
          "ADMIN_ACCESS_DENIED",
        );
      };

    const handleGoogleLogin =
      async () => {
        if (loading) {
          return;
        }

        setLoading(true);
        setError("");

        try {
          const provider =
            new GoogleAuthProvider();

          provider.setCustomParameters({
            prompt:
              "select_account",
          });

          const result =
            await signInWithPopup(
              auth,
              provider,
            );

          await checkAccess(
            result.user.email,
          );
        } catch (loginError) {
          console.warn(
            "Google admin login failed",
          );

          if (
            loginError instanceof
              Error &&
            loginError.message ===
              "ADMIN_ACCESS_DENIED"
          ) {
            setError(
              "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบเจ้าหน้าที่",
            );
          } else {
            setError(
              getLoginErrorMessage(
                loginError,
              ),
            );
          }
        } finally {
          setLoading(false);
        }
      };

    const handleEmailLogin =
      async (
        event:
          React.FormEvent,
      ) => {
        event.preventDefault();

        if (loading) {
          return;
        }

        setLoading(true);
        setError("");

        try {
          const normalizedEmail =
            email
              .trim()
              .toLowerCase();

          const result =
            await signInWithEmailAndPassword(
              auth,
              normalizedEmail,
              password,
            );

          await checkAccess(
            result.user.email,
          );
        } catch (loginError) {
          console.warn(
            "Email admin login failed",
          );

          setPassword("");

          if (
            loginError instanceof
              Error &&
            loginError.message ===
              "ADMIN_ACCESS_DENIED"
          ) {
            setError(
              "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบเจ้าหน้าที่",
            );
          } else {
            setError(
              getLoginErrorMessage(
                loginError,
              ),
            );
          }
        } finally {
          setLoading(false);
        }
      };

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-5 font-sans">
        <div className="w-full max-w-md">
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setView("home")
            }
            className="group mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
            กลับหน้าหลัก
          </button>

          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
            <header className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-8 py-9 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-blue-900 shadow-md">
                <Building2 className="h-8 w-8" />
              </div>

              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                <ShieldCheck className="h-3 w-3" />
                Authorized Staff
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                ระบบเจ้าหน้าที่
              </h1>

              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                ศูนย์กล้องวงจรปิด
                เทศบาลตำบลราไวย์
              </p>
            </header>

            <div className="space-y-6 p-7 md:p-9">
              {error && (
                <div
                  id="admin-login-error"
                  role="alert"
                  aria-live="assertive"
                  className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <p className="text-xs font-semibold leading-relaxed">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  void handleGoogleLogin();
                }}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
                ) : (
           <span
  aria-hidden="true"
  className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] font-black text-blue-600 shadow-sm"
>
  G
</span>
                )}

                เข้าสู่ระบบด้วย Google
              </button>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-100" />

                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-300">
                  หรือใช้อีเมล
                </span>

                <span className="h-px flex-1 bg-slate-100" />
              </div>

              <form
                aria-busy={loading}
                aria-describedby={
                  error
                    ? "admin-login-error"
                    : undefined
                }
                onSubmit={(event) => {
                  void handleEmailLogin(
                    event,
                  );
                }}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="admin-email"
                    className="mb-2 ml-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500"
                  >
                    อีเมลเจ้าหน้าที่
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />

                    <input
                      id="admin-email"
                      type="email"
                      required
                      autoComplete="username"
                      inputMode="email"
                      aria-invalid={
                        Boolean(error)
                      }
                      value={email}
                      disabled={loading}
                      onChange={(
                        event,
                      ) => {
                        setEmail(
                          event.target
                            .value,
                        );
                        setError("");
                      }}
                      placeholder="staff@example.com"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="mb-2 ml-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500"
                  >
                    รหัสผ่าน
                  </label>

                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />

                    <input
                      id="admin-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      required
                      minLength={6}
                      autoComplete="current-password"
                      aria-invalid={
                        Boolean(error)
                      }
                      value={password}
                      disabled={loading}
                      onChange={(
                        event,
                      ) => {
                        setPassword(
                          event.target
                            .value,
                        );
                        setError("");
                      }}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-14 text-sm font-semibold tracking-widest text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:opacity-60"
                    />

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        setShowPassword(
                          (visible) =>
                            !visible,
                        )
                      }
                      aria-label={
                        showPassword
                          ? "ซ่อนรหัสผ่าน"
                          : "แสดงรหัสผ่าน"
                      }
                      aria-pressed={
                        showPassword
                      }
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff
                          aria-hidden="true"
                          className="h-5 w-5"
                        />
                      ) : (
                        <Eye
                          aria-hidden="true"
                          className="h-5 w-5"
                        />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-900 to-emerald-700 px-5 py-4 text-sm font-bold text-white shadow-xl shadow-blue-100 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-5 w-5" />
                  )}

                  {loading
                    ? "กำลังตรวจสอบ..."
                    : "เข้าสู่ระบบ"}
                </button>
              </form>

              <p className="text-center text-[10px] leading-relaxed text-slate-400">
                สำหรับเจ้าหน้าที่ที่ได้รับอนุญาตเท่านั้น
                การใช้งานระบบจะถูกบันทึกใน
                Audit Log
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

export default AdminLoginView;
