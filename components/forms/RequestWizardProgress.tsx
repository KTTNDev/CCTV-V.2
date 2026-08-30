import {
  Check,
} from 'lucide-react';

import type {
  RequestWizardStep,
} from '../../lib/request-form-validation';

const STEPS: Array<{
  number: RequestWizardStep;
  label: string;
  shortLabel: string;
}> = [
  {
    number: 1,
    label: 'ข้อมูลผู้ยื่น',
    shortLabel: 'ผู้ยื่น',
  },
  {
    number: 2,
    label: 'รายละเอียดเหตุการณ์',
    shortLabel: 'เหตุการณ์',
  },
  {
    number: 3,
    label: 'เอกสารและการรับไฟล์',
    shortLabel: 'เอกสาร',
  },
  {
    number: 4,
    label: 'ตรวจสอบและยืนยัน',
    shortLabel: 'ยืนยัน',
  },
];

interface RequestWizardProgressProps {
  currentStep: RequestWizardStep;
  maxReachedStep: RequestWizardStep;
  onStepSelect: (
    step: RequestWizardStep,
  ) => void;
}

const RequestWizardProgress = ({
  currentStep,
  maxReachedStep,
  onStepSelect,
}: RequestWizardProgressProps) => (
  <nav
    aria-label="ขั้นตอนการยื่นคำร้อง"
    className="border-b border-slate-100 bg-white px-4 py-5 sm:px-8"
  >
    <ol className="mx-auto grid max-w-4xl grid-cols-4 gap-2 sm:gap-4">
      {STEPS.map((step) => {
        const isCurrent =
          step.number === currentStep;
        const isCompleted =
          step.number < currentStep ||
          step.number < maxReachedStep;
        const canOpen =
          step.number <= maxReachedStep;

        return (
          <li
            key={step.number}
            className="relative"
          >
            {step.number > 1 && (
              <div
                aria-hidden="true"
                className={`absolute right-1/2 top-4 h-px w-full -translate-y-1/2 sm:top-5 ${
                  isCompleted
                    ? 'bg-emerald-400'
                    : 'bg-slate-200'
                }`}
              />
            )}

            <button
              type="button"
              disabled={!canOpen}
              aria-current={
                isCurrent
                  ? 'step'
                  : undefined
              }
              onClick={() =>
                onStepSelect(step.number)
              }
              className="group relative z-10 flex w-full flex-col items-center gap-2 rounded-xl text-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-not-allowed"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition sm:h-10 sm:w-10 ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                    : isCompleted
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {isCompleted && !isCurrent ? (
                  <Check
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                ) : (
                  step.number
                )}
              </span>

              <span
                className={`text-[10px] font-semibold leading-tight sm:text-xs ${
                  isCurrent
                    ? 'text-slate-900'
                    : 'text-slate-400'
                }`}
              >
                <span className="sm:hidden">
                  {step.shortLabel}
                </span>
                <span className="hidden sm:inline">
                  {step.label}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  </nav>
);

export default RequestWizardProgress;
