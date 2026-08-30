import type {
  FileState,
  FormDataState,
} from '../types';

export type RequestWizardStep =
  1 | 2 | 3 | 4;

export type RequestFormField =
  | 'name'
  | 'nationalId'
  | 'passportNumber'
  | 'phone'
  | 'eventDate'
  | 'eventTimeStart'
  | 'eventTimeEnd'
  | 'location'
  | 'coordinates'
  | 'eventType'
  | 'accidentSubtype'
  | 'isForeignerInvolved'
  | 'description'
  | 'idCard'
  | 'report'
  | 'scene'
  | 'deliveryMethod';

export type RequestFormErrors =
  Partial<
    Record<RequestFormField, string>
  >;

const ALLOWED_CONTENT_TYPES =
  new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]);

const MAX_FILE_SIZE_BYTES =
  10 * 1024 * 1024;
const MAX_SCENE_FILES = 5;

const FIELD_ELEMENT_IDS:
  Record<RequestFormField, string> = {
    name: 'applicant-name',
    nationalId: 'national-id',
    passportNumber:
      'passport-number',
    phone: 'applicant-phone',
    eventDate: 'event-date',
    eventTimeStart:
      'event-time-start',
    eventTimeEnd: 'event-time-end',
    location: 'event-location',
    coordinates:
      'event-map-section',
    eventType: 'event-type',
    accidentSubtype:
      'accident-subtype',
    isForeignerInvolved:
      'foreigner-involved',
    description:
      'event-description',
    idCard: 'id-card-file',
    report: 'police-report-file',
    scene: 'scene-files',
    deliveryMethod:
      'delivery-method-section',
  };

function isValidThaiNationalId(
  value: string,
): boolean {
  if (!/^\d{13}$/.test(value)) {
    return false;
  }

  const digits =
    value.split('').map(Number);

  const weightedSum = digits
    .slice(0, 12)
    .reduce(
      (sum, digit, index) =>
        sum +
        digit * (13 - index),
      0,
    );

  const expectedCheckDigit =
    (11 - (weightedSum % 11)) %
    10;

  return (
    expectedCheckDigit ===
    digits[12]
  );
}

function getBangkokToday(): string {
  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      },
    ).formatToParts(new Date());

  const values =
    Object.fromEntries(
      parts.map((part) => [
        part.type,
        part.value,
      ]),
    );

  return `${values.year}-${values.month}-${values.day}`;
}

function isRealCalendarDate(
  value: string,
): boolean {
  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getFileError(
  file: File,
): string | null {
  if (
    !ALLOWED_CONTENT_TYPES.has(
      file.type,
    )
  ) {
    return 'รองรับเฉพาะ JPG, PNG, WebP หรือ PDF';
  }

  if (
    file.size > MAX_FILE_SIZE_BYTES
  ) {
    return 'ไฟล์ต้องมีขนาดไม่เกิน 10 MB';
  }

  return null;
}

export function validateRequestStep(
  step: RequestWizardStep,
  formData: FormDataState,
  files: FileState,
): RequestFormErrors {
  const errors: RequestFormErrors = {};

  if (step === 1) {
    const name = formData.name.trim();

    if (name.length < 2) {
      errors.name =
        'กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร';
    } else if (name.length > 150) {
      errors.name = 'ชื่อยาวเกินไป';
    }

    if (
      formData.isForeigner === 'THAI'
    ) {
      if (!formData.nationalId) {
        errors.nationalId =
          'กรุณากรอกเลขประจำตัวประชาชน';
      } else if (
        !isValidThaiNationalId(
          formData.nationalId,
        )
      ) {
        errors.nationalId =
          'เลขประจำตัวประชาชนไม่ผ่านการตรวจสอบ';
      }
    } else if (
      !/^[A-Z0-9-]{5,20}$/i.test(
        formData.passportNumber.trim(),
      )
    ) {
      errors.passportNumber =
        'หมายเลขหนังสือเดินทางไม่ถูกต้อง';
    }

    const normalizedPhone =
      formData.phone
        .trim()
        .replace(/[\s-]/g, '');

    if (
      !/^(?:\+66|0)\d{8,9}$/.test(
        normalizedPhone,
      )
    ) {
      errors.phone =
        'กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง';
    }
  }

  if (step === 2) {
    if (
      !isRealCalendarDate(
        formData.eventDate,
      ) ||
      formData.eventDate >
        getBangkokToday()
    ) {
      errors.eventDate =
        'วันที่เกิดเหตุต้องเป็นวันที่จริงและไม่อยู่ในอนาคต';
    }

    if (
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
        formData.eventTimeStart,
      )
    ) {
      errors.eventTimeStart =
        'กรุณาระบุเวลาเริ่มต้น';
    }

    if (
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
        formData.eventTimeEnd,
      )
    ) {
      errors.eventTimeEnd =
        'กรุณาระบุเวลาสิ้นสุด';
    } else if (
      formData.eventTimeStart &&
      formData.eventTimeEnd <=
        formData.eventTimeStart
    ) {
      errors.eventTimeEnd =
        'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น';
    }

    if (
      formData.latitude === null ||
      formData.longitude === null
    ) {
      errors.coordinates =
        'กรุณาปักหมุดตำแหน่งที่เกิดเหตุ';
    }

    const location =
      formData.location.trim();

    if (location.length < 3) {
      errors.location =
        'กรุณาระบุสถานที่เกิดเหตุ';
    } else if (location.length > 300) {
      errors.location =
        'รายละเอียดสถานที่ยาวเกินไป';
    }

    if (!formData.eventType) {
      errors.eventType =
        'กรุณาเลือกประเภทเหตุการณ์';
    }

    if (
      formData.eventType ===
        'ACCIDENT' &&
      !formData.accidentSubtype
    ) {
      errors.accidentSubtype =
        'กรุณาระบุลักษณะอุบัติเหตุ';
    }

    if (
      formData.eventType ===
        'ACCIDENT' &&
      !formData.isForeignerInvolved
    ) {
      errors.isForeignerInvolved =
        'กรุณาระบุว่าเหตุการณ์เกี่ยวข้องกับชาวต่างชาติหรือไม่';
    }

    const description =
      formData.description.trim();

    if (description.length < 10) {
      errors.description =
        'กรุณาอธิบายเหตุการณ์อย่างน้อย 10 ตัวอักษร';
    } else if (
      description.length > 2000
    ) {
      errors.description =
        'รายละเอียดเหตุการณ์ยาวเกินไป';
    }
  }

  if (step === 3) {
    if (!files.idCard) {
      errors.idCard =
        'กรุณาแนบเอกสารยืนยันตัวตน';
    } else {
      const fileError =
        getFileError(files.idCard);

      if (fileError) {
        errors.idCard = fileError;
      }
    }

    if (!files.report) {
      errors.report =
        'กรุณาแนบใบแจ้งความ';
    } else {
      const fileError =
        getFileError(files.report);

      if (fileError) {
        errors.report = fileError;
      }
    }

    if (
      files.scene.length >
      MAX_SCENE_FILES
    ) {
      errors.scene =
        `แนบภาพเหตุการณ์ได้ไม่เกิน ${MAX_SCENE_FILES} ไฟล์`;
    } else {
      const invalidSceneFile =
        files.scene.find(
          (file) =>
            getFileError(file) !== null,
        );

      if (invalidSceneFile) {
        errors.scene =
          getFileError(
            invalidSceneFile,
          ) ?? undefined;
      }
    }

    if (
      !['LINE', 'WALKIN'].includes(
        formData.deliveryMethod,
      )
    ) {
      errors.deliveryMethod =
        'กรุณาเลือกช่องทางการรับข้อมูล';
    }
  }

  return errors;
}

export function validateRequestForm(
  formData: FormDataState,
  files: FileState,
): RequestFormErrors {
  return {
    ...validateRequestStep(
      1,
      formData,
      files,
    ),
    ...validateRequestStep(
      2,
      formData,
      files,
    ),
    ...validateRequestStep(
      3,
      formData,
      files,
    ),
  };
}

export function getFirstErrorField(
  errors: RequestFormErrors,
): RequestFormField | null {
  return (
    Object.keys(errors)[0] as
      | RequestFormField
      | undefined
  ) ?? null;
}

export function focusRequestField(
  field: RequestFormField,
): void {
  window.requestAnimationFrame(() => {
    document
      .getElementById(
        FIELD_ELEMENT_IDS[field],
      )
      ?.focus({
        preventScroll: false,
      });
  });
}

export function getStepForField(
  field: RequestFormField,
): RequestWizardStep {
  if (
    [
      'name',
      'nationalId',
      'passportNumber',
      'phone',
    ].includes(field)
  ) {
    return 1;
  }

  if (
    [
      'eventDate',
      'eventTimeStart',
      'eventTimeEnd',
      'location',
      'coordinates',
      'eventType',
      'accidentSubtype',
      'isForeignerInvolved',
      'description',
    ].includes(field)
  ) {
    return 2;
  }

  return 3;
}
