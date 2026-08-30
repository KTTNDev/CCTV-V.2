import {
  Check,
  X,
} from 'lucide-react';

const STEPS = [
  {
    number: 1,
    label: 'รับคำร้อง',
  },
  {
    number: 2,
    label: 'ตรวจสอบ',
  },
  {
    number: 3,
    label: 'ค้นหาภาพ',
  },
  {
    number: 4,
    label: 'แจ้งผล',
  },
] as const;

function getCurrentStep(
  status: string,
): number {
  if (
    status === 'completed' ||
    status === 'rejected'
  ) {
    return 4;
  }

  if (status === 'searching') {
    return 3;
  }

  if (
    status === 'verifying' ||
    status ===
      'waiting_for_information'
  ) {
    return 2;
  }

  return 1;
}

interface TrackingProgressProps {
  status: string;
  statusHistory?: Array<{
    status: string;
  }>;
}

export const TrackingProgress = ({
  status,
  statusHistory = [],
}: TrackingProgressProps) => {
  const currentStep =
    getCurrentStep(status);
  const isRejected =
    status === 'rejected';
  const furthestVisitedStep =
    Math.max(
      1,
      ...statusHistory
        .filter(
          (item) =>
            item.status !==
            'rejected',
        )
        .map((item) =>
          getCurrentStep(
            item.status,
          ),
        ),
    );

  return (
    <section
      aria-labelledby="tracking-progress-title"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Process
          </p>
          <h3
            id="tracking-progress-title"
            className="mt-1 font-bold text-slate-900"
          >
            ขั้นตอนการดำเนินงาน
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500">
          ขั้น {currentStep} จาก 4
        </span>
      </div>

      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((step) => {
          const isCurrent =
            step.number === currentStep;
          const isCompleted =
            isRejected
              ? step.number <=
                furthestVisitedStep
              : step.number <
                  currentStep ||
                (step.number === 4 &&
                  status === 'completed');
          const isRejectedStep =
            isRejected &&
            step.number === 4;

          return (
            <li
              key={step.number}
              aria-current={
                isCurrent
                  ? 'step'
                  : undefined
              }
              className="relative text-center"
            >
              {step.number > 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${
                    step.number <=
                    (isRejected
                      ? furthestVisitedStep
                      : currentStep)
                      ? 'bg-emerald-300'
                      : isRejectedStep
                        ? 'bg-red-300'
                      : 'bg-slate-200'
                  }`}
                />
              )}

              <span
                className={`relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${
                  isRejectedStep
                    ? 'border-red-500 bg-red-500 text-white'
                    : isCurrent ||
                        isCompleted
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {isRejectedStep ? (
                  <X className="h-4 w-4" aria-hidden="true" />
                ) : isCompleted ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  step.number
                )}
              </span>

              <span
                className={`mt-2 block text-[9px] font-bold leading-tight sm:text-[11px] ${
                  isCurrent
                    ? isRejectedStep
                      ? 'text-red-700'
                      : 'text-slate-900'
                    : isCompleted
                      ? 'text-emerald-700'
                      : 'text-slate-400'
                }`}
              >
                {isRejectedStep
                  ? 'ปิดคำร้อง'
                  : step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
