import {
  Building2,
  Clock3,
  LockKeyhole,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";

const CONTACT_PHONE =
  "076613801";

interface FooterProps {
  onAdminClick?: () => void;
}

const Footer = ({
  onAdminClick,
}: FooterProps) => (
  <footer aria-label="ข้อมูลหน่วยงาน" className="relative z-[110] border-t border-slate-200 bg-white">
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr_1fr]">
        <section>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-900 text-white shadow-lg shadow-teal-100">
              <ShieldCheck
                className="h-5 w-5"
                aria-hidden="true"
              />
            </div>

            <div>
              <p className="font-bold tracking-tight text-slate-950">
                CCTV RAWAI
              </p>

              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-600">
                E-Service Portal
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-md text-sm leading-7 text-slate-500">
            ระบบบริการประชาชนออนไลน์
            สำหรับยื่นคำร้องขอข้อมูลภาพกล้องวงจรปิด
            สะดวก ปลอดภัย และตรวจสอบสถานะได้
          </p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-slate-950">
            ติดต่อหน่วยงาน
          </h2>

          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-3">
              <Building2
                className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
                aria-hidden="true"
              />

              <p className="text-sm leading-6 text-slate-600">
                ศูนย์ควบคุมและสั่งการระบบ
                CCTV
                <br />
                เทศบาลตำบลราไวย์
              </p>
            </div>

            <a
              href={`tel:${CONTACT_PHONE}`}
              className="group flex items-center gap-3 rounded-xl text-sm font-semibold text-slate-600 transition hover:text-teal-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
              aria-label="โทรศัพท์ติดต่อเทศบาลตำบลราไวย์ 076 613 801"
            >
              <PhoneCall
                className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-teal-600"
                aria-hidden="true"
              />

              076 613 801
            </a>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-slate-950">
            เวลาทำการ
          </h2>

          <div className="mt-5 flex items-start gap-3">
            <Clock3
              className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
              aria-hidden="true"
            />

            <div>
              <p className="text-sm font-semibold text-slate-700">
                จันทร์–ศุกร์
              </p>

              <p className="mt-1 text-sm text-slate-500">
                08.30–16.30 น.
              </p>

              <p className="mt-2 text-xs text-slate-400">
                ยกเว้นวันหยุดราชการ
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-700">
              ระบบยื่นคำร้องออนไลน์เปิดให้บริการ
              24 ชั่วโมง
            </p>
          </div>
        </section>
      </div>

      <div className="mt-10 flex flex-col gap-4 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()}{" "}
          เทศบาลตำบลราไวย์
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <p>
            ดูแลระบบโดยฝ่ายนโยบายและแผน
          </p>

          {onAdminClick && (
            <button
              type="button"
              onClick={onAdminClick}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1 font-semibold text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-100"
            >
              <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
              สำหรับเจ้าหน้าที่
            </button>
          )}
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
