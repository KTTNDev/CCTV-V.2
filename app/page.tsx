'use client';
import React, {
  useEffect,
  useState,
} from 'react';

import {
  onAuthStateChanged,
  signInAnonymously,
  signOut,
} from 'firebase/auth';

import type {
  User as FirebaseUser,
} from 'firebase/auth';

import {
  ApiClientError,
  createRequest,
  finalizeRequest,
  trackLegacyRequest,
  trackRequest,
} from '../lib/api-client';

import type {
  AccidentSubtype,
  AllowedContentType,
  ApplicantType,
  CreateRequestPayload,
  CreateRequestResult,
  DeliveryMethod,
  EventType,
  FinalizeRequestResult,
  ForeignerInvolvement,
  LegacyTrackRequestPayload,
  TrackRequestResult,
  UploadFileMetadata,
} from '../lib/api-client';

import {
  auth,
} from '../lib/firebase';
import {
  uploadRequestFiles,
} from '../lib/request-upload';
/**
 * 🛠️ การแก้ไขข้อผิดพลาด "Could not resolve":
 * เปลี่ยนจากการใช้ @/ มาเป็นการใช้ Relative Path (../)
 * เพื่อให้ระบบรันโค้ดสามารถค้นหาตำแหน่งไฟล์ในโฟลเดอร์ src ได้ถูกต้อง
 */
import { isAllowedAdminEmail } from '../lib/adminEmails';
import { FormDataState, FileState } from '../types';


// ส่วนประกอบ UI ปกติ
import ConsentModal from '../components/ui/ConsentModal';
import HomeView from '../components/views/HomeView';
import RequestView from '../components/views/RequestView';
import SuccessView from '../components/views/SuccessView';
import TrackView from '../components/views/TrackView';
import Footer from '../components/layout/Footer';
import Navbar from '../components/layout/Navbar';

// ส่วนประกอบสำหรับเจ้าหน้าที่ (Admin/Staff)
import AdminLoginView from '../components/views/AdminLoginView';
import AdminView from '../components/views/AdminView';
type SubmissionResult =
  FinalizeRequestResult &
  Pick<
    CreateRequestResult,
    'trackingToken'
  >;



const ALLOWED_CONTENT_TYPES =
  new Set<string>([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]);

const MAX_FILE_SIZE_BYTES =
  10 * 1024 * 1024;

function createUploadFileMetadata(
  file: File,
): UploadFileMetadata {
  if (
    !ALLOWED_CONTENT_TYPES.has(file.type)
  ) {
    throw new Error(
      `ไม่รองรับชนิดไฟล์ ${file.name} ` +
      'กรุณาใช้ JPG, PNG, WEBP หรือ PDF',
    );
  }

  if (
    file.size <= 0 ||
    file.size > MAX_FILE_SIZE_BYTES
  ) {
    throw new Error(
      `ไฟล์ ${file.name} ต้องมีขนาดไม่เกิน 10 MB`,
    );
  }

  return {
    name: file.name,
    contentType:
      file.type as AllowedContentType,
    size: file.size,
  };
}
const REQUEST_FIELD_LABELS:
  Record<string, string> = {
    form: "แบบฟอร์ม",
    name: "ชื่อ-นามสกุล",
    applicantType: "ประเภทผู้ยื่น",
    nationalId:
      "เลขประจำตัวประชาชน",
    passportNumber:
      "หมายเลขหนังสือเดินทาง",
    phone: "เบอร์โทรศัพท์",
    email: "อีเมล",
    eventDate: "วันที่เกิดเหตุ",
    eventTimeStart: "เวลาเริ่มต้น",
    eventTimeEnd: "เวลาสิ้นสุด",
    eventType: "ประเภทเหตุการณ์",
    accidentSubtype:
      "ลักษณะอุบัติเหตุ",
    isForeignerInvolved:
      "ข้อมูลผู้เกี่ยวข้อง",
    location: "สถานที่เกิดเหตุ",
    latitude: "พิกัดละติจูด",
    longitude: "พิกัดลองจิจูด",
    description:
      "รายละเอียดเหตุการณ์",
    deliveryMethod:
      "ช่องทางรับไฟล์",
    privacyAccepted:
      "การยอมรับความเป็นส่วนตัว",
    "expectedFiles.idCard":
      "บัตรประชาชน/หนังสือเดินทาง",
    "expectedFiles.policeReport":
      "ใบแจ้งความ",
    "expectedFiles.scene":
      "ภาพเหตุการณ์",
  };

function getSubmissionErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof
    ApiClientError
  ) {
    const fieldMessages =
      Object.entries(
        error.fields ?? {},
      ).flatMap(
        ([field, messages]) => {
          const label =
            REQUEST_FIELD_LABELS[
              field
            ] ?? field;

          return messages.map(
            (message) =>
              `${label}: ${message}`,
          );
        },
      );

    if (
      fieldMessages.length > 0
    ) {
      return fieldMessages.join(
        " • ",
      );
    }

    const reference =
      error.requestId
        ? ` (Ref: ${error.requestId})`
        : "";

    return (
      error.message +
      reference
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "เกิดข้อผิดพลาดในการส่งคำร้อง";
}
const App = () => {
  // สถานะการควบคุมหน้าจอ: home, request, track, success, admin-login, admin-dashboard
  const [view, setView] = useState('home');
  const [showConsent, setShowConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<FirebaseUser | null>(null);

  // สถานะตรวจสอบการล็อกอินของเจ้าหน้าที่
  const [isAdmin, setIsAdmin] = useState(false);

  // เริ่มต้นระบบตรวจสอบสิทธิ์ + คงสถานะแอดมินไว้เมื่อ refresh หน้า
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser && isAllowedAdminEmail(currentUser.email)) {
        // ✅ มี session แอดมินอยู่แล้ว (เช่นตอน refresh) -> คงอยู่หน้าแอดมินต่อ
        setIsAdmin(true);
        setView((prev) => (prev === 'home' || prev === 'admin-login' ? 'admin-dashboard' : prev));
      } else if (!currentUser) {
        // ยังไม่มี session ใดๆ เลย -> สร้าง anonymous session ให้ผู้ใช้ทั่วไป
        try {
          await signInAnonymously(auth);
        } catch (err) {
         console.warn(
  "Anonymous authentication failed:",
  err,
);
        }
      } else {
        // มี user แต่ไม่ใช่แอดมิน (เช่น anonymous user เดิมที่ค้างจากรอบก่อน)
        setIsAdmin(false);
      }

      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);
const [formData, setFormData] = useState<FormDataState>({
  name: '',
  isForeigner: 'THAI',      // ✅ เพิ่ม: default เป็นคนไทย
  nationalId: '',
  passportNumber: '',       // ✅ เพิ่ม
  isForeignerInvolved: '',  // ✅ เพิ่ม
  phone: '',
  email: '',
  eventDate: '',
  eventTimeStart: '',
  eventTimeEnd: '',
  eventType: '',
  location: '', 
  latitude: null,
  longitude: null,
  description: '',
  deliveryMethod: 'LINE'
});

  const [files, setFiles] = useState<FileState>({
    idCard: null, report: null, scene: []
  });
  
const [
  submissionResult,
  setSubmissionResult,
] = useState<SubmissionResult | null>(
  null,
);

const [
  trackingIdInput,
  setTrackingIdInput,
] = useState('');

const [
  trackResult,
  setTrackResult,
] = useState<TrackRequestResult | null>(
  null,
);
  const handleRequestClick = () => setShowConsent(true);
  
  const handleConsentAgree = () => {
    setShowConsent(false);
    setView('request');
  };

  /**
   * ✅ ฟังก์ชันเมื่อเจ้าหน้าที่เข้าสู่ระบบสำเร็จ
   * จะถูกเรียกใช้หลังจากตรวจสอบรหัสผ่านใน AdminLoginView
   */
  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    setView('admin-dashboard');
  };

  /**
   * ✅ ฟังก์ชันออกจากระบบเจ้าหน้าที่
   */
  const handleAdminLogout =
  async () => {
    setError("");

    try {
      await signOut(auth);

      setIsAdmin(false);
      setView("home");
      setUser(null);
    } catch (logoutError) {
      console.warn(
        "Admin logout failed:",
        logoutError,
      );

      setError(
        "ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง",
      );
    }
  };

  const handleSubmitRequest = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (
      formData.latitude === null ||
      formData.longitude === null
    ) {
      setError(
        'กรุณาปักหมุดสถานที่เกิดเหตุบนแผนที่',
      );
      window.scrollTo(0, 0);
      return;
    }

    if (!files.idCard) {
      setError(
        'กรุณาแนบรูปถ่ายบัตรประชาชน',
      );
      window.scrollTo(0, 0);
      return;
    }

    if (!files.report) {
      setError('กรุณาแนบใบแจ้งความ');
      window.scrollTo(0, 0);
      return;
    }

    if (files.scene.length > 5) {
      setError(
        'แนบภาพเหตุการณ์ได้ไม่เกิน 5 ไฟล์',
      );
      window.scrollTo(0, 0);
      return;
    }

    if (!auth.currentUser) {
      setError(
        'ระบบกำลังยืนยันตัวตน กรุณารอสักครู่แล้วลองใหม่',
      );
      window.scrollTo(0, 0);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: CreateRequestPayload = {
        name: formData.name,

        applicantType:
          formData
            .isForeigner as ApplicantType,

        nationalId:
          formData.nationalId,

        passportNumber:
          formData.passportNumber,

        phone: formData.phone,
        email: formData.email,

        eventDate:
          formData.eventDate,

        eventTimeStart:
          formData.eventTimeStart,

        eventTimeEnd:
          formData.eventTimeEnd,

        eventType:
          formData.eventType as EventType,

        ...(formData.eventType ===
        'ACCIDENT'
          ? {
              accidentSubtype:
                formData
                  .accidentSubtype as AccidentSubtype,

              isForeignerInvolved:
                formData
                  .isForeignerInvolved as ForeignerInvolvement,
            }
          : {}),

        location: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        description:
          formData.description,

        deliveryMethod:
          formData
            .deliveryMethod as DeliveryMethod,

        privacyAccepted: true,

        expectedFiles: {
          idCard:
            createUploadFileMetadata(
              files.idCard,
            ),

          policeReport:
            createUploadFileMetadata(
              files.report,
            ),

          scene: files.scene.map(
            createUploadFileMetadata,
          ),
        },
      };

      // ขั้นที่ 1: สร้าง Draft ที่ Server
      const draft =
        await createRequest(payload);

      // ขั้นที่ 2: อัปโหลดตาม Path
      // ที่ Server อนุญาตเท่านั้น
      await uploadRequestFiles({
        files: {
          idCard: files.idCard,
          policeReport:
            files.report,
          scene: files.scene,
        },
        targets:
          draft.uploadTargets,
      });

      // ขั้นที่ 3: ตรวจไฟล์และเปลี่ยน
      // สถานะ draft เป็น pending
      const finalized =
        await finalizeRequest(
          draft.requestId,
        );

      setSubmissionResult({
        ...finalized,
        trackingToken:
          draft.trackingToken,
      });

      setView('success');

      setFormData({
        name: '',
        isForeigner: 'THAI',
        nationalId: '',
        passportNumber: '',
        isForeignerInvolved: '',
        phone: '',
        email: '',
        eventDate: '',
        eventTimeStart: '',
        eventTimeEnd: '',
        eventType: '',
        accidentSubtype: '',
        location: '',
        latitude: null,
        longitude: null,
        description: '',
        deliveryMethod: 'LINE',
      });

      setFiles({
        idCard: null,
        report: null,
        scene: [],
      });
   } catch (submitError: unknown) {
  console.warn(
    "Request submission failed:",
    submitError,
  );

  setError(
    getSubmissionErrorMessage(
      submitError,
    ),
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
} finally {
      setLoading(false);
    }
  };

const handleTrackRequest = async (
  event: React.FormEvent,
): Promise<void> => {
  event.preventDefault();

  const trackingToken =
    view === 'success' &&
    submissionResult?.trackingToken
      ? submissionResult
          .trackingToken
          .trim()
      : trackingIdInput.trim();

  if (!trackingToken) {
    setError(
      'กรุณากรอกรหัสติดตามคำร้อง',
    );
    return;
  }

  setLoading(true);
  setError('');
  setTrackResult(null);

  try {
    const result =
      await trackRequest(
        trackingToken,
      );

    setTrackResult(result);
  } catch (trackingError: unknown) {
    console.warn(
      'Track request failed:',
      trackingError,
    );

    const message =
      trackingError instanceof
      ApiClientError
        ? trackingError.message
        : trackingError instanceof Error
          ? trackingError.message
          : 'ไม่สามารถตรวจสอบสถานะคำร้องได้';

    setError(message);
  } finally {
    setLoading(false);
  }
};


const handleLegacyTrackRequest = async (
  payload: LegacyTrackRequestPayload,
): Promise<void> => {
  setLoading(true);
  setError('');
  setTrackResult(null);

  try {
    const result =
      await trackLegacyRequest(
        payload,
      );

    setTrackResult(result);
  } catch (trackingError: unknown) {
    console.warn(
      'Legacy track request failed:',
      trackingError,
    );

    const message =
      trackingError instanceof
      ApiClientError
        ? trackingError.message
        : trackingError instanceof Error
          ? trackingError.message
          : 'ไม่สามารถตรวจสอบสถานะคำร้องได้';

    setError(message);
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col selection:bg-blue-100">
      
      {/* ซ่อน Navbar ปกติเมื่ออยู่ในส่วนของเจ้าหน้าที่ เพื่อความชัดเจนในการทำงาน */}
      {!['admin-login', 'admin-dashboard'].includes(view) && (
        <Navbar 
          view={view} 
          setView={setView} 
          onRequestClick={handleRequestClick} 
        />
      )}

      {showConsent && (
        <ConsentModal 
          onAgree={handleConsentAgree} 
          onCancel={() => setShowConsent(false)} 
        />
      )}

      <main className="flex-grow">
        {/* หน้าหลักประชาชน */}
        {view === 'home' && (
          <HomeView setView={setView} onRequestClick={handleRequestClick} />
        )}
        
        {/* ฟอร์มยื่นคำร้อง */}
        {view === 'request' && (
          <RequestView 
            formData={formData} setFormData={setFormData}
            files={files} setFiles={setFiles}
            handleSubmitRequest={handleSubmitRequest} 
            setView={setView} loading={loading} error={error} 
          />
        )}
        
        {/* หน้าแจ้งผลสำเร็จ */}
        {view === 'success' && (
          <SuccessView 
            submissionResult={submissionResult} 
            handleTrackRequest={handleTrackRequest} 
            setTrackingIdInput={setTrackingIdInput} 
            setView={setView} 
          />
        )}
        
        {/* หน้าติดตามสถานะ */}
        {view === 'track' && (
       <TrackView
  trackingIdInput={trackingIdInput}
  setTrackingIdInput={
    setTrackingIdInput
  }
  handleTrackRequest={
    handleTrackRequest
  }
  handleLegacyTrackRequest={
    handleLegacyTrackRequest
  }
  trackResult={trackResult}
  loading={loading}
  error={error}
  setView={setView}
/>
        )}

        {/* ----------------------------------------------------
            ✅ ระบบเจ้าหน้าที่ (ADMIN / STAFF SYSTEM)
            ---------------------------------------------------- */}

        {/* หน้า Login เจ้าหน้าที่ */}
        {view === 'admin-login' && (
          <AdminLoginView 
            setView={setView} 
            onLoginSuccess={handleAdminLoginSuccess} 
          />
        )}

        {/* หน้าแดชบอร์ดหลักของเจ้าหน้าที่ (แสดงเมื่อล็อกอินแล้วเท่านั้น) */}
        {view === 'admin-dashboard' && isAdmin && (
          <AdminView onLogout={handleAdminLogout} />
        )}
      </main>

      {/* ซ่อน Footer ปกติเมื่ออยู่ในโหมดเจ้าหน้าที่ */}
      {!['admin-login', 'admin-dashboard'].includes(view) && <Footer />}
    </div>
  );
};

export default App;