'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { 
  ArrowLeft, AlertCircle, User, Phone,  Calendar, 
  Camera, CheckCircle2, FileCheck, ShieldCheck, ChevronRight,
  Loader2, QrCode, Footprints, Info, MapPin, FileText, X 
} from 'lucide-react';

// ✅ Import ชิ้นส่วนที่เราสร้างแยกไว้
import FormSection from '../forms/FormSection';
import LoadingOverlay from '../forms/LoadingOverlay';
import FileUploader from '../forms/FileUploader';
import LocationPicker from '../forms/LocationPicker';
import RequestReview from '../forms/RequestReview';
import RequestWizardProgress from '../forms/RequestWizardProgress';
import type {
  FileState,
  FormDataState,
} from '@/types';
import {
  focusRequestField,
  getFirstErrorField,
  getStepForField,
  validateRequestForm,
  validateRequestStep,
} from '../../lib/request-form-validation';
import type {
  RequestFormErrors,
  RequestFormField,
  RequestWizardStep,
} from '../../lib/request-form-validation';

interface RequestViewProps {
  formData: FormDataState;
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
  files: FileState;
  setFiles: React.Dispatch<React.SetStateAction<FileState>>;
  handleSubmitRequest: (e: React.FormEvent) => Promise<void>;
  setView: (view: string) => void;
  loading: boolean;
  error: string;
}

const STEP_TITLES:
  Record<RequestWizardStep, string> = {
    1: 'ข้อมูลผู้ยื่นคำร้อง',
    2: 'รายละเอียดเหตุการณ์',
    3: 'เอกสารและช่องทางรับข้อมูล',
    4: 'ตรวจสอบและยืนยัน',
  };

const FieldError = ({
  id,
  message,
}: {
  id: string;
  message?: string;
}) =>
  message ? (
    <p
      id={id}
      role="alert"
      className="mt-2 text-xs font-semibold text-red-600"
    >
      {message}
    </p>
  ) : null;

const RequestView: React.FC<RequestViewProps> = ({ 
  formData, setFormData, files, setFiles, 
  handleSubmitRequest, setView, loading, error 
}) => {
  
  const brandGradient = "var(--brand-gradient)";

  const [
    currentStep,
    setCurrentStep,
  ] = useState<RequestWizardStep>(1);
  const [
    maxReachedStep,
    setMaxReachedStep,
  ] = useState<RequestWizardStep>(1);
  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<RequestFormErrors>({});
  const stepHeadingRef =
    useRef<HTMLHeadingElement>(null);

  // 🔔 1. State สำหรับระบบแจ้งเตือน Toast สุดคลีน
  const [notification, setNotification] = useState<{message: string, type: 'error' | 'success'} | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setNotification({ message, type });
  };

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timer = window.setTimeout(
      () => setNotification(null),
      4000,
    );

    return () => window.clearTimeout(timer);
  }, [notification]);

  const clearFieldErrors = useCallback((
    ...fields: RequestFormField[]
  ) => {
    setFieldErrors((current) => {
      if (
        !fields.some(
          (field) => current[field],
        )
      ) {
        return current;
      }

      const next = { ...current };

      fields.forEach((field) => {
        delete next[field];
      });

      return next;
    });
  }, []);

  const updateFormField = <
    Key extends keyof FormDataState,
  >(
    field: Key,
    value: FormDataState[Key],
    ...errorFields: RequestFormField[]
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    clearFieldErrors(...errorFields);
  };

  const moveToStep = (
    step: RequestWizardStep,
  ) => {
    setCurrentStep(step);
    setMaxReachedStep((current) =>
      Math.max(
        current,
        step,
      ) as RequestWizardStep,
    );
    setFieldErrors({});

    window.requestAnimationFrame(() => {
      stepHeadingRef.current?.focus({
        preventScroll: true,
      });
      stepHeadingRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const validateCurrentStep = () => {
    const errors = validateRequestStep(
      currentStep,
      formData,
      files,
    );
    const firstField =
      getFirstErrorField(errors);

    setFieldErrors(errors);

    if (firstField) {
      showToast(
        errors[firstField] ??
          'กรุณาตรวจสอบข้อมูลอีกครั้ง',
      );
      focusRequestField(firstField);
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (
      currentStep >= 4 ||
      !validateCurrentStep()
    ) {
      return;
    }

    moveToStep(
      (currentStep + 1) as
        RequestWizardStep,
    );
  };

  const handlePreviousStep = () => {
    if (currentStep <= 1) {
      return;
    }

    moveToStep(
      (currentStep - 1) as
        RequestWizardStep,
    );
  };

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    clearFieldErrors('coordinates');
  }, [
    clearFieldErrors,
    setFormData,
  ]);

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateRequestForm(
      formData,
      files,
    );
    const firstField =
      getFirstErrorField(errors);

    if (firstField) {
      const errorStep =
        getStepForField(firstField);

      setCurrentStep(errorStep);
      setFieldErrors(errors);
      showToast(
        errors[firstField] ??
          'กรุณาตรวจสอบข้อมูลอีกครั้ง',
      );
      focusRequestField(firstField);
      return;
    }

    await handleSubmitRequest(e);
  };

  return (
    <>
      {loading && <LoadingOverlay />}

      {/* 🔔 UI ระบบแจ้งเตือน Floating Toast (โผล่จากด้านบน) */}
      {notification && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300 px-6 w-full max-w-md">
          <div
            role={notification.type === 'error' ? 'alert' : 'status'}
            aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            className={`px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl border flex items-center gap-4 ${
            notification.type === 'error' 
              ? 'bg-red-50/90 border-red-200 text-red-800' 
              : 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
          }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
              notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
              {notification.type === 'error' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-0.5 text-slate-500">System Notification</p>
              <p className="font-bold text-sm leading-tight">{notification.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              aria-label="ปิดข้อความแจ้งเตือน"
              className="rounded-lg p-2 transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
            >
              <X className="w-4 h-4 opacity-50" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl animate-in slide-in-from-right px-3 pb-28 pt-6 font-sans text-slate-900 duration-500 sm:px-6 sm:pt-12">
        <button type="button" onClick={() => setView('home')} className="group mb-8 flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm">
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" aria-hidden="true" /> ย้อนกลับหน้าหลัก
        </button>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50 transition-all sm:rounded-3xl sm:shadow-2xl">
          <div className="border-b border-slate-100 bg-slate-50/30 p-6 text-center sm:p-10 md:p-16">
            <div className="mb-4 inline-flex rounded-2xl border border-slate-100 bg-white p-3 text-blue-900 shadow-sm sm:mb-6 sm:rounded-3xl sm:p-4"><Camera className="h-7 w-7 sm:h-10 sm:w-10" /></div>
            <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl md:mb-4 md:text-4xl">ยื่นคำร้องขอภาพ CCTV</h2>
            <p className="mx-auto max-w-xl text-sm font-normal leading-relaxed text-slate-500 sm:text-base">กรอกเหตุการณ์ ปักหมุด และแนบเอกสารที่จำเป็น</p>
          </div>

          <RequestWizardProgress
            currentStep={currentStep}
            maxReachedStep={maxReachedStep}
            onStepSelect={moveToStep}
          />

          <form
            noValidate
            onSubmit={handleLocalSubmit}
            className="space-y-7 p-4 sm:space-y-10 sm:p-8 md:p-16"
          >
            <header className="scroll-mt-28">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                ขั้นตอน {currentStep} จาก 4
              </p>
              <h2
                ref={stepHeadingRef}
                tabIndex={-1}
                className="mt-2 text-2xl font-bold text-slate-950 outline-none md:text-3xl"
              >
                {STEP_TITLES[currentStep]}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                กรอกข้อมูลที่มีเครื่องหมายดอกจันให้ครบถ้วน แล้วกดถัดไป
              </p>
            </header>
            {/* 🚩 แสดง Error จาก Firebase (ถ้ามี) */}
            {error && (
              <div role="alert" className="p-6 bg-red-50 text-red-900 rounded-3xl flex items-start gap-4 border border-red-100 animate-in zoom-in-95 shadow-sm">
                <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-red-600" />
                <div><p className="font-bold text-lg mb-1">พบข้อผิดพลาดจากระบบ</p><p className="font-medium text-sm opacity-90">{error}</p></div>
              </div>
            )}

            {currentStep === 1 && (
            /* ส่วนที่ 1: ข้อมูลผู้ยื่น */
        <FormSection title="1. ข้อมูลผู้ยื่นคำร้อง">
  <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
    {/* ชื่อ-นามสกุล */}
    <div className="space-y-2">
      <label htmlFor="applicant-name" className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wider ml-1">ชื่อ-นามสกุลจริง <span className="text-red-500">*</span></label>
      <div className="relative group">
        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input id="applicant-name" name="applicantName" autoComplete="name" required type="text" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'applicant-name-error' : undefined} className={`w-full pl-14 pr-6 py-4 bg-white border rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none ${fieldErrors.name ? 'border-red-300' : 'border-slate-200'}`} placeholder="ระบุชื่อและนามสกุล" value={formData.name} onChange={e => updateFormField('name', e.target.value, 'name')} />
      </div>
      <FieldError id="applicant-name-error" message={fieldErrors.name} />
    </div>

    {/* ✅ เพิ่ม: ตัวเลือกประเภทบุคคล */}
    <div className="space-y-2">
      <p id="applicant-type-label" className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wider ml-1">ประเภทบุคคล <span className="text-red-500">*</span></p>
      <div role="group" aria-labelledby="applicant-type-label" className="flex gap-4 p-1 bg-slate-100 rounded-2xl">
        <button type="button" aria-pressed={formData.isForeigner === 'THAI'} onClick={() => { setFormData({...formData, isForeigner: 'THAI', passportNumber: ''}); clearFieldErrors('nationalId', 'passportNumber'); }} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${formData.isForeigner === 'THAI' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>คนไทย</button>
        <button type="button" aria-pressed={formData.isForeigner === 'FOREIGNER'} onClick={() => { setFormData({...formData, isForeigner: 'FOREIGNER', nationalId: ''}); clearFieldErrors('nationalId', 'passportNumber'); }} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${formData.isForeigner === 'FOREIGNER' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>ชาวต่างชาติ</button>
      </div>
    </div>

    {/* ✅ สลับช่องกรอกตามประเภทบุคคล */}
    {formData.isForeigner === 'THAI' ? (
      <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
        <label htmlFor="national-id" className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wider ml-1">เลขประจำตัวประชาชน <span className="text-red-500">*</span></label>
        <input id="national-id" name="nationalId" inputMode="numeric" autoComplete="off" required type="text" maxLength={13} placeholder="X-XXXX-XXXXX-XX-X" aria-invalid={Boolean(fieldErrors.nationalId)} aria-describedby={fieldErrors.nationalId ? 'national-id-error' : undefined} className={`w-full px-6 py-4 bg-white border rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-mono ${fieldErrors.nationalId ? 'border-red-300' : 'border-slate-200'}`} value={formData.nationalId} onChange={e => updateFormField('nationalId', e.target.value.replace(/[^0-9]/g, ''), 'nationalId')} />
        <FieldError id="national-id-error" message={fieldErrors.nationalId} />
      </div>
    ) : (
      <div className="space-y-2 animate-in fade-in slide-in-from-right-2">
        <label htmlFor="passport-number" className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wider ml-1">Passport Number <span className="text-red-500">*</span></label>
        <input id="passport-number" name="passportNumber" autoComplete="off" required type="text" placeholder="ระบุเลขที่พาสปอร์ต" aria-invalid={Boolean(fieldErrors.passportNumber)} aria-describedby={fieldErrors.passportNumber ? 'passport-number-error' : undefined} className={`w-full px-6 py-4 bg-white border rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none uppercase font-mono ${fieldErrors.passportNumber ? 'border-red-300' : 'border-slate-200'}`} value={formData.passportNumber} onChange={e => updateFormField('passportNumber', e.target.value.toUpperCase(), 'passportNumber')} />
        <FieldError id="passport-number-error" message={fieldErrors.passportNumber} />
      </div>
    )}

    {/* เบอร์โทรศัพท์ (คงเดิม) */}
    <div className="space-y-2">
      <label htmlFor="applicant-phone" className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wider ml-1">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
      <div className="relative group">
        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input id="applicant-phone" name="phone" autoComplete="tel" inputMode="tel" required type="tel" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'applicant-phone-error' : undefined} className={`w-full pl-14 pr-6 py-4 bg-white border rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none ${fieldErrors.phone ? 'border-red-300' : 'border-slate-200'}`} value={formData.phone} onChange={e => updateFormField('phone', e.target.value, 'phone')} />
      </div>
      <FieldError id="applicant-phone-error" message={fieldErrors.phone} />
    </div>
  </div>
</FormSection>
            )}

            {currentStep === 2 && (
            /* ส่วนที่ 2: รายละเอียดเหตุการณ์ */
            <FormSection title="2. รายละเอียดเหตุการณ์">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
                <div className="space-y-2">
                  <label htmlFor="event-date" className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wider ml-1">วันที่เกิดเหตุ <span className="text-red-500">*</span></label>
                  <div className="relative group"><Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" /><input id="event-date" name="eventDate" required type="date" aria-invalid={Boolean(fieldErrors.eventDate)} aria-describedby={fieldErrors.eventDate ? 'event-date-error' : undefined} className={`w-full pl-14 pr-6 py-4 bg-white border rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none ${fieldErrors.eventDate ? 'border-red-300' : 'border-slate-200'}`} value={formData.eventDate} onChange={e => updateFormField('eventDate', e.target.value, 'eventDate')} /></div>
                  <FieldError id="event-date-error" message={fieldErrors.eventDate} />
                </div>
                <div className="space-y-2">
                  <p id="event-time-label" className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wider ml-1">ช่วงเวลาที่เกิดเหตุ <span className="text-red-500">*</span></p>
                  <div className="flex items-center gap-4">
                    <input id="event-time-start" aria-label="เวลาเริ่มต้นของเหตุการณ์" name="eventTimeStart" required type="time" aria-invalid={Boolean(fieldErrors.eventTimeStart)} aria-describedby={fieldErrors.eventTimeStart ? 'event-time-start-error' : undefined} className={`w-full px-4 py-4 bg-white border rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none text-center ${fieldErrors.eventTimeStart ? 'border-red-300' : 'border-slate-200'}`} value={formData.eventTimeStart} onChange={e => updateFormField('eventTimeStart', e.target.value, 'eventTimeStart', 'eventTimeEnd')} />
                    <span className="font-medium text-slate-400 text-sm">ถึง</span>
                    <input id="event-time-end" aria-label="เวลาสิ้นสุดของเหตุการณ์" name="eventTimeEnd" required type="time" aria-invalid={Boolean(fieldErrors.eventTimeEnd)} aria-describedby={fieldErrors.eventTimeEnd ? 'event-time-end-error' : undefined} className={`w-full px-4 py-4 bg-white border rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none text-center ${fieldErrors.eventTimeEnd ? 'border-red-300' : 'border-slate-200'}`} value={formData.eventTimeEnd} onChange={e => updateFormField('eventTimeEnd', e.target.value, 'eventTimeEnd')} />
                  </div>
                  <FieldError id="event-time-start-error" message={fieldErrors.eventTimeStart} />
                  <FieldError id="event-time-end-error" message={fieldErrors.eventTimeEnd} />
                </div>
              </div>

              <div id="event-map-section" tabIndex={-1} aria-invalid={Boolean(fieldErrors.coordinates)} aria-describedby={fieldErrors.coordinates ? 'event-map-error' : undefined} className="space-y-3 mb-8 scroll-mt-28 outline-none">
                <label className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wider ml-1 flex items-center gap-2">ปักหมุดตำแหน่งที่เกิดเหตุบนแผนที่ <span className="text-red-500">*</span></label>
                <div className="rounded-3xl overflow-hidden border-2 border-slate-200 shadow-md">
                <LocationPicker 
  initialLat={formData.latitude} 
  initialLng={formData.longitude} 
  onLocationSelect={handleLocationSelect} 
/>
                </div>
                <FieldError id="event-map-error" message={fieldErrors.coordinates} />
              </div>

              <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                   <label htmlFor="event-location" className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wider ml-1">สถานที่ / จุดสังเกตโดยรอบ <span className="text-red-500">*</span></label>
                   <div className="relative group"><MapPin className="absolute left-5 top-5 text-slate-400 w-5 h-5" /><input id="event-location" name="eventLocation" required type="text" aria-invalid={Boolean(fieldErrors.location)} aria-describedby={fieldErrors.location ? 'event-location-error' : undefined} className={`w-full pl-14 pr-6 py-4 bg-white border rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none ${fieldErrors.location ? 'border-red-300' : 'border-slate-200'}`} placeholder="หน้าเสาไฟฟ้า, ฝั่งตรงข้าม..." value={formData.location} onChange={e => updateFormField('location', e.target.value, 'location')} /></div>
                   <FieldError id="event-location-error" message={fieldErrors.location} />
                </div>
                <div className="space-y-2">
                   <label htmlFor="event-type" className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wider ml-1">ประเภทเหตุการณ์ <span className="text-red-500">*</span></label>
                  <div className="relative group">
                     <select id="event-type" name="eventType" required aria-invalid={Boolean(fieldErrors.eventType)} aria-describedby={fieldErrors.eventType ? 'event-type-error' : undefined} className={`w-full px-8 py-4 bg-white border rounded-2xl appearance-none cursor-pointer ${fieldErrors.eventType ? 'border-red-300' : 'border-slate-200'}`} value={formData.eventType} onChange={e => { setFormData({...formData, eventType: e.target.value, accidentSubtype: '', isForeignerInvolved: ''}); clearFieldErrors('eventType', 'accidentSubtype', 'isForeignerInvolved'); }}>
                      <option value="">-- เลือกประเภทเหตุการณ์ --</option>
                      <option value="ACCIDENT">🚗 อุบัติเหตุจราจร</option>
                      <option value="THEFT">🔓 การโจรกรรม / ลักทรัพย์</option>
                      <option value="VANDALISM">🔨 การทำลายทรัพย์สิน</option>
                      <option value="DISPUTE">⚖️ ข้อพิพาท / ทะเลาะวิวาท</option>
                      <option value="OTHER">📋 อื่นๆ</option>
                    </select>
                    <ChevronRight className="absolute right-6 top-6 w-5 h-5 text-slate-400 rotate-90 pointer-events-none" />
                  </div>
                  <FieldError id="event-type-error" message={fieldErrors.eventType} />
                </div>
              </div>

              {formData.eventType === 'ACCIDENT' && (
                <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-top-2">
                  {/* ลักษณะการเกิดอุบัติเหตุ (เดิม) */}
                  <div className="space-y-2">
                     <label htmlFor="accident-subtype" className="block text-[13px] font-bold text-blue-700 uppercase tracking-wider ml-1 mb-2">ลักษณะการเกิดอุบัติเหตุ <span className="text-red-500">*</span></label>
                    <div className="relative group">
                       <select id="accident-subtype" name="accidentSubtype" required aria-invalid={Boolean(fieldErrors.accidentSubtype)} aria-describedby={fieldErrors.accidentSubtype ? 'accident-subtype-error' : undefined} className={`w-full px-8 py-4 bg-blue-50/50 border-2 rounded-2xl appearance-none ${fieldErrors.accidentSubtype ? 'border-red-300' : 'border-blue-200'}`} value={formData.accidentSubtype || ''} onChange={e => updateFormField('accidentSubtype', e.target.value, 'accidentSubtype')}>
                        <option value="">-- เลือกลักษณะการเกิดเหตุ --</option>
                        <option value="MC_VS_MC">1. รถจักรยานยนต์ ชน รถจักรยานยนต์</option>
                        <option value="MC_VS_CAR">2. รถจักรยานยนต์ ชน รถยนต์</option>
                        <option value="CAR_VS_CAR">3. รถยนต์ ชน รถยนต์</option>
                        <option value="PEDESTRIAN">4. ชนคนเดินเท้า</option>
                        <option value="HIT_AND_RUN">5. ชนแล้วหนี</option>
                        <option value="OTHER">6. อื่นๆ</option>
                      </select>
                      <ChevronRight className="absolute right-6 top-6 w-5 h-5 text-blue-400 rotate-90 pointer-events-none" />
                    </div>
                    <FieldError id="accident-subtype-error" message={fieldErrors.accidentSubtype} />
                  </div>

                  {/* ✅ เพิ่มส่วนนี้: คำถามเกี่ยวกับชาวต่างชาติ */}
                  <div className="space-y-2">
                     <label htmlFor="foreigner-involved" className="block text-[13px] font-bold text-blue-700 uppercase tracking-wider ml-1 mb-2">เหตุการณ์นี้เกี่ยวข้องกับชาวต่างชาติหรือไม่ <span className="text-red-500">*</span></label>
                    <div className="relative group">
                       <select id="foreigner-involved" name="foreignerInvolved" required aria-invalid={Boolean(fieldErrors.isForeignerInvolved)} aria-describedby={fieldErrors.isForeignerInvolved ? 'foreigner-involved-error' : undefined} className={`w-full px-8 py-4 bg-blue-50/50 border-2 rounded-2xl appearance-none ${fieldErrors.isForeignerInvolved ? 'border-red-300' : 'border-blue-200'}`} value={formData.isForeignerInvolved} onChange={e => updateFormField('isForeignerInvolved', e.target.value, 'isForeignerInvolved')}>
                        <option value="">-- โปรดเลือกคำตอบ --</option>
                        <option value="YES">เกี่ยวข้อง</option>
                        <option value="NO">ไม่เกี่ยวข้อง</option>
                        <option value="NOT_SURE">ไม่แน่ใจ</option>
                      </select>
                      <ChevronRight className="absolute right-6 top-6 w-5 h-5 text-blue-400 rotate-90 pointer-events-none" />
                    </div>
                    <FieldError id="foreigner-involved-error" message={fieldErrors.isForeignerInvolved} />
                  </div>
                </div>
              )}

              <div className="mt-8 space-y-2">
                 <label htmlFor="event-description" className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wider ml-1">รายละเอียดเพิ่มเติม <span className="text-red-500">*</span></label>
                 <textarea id="event-description" name="eventDescription" required rows={4} aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? 'event-description-error' : undefined} className={`w-full px-8 py-5 bg-white border rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none resize-none shadow-sm ${fieldErrors.description ? 'border-red-300' : 'border-slate-200'}`} placeholder="อธิบายลักษณะเหตุการณ์อย่างน้อย 10 ตัวอักษร" value={formData.description} onChange={e => updateFormField('description', e.target.value, 'description')} />
                 <div className="flex items-start justify-between gap-4">
                   <FieldError id="event-description-error" message={fieldErrors.description} />
                   <span className="ml-auto mt-2 text-xs font-medium text-slate-400">{formData.description.length}/2000</span>
                 </div>
              </div>
            </FormSection>
            )}

            {currentStep === 3 && (
              <>
            {/* ส่วนที่ 3: เอกสารประกอบ */}
            <FormSection title="3. เอกสารประกอบ">
              <div className="grid md:grid-cols-2 gap-8">
                {/* 📌 บัตรประชาชน (บังคับ) */}
                <FileUploader 
                  inputId="id-card-file"
                  label="รูปถ่ายบัตรประชาชน"
                  required
                  error={fieldErrors.idCard}
                  description="เห็นข้อมูลหน้าบัตรและชื่อชัดเจน" 
                  icon={User} 
                  files={files.idCard} 
                 onFileChange={(file) => {
  setFiles((previous) => ({
    ...previous,
    idCard: file,
  }));
  clearFieldErrors('idCard');
}}
                />
                {/* 📌 ใบแจ้งความ (บังคับ) */}
                <FileUploader 
                  inputId="police-report-file"
                  label="ใบแจ้งความ"
                  required
                  error={fieldErrors.report}
                  description="ต้องมีตราประทับจากสถานีตำรวจ" 
                  icon={FileText} 
                  files={files.report} 
                 onFileChange={(file) => {
  setFiles((previous) => ({
    ...previous,
    report: file,
  }));
  clearFieldErrors('report');
}}
                />
              </div>
              <div className="mt-10">
                {/* 📌 ภาพเหตุการณ์ (ไม่บังคับ) */}
                <FileUploader 
                  inputId="scene-files"
                  label="ภาพเหตุการณ์หรือสภาพแวดล้อม (ถ้ามี)" 
                  error={fieldErrors.scene}
                  description="แนบภาพถ่ายจุดเกิดเหตุเพื่อให้เจ้าหน้าที่หาตำแหน่งกล้องได้แม่นยำ" 
                  icon={Camera} 
                  multiple={true} 
                  files={files.scene} 
                onFileChange={(selectedFiles) => {
  setFiles((previous) => ({
    ...previous,
    scene: selectedFiles,
  }));
  clearFieldErrors('scene');
}}
                />
              </div>
            </FormSection>

            {/* ช่องทางการรับไฟล์ */}
            <div
              id="delivery-method-section"
              tabIndex={-1}
              className="scroll-mt-28 outline-none"
            >
            <FormSection title="4. ช่องทางการรับไฟล์ข้อมูล">
              <p className="text-sm font-medium text-slate-500 mb-6 ml-1">เลือกวิธีการที่ท่านสะดวกรับข้อมูล <span className="text-red-500">*</span></p>
              <div className="grid sm:grid-cols-2 gap-6">
                <label className={`group flex items-center p-6 rounded-2xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md ${formData.deliveryMethod === 'LINE' ? 'border-blue-600 bg-blue-50/30 shadow-inner' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                  <input type="radio" name="deliveryMethod" value="LINE" checked={formData.deliveryMethod === 'LINE'} onChange={e => updateFormField('deliveryMethod', e.target.value, 'deliveryMethod')} className="h-5 w-5 text-blue-600 focus:ring-blue-600 border-slate-300" />
                  <span className="ml-4 font-bold text-slate-800 flex items-center gap-3 text-lg"><QrCode className="w-6 h-6 text-emerald-600" /> LINE OA (แนะนำ)</span>
                </label>
                <label className={`group flex items-center p-6 rounded-2xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md ${formData.deliveryMethod === 'WALKIN' ? 'border-blue-600 bg-blue-50/30 shadow-inner' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                  <input type="radio" name="deliveryMethod" value="WALKIN" checked={formData.deliveryMethod === 'WALKIN'} onChange={e => updateFormField('deliveryMethod', e.target.value, 'deliveryMethod')} className="h-5 w-5 text-blue-600 focus:ring-blue-600 border-slate-300" />
                  <span className="ml-4 font-bold text-slate-800 flex items-center gap-3 text-lg"><Footprints className="w-6 h-6 text-blue-600" /> รับด้วยตนเอง</span>
                </label>
              </div>

              <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
                  {formData.deliveryMethod === 'LINE' ? (
                  <div className="p-8 bg-emerald-50/40 rounded-2xl border border-emerald-100 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                      <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center border border-emerald-100 shadow-sm flex-shrink-0">
                          {/* QR image is generated by the configured external LINE QR service. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://lin.ee/VDA4zO8"
                            alt="คิวอาร์โค้ดเพิ่มเพื่อน LINE Official Account"
                            width={96}
                            height={96}
                            loading="lazy"
                            decoding="async"
                            className="w-24 h-24 object-contain mix-blend-multiply"
                          />
                      </div>
                      <div className="text-center md:text-left space-y-2">
                          <p className="font-bold text-emerald-900 text-lg">ขั้นตอนรับไฟล์ผ่าน LINE</p>
                          <ul className="text-emerald-900 font-medium space-y-2 text-sm opacity-90">
                              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> 1. สแกน QR Code เพื่อเพิ่มเพื่อนระบบอัตโนมัติ</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> 2. ส่งข้อความแจ้ง <span className="rounded bg-white/50 px-2 font-bold text-blue-800 underline underline-offset-4">
  เลขที่คำร้อง
</span> ของท่าน</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> 3. ระบบส่งลิงก์ดาวน์โหลดให้ท่านตรวจสอบ</li>
                          </ul>
                      </div>
                  </div>
                  ) : (
                  <div className="p-8 bg-blue-50/40 rounded-2xl border border-blue-100 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-blue-900 shadow-sm border border-blue-50 flex-shrink-0"><Info className="w-10 h-10" /></div>
                      <div className="space-y-2 text-center md:text-left">
                          <p className="font-bold text-blue-900 text-lg">เงื่อนไขการมารับด้วยตนเอง</p>
                          <p className="text-slate-700 font-normal leading-relaxed text-sm">กรุณานำอุปกรณ์เก็บข้อมูล <span className="text-blue-900 font-bold decoration-blue-800 underline underline-offset-2">(Flash Drive / External HDD)</span> มาติดต่อที่ศูนย์ CCTV ณ สำนักงานเทศบาลตำบลราไวย์ ในวันและเวลาทำการ <br className="hidden md:block" /> <span className="bg-white px-4 py-1.5 rounded-lg border border-blue-100 shadow-sm mt-3 inline-block font-bold text-blue-900 text-sm tracking-tight">จันทร์-ศุกร์ | 08:30 - 16:30 น.</span></p>
                      </div>
                  </div>
                  )}
              </div>
              <FieldError id="delivery-method-error" message={fieldErrors.deliveryMethod} />
            </FormSection>
            </div>
              </>
            )}

            {currentStep === 4 && (
              <RequestReview
                formData={formData}
                files={files}
                onEdit={moveToStep}
              />
            )}

            <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-300/40 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-4 md:static md:border-0 md:border-t md:bg-transparent md:px-0 md:pt-10 md:shadow-none">
              <div className="hidden items-center gap-3 rounded-full border border-slate-100 bg-slate-50 px-6 py-3 shadow-inner lg:flex">
                <ShieldCheck className="w-5 h-5 text-blue-700" /><p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">มาตรฐานความปลอดภัย PDPA 100%</p>
              </div>
              <div className="flex w-full gap-3 sm:w-auto">
                {currentStep === 1 ? (
                  <button type="button" onClick={() => setView('home')} className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 sm:flex-none">ยกเลิก</button>
                ) : (
                  <button type="button" onClick={handlePreviousStep} className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 sm:flex-none">ย้อนกลับ</button>
                )}

                {currentStep < 4 ? (
                  <button type="button" onClick={handleNextStep} className="flex flex-1 items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] sm:flex-none" style={{ background: brandGradient }}>
                    ถัดไป
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <button type="submit" disabled={loading} className="flex flex-1 items-center justify-center gap-3 rounded-xl px-7 py-3.5 text-sm font-bold text-white shadow-xl transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none" style={{ background: brandGradient }}>
                    {loading ? (<><Loader2 className="w-5 h-5 animate-spin" /> กำลังประมวลผล...</>) : (<><FileCheck className="w-5 h-5" /> ยืนยันและยื่นคำร้อง</>)}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default RequestView;
