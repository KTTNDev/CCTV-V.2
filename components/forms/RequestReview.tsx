import {
  CalendarDays,
  FileCheck,
  MapPin,
  Pencil,
  Send,
  User,
} from 'lucide-react';

import type {
  RequestWizardStep,
} from '../../lib/request-form-validation';
import type {
  FileState,
  FormDataState,
} from '../../types';

const EVENT_LABELS:
  Record<string, string> = {
    ACCIDENT: 'อุบัติเหตุจราจร',
    THEFT: 'โจรกรรม / ลักทรัพย์',
    VANDALISM: 'ทำลายทรัพย์สิน',
    DISPUTE: 'ข้อพิพาท / ทะเลาะวิวาท',
    OTHER: 'อื่น ๆ',
  };

const ACCIDENT_LABELS:
  Record<string, string> = {
    MC_VS_MC: 'รถจักรยานยนต์ชนรถจักรยานยนต์',
    MC_VS_CAR: 'รถจักรยานยนต์ชนรถยนต์',
    CAR_VS_CAR: 'รถยนต์ชนรถยนต์',
    PEDESTRIAN: 'ชนคนเดินเท้า',
    HIT_AND_RUN: 'ชนแล้วหนี',
    OTHER: 'ลักษณะอื่น ๆ',
  };

const maskIdentity = (
  value: string,
): string => {
  if (value.length <= 4) {
    return value;
  }

  return `${'•'.repeat(Math.min(10, value.length - 2))}${value.slice(-2)}`;
};

interface ReviewCardProps {
  title: string;
  step: RequestWizardStep;
  icon: typeof User;
  onEdit: (
    step: RequestWizardStep,
  ) => void;
  children: React.ReactNode;
}

const ReviewCard = ({
  title,
  step,
  icon: Icon,
  onEdit,
  children,
}: ReviewCardProps) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <header className="mb-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon
            className="h-5 w-5"
            aria-hidden="true"
          />
        </span>
        <h3 className="font-bold text-slate-900">
          {title}
        </h3>
      </div>

      <button
        type="button"
        onClick={() => onEdit(step)}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
      >
        <Pencil
          className="h-3.5 w-3.5"
          aria-hidden="true"
        />
        แก้ไข
      </button>
    </header>

    {children}
  </section>
);

interface RequestReviewProps {
  formData: FormDataState;
  files: FileState;
  onEdit: (
    step: RequestWizardStep,
  ) => void;
}

const RequestReview = ({
  formData,
  files,
  onEdit,
}: RequestReviewProps) => (
  <div className="space-y-5">
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 text-emerald-950">
      <div className="flex items-start gap-3">
        <Send
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
          aria-hidden="true"
        />
        <div>
          <h3 className="font-bold">
            ตรวจสอบข้อมูลก่อนส่ง
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-emerald-800">
            กรุณาตรวจสอบข้อมูลและชื่อไฟล์ให้ถูกต้อง เมื่อส่งแล้วระบบจะสร้างรหัสติดตามสำหรับใช้ตรวจสอบสถานะ
          </p>
        </div>
      </div>
    </div>

    <ReviewCard
      title="ข้อมูลผู้ยื่นคำร้อง"
      step={1}
      icon={User}
      onEdit={onEdit}
    >
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-slate-400">
            ชื่อ-นามสกุล
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {formData.name}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-400">
            ประเภทผู้ยื่น
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {formData.isForeigner ===
            'THAI'
              ? 'บุคคลสัญชาติไทย'
              : 'ชาวต่างชาติ'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-400">
            เอกสารประจำตัว
          </dt>
          <dd className="mt-1 font-mono font-semibold text-slate-800">
            {formData.isForeigner ===
            'THAI'
              ? maskIdentity(formData.nationalId)
              : maskIdentity(formData.passportNumber)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-400">
            เบอร์โทรศัพท์
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {formData.phone}
          </dd>
        </div>
      </dl>
    </ReviewCard>

    <ReviewCard
      title="รายละเอียดเหตุการณ์"
      step={2}
      icon={CalendarDays}
      onEdit={onEdit}
    >
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-slate-400">
            วันที่และเวลา
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {formData.eventDate}{' '}
            {formData.eventTimeStart}–{formData.eventTimeEnd} น.
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-400">
            ประเภทเหตุการณ์
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {EVENT_LABELS[
              formData.eventType
            ] ?? formData.eventType}
          </dd>
        </div>
        {formData.eventType ===
          'ACCIDENT' && (
          <>
            <div>
              <dt className="text-xs font-semibold text-slate-400">
                ลักษณะอุบัติเหตุ
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {ACCIDENT_LABELS[
                  formData.accidentSubtype ?? ''
                ] ?? formData.accidentSubtype}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-400">
                เกี่ยวข้องกับชาวต่างชาติ
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {formData.isForeignerInvolved === 'YES'
                  ? 'ใช่'
                  : 'ไม่ใช่'}
              </dd>
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <MapPin
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
            สถานที่เกิดเหตุ
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {formData.location}
          </dd>
          {formData.latitude !== null &&
            formData.longitude !== null && (
              <dd className="mt-1 font-mono text-xs text-slate-500">
                {formData.latitude.toFixed(6)}, {' '}
                {formData.longitude.toFixed(6)}
              </dd>
            )}
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold text-slate-400">
            รายละเอียด
          </dt>
          <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-slate-700">
            {formData.description}
          </dd>
        </div>
      </dl>
    </ReviewCard>

    <ReviewCard
      title="เอกสารและช่องทางรับข้อมูล"
      step={3}
      icon={FileCheck}
      onEdit={onEdit}
    >
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-xs font-semibold text-slate-400">
            เอกสารยืนยันตัวตน
          </dt>
          <dd className="mt-1 break-all font-semibold text-slate-800">
            {files.idCard?.name}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-400">
            ใบแจ้งความ
          </dt>
          <dd className="mt-1 break-all font-semibold text-slate-800">
            {files.report?.name}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-400">
            ภาพเหตุการณ์
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {files.scene.length > 0
              ? `${files.scene.length} ไฟล์`
              : 'ไม่ได้แนบ'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-400">
            ช่องทางรับข้อมูล
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {formData.deliveryMethod ===
            'LINE'
              ? 'LINE Official Account'
              : 'รับด้วยตนเองที่ศูนย์ CCTV'}
          </dd>
        </div>
      </dl>
    </ReviewCard>
  </div>
);

export default RequestReview;
