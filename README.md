# CCTV Rawai E-Service Portal

ระบบยื่นคำร้องขอข้อมูลภาพกล้องวงจรปิดออนไลน์ของเทศบาลตำบลราไวย์ รองรับการยื่นคำร้องและติดตามสถานะสำหรับประชาชน รวมถึงแดชบอร์ดจัดการคำร้อง รายงาน และ audit log สำหรับเจ้าหน้าที่

## สถาปัตยกรรม

- Next.js 16 + React 19 + TypeScript สำหรับ Web UI แบบ static export
- Firebase Hosting สำหรับหน้าเว็บและ route ไปยัง API
- Firebase Authentication สำหรับเจ้าหน้าที่
- Cloud Firestore และ Cloud Storage สำหรับข้อมูลคำร้องและไฟล์แนบ
- Cloud Functions รุ่นที่ 2 สำหรับ create, finalize, tracking, public stats และ admin update
- Firebase App Check สำหรับป้องกัน API ฝั่ง production
- MediaMTX หรือ Media Gateway แยกต่างหาก สำหรับแปลง RTSP เป็น WebRTC ให้หน้ากล้องออนไลน์สาธารณะ

## สิ่งที่ต้องติดตั้ง

- Node.js 22
- Java Development Kit สำหรับ Firestore/Storage Emulator
- Firebase CLI และบัญชีที่เข้าถึงโปรเจกต์ `db-rawaicctv`

ติดตั้ง dependencies:

```powershell
npm install
npm --prefix functions install
```

## Environment ของหน้าเว็บ

คัดลอกไฟล์ตัวอย่างและกรอก Firebase Web Config:

```powershell
Copy-Item .env.local.example .env.local
```

ค่าหลักอยู่ใน Firebase Console > Project settings > Your apps ส่วน `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY` มาจาก reCAPTCHA v3 provider ใน Firebase App Check และจำเป็นสำหรับ API บน production

ห้ามใส่ `RATE_LIMIT_HASH_KEY`, LINE access token หรือ service-account key ในตัวแปร `NEXT_PUBLIC_*` เพราะค่าเหล่านี้จะถูกส่งไปกับ JavaScript ฝั่งผู้ใช้

หน้ากล้องออนไลน์ใช้ `NEXT_PUBLIC_STREAM_GATEWAY_URL` ซึ่งต้องเป็น URL สาธารณะของ Media Gateway เท่านั้น ห้ามใส่ RTSP URL, IP, username หรือ password ของกล้อง ดูขั้นตอนเต็มที่ `docs/live-camera-setup.md`

## รันในเครื่องด้วย Emulator

Terminal ที่ 1:

```powershell
firebase emulators:start --only auth,functions,firestore,storage,hosting
```

Terminal ที่ 2:

```powershell
npm run dev
```

ตั้งค่า `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` ใน `.env.development.local` เมื่อต้องการให้เว็บที่ `http://localhost:3000` เชื่อม Emulator การเปิด Emulator ไม่ได้นำข้อมูล Firestore production ลงมาให้อัตโนมัติ

หากต้องการดูผล static build แบบเดียวกับ Firebase Hosting:

```powershell
npm run build
npm run preview
```

## ตรวจคุณภาพก่อน Deploy

รันทั้งหมดในคำสั่งเดียว:

```powershell
npm run check
```

คำสั่งนี้ตรวจ TypeScript, ESLint, production build และ Functions tests หากต้องการตรวจแยกส่วน:

```powershell
npm run typecheck
npm run lint
npm run build
npm run check:output
npm --prefix functions test
```

ก่อน Deploy ให้ตรวจทั้งโค้ดและ production environment โดยคำสั่งนี้จะรายงานเฉพาะชื่อค่าที่ขาดและจะไม่แสดง secret:

```powershell
npm run check:production
```

## Functions Secrets

ค่า rate-limit เป็นค่าบังคับสำหรับ Functions ที่เปิด API:

```powershell
firebase functions:secrets:set RATE_LIMIT_HASH_KEY
```

สร้างค่าที่ปลอดภัยบน PowerShell:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

LINE Messaging เป็นส่วนเสริม หากต้องการเปิดใช้งานจึงค่อยตั้งค่า:

```powershell
firebase functions:secrets:set LINE_CHANNEL_ACCESS_TOKEN
firebase functions:secrets:set LINE_ADMIN_USER_ID
```

ถ้ายังไม่มีค่า LINE ให้ Deploy เฉพาะ Functions หลักก่อน และยังไม่ Deploy `processNotificationOutbox`:

```powershell
firebase deploy --only functions:createRequest,functions:finalizeRequest,functions:trackRequest,functions:publicStats,functions:updateRequest,functions:manageCamera
```

## Deploy Firebase

ตรวจ project ที่เลือกก่อนทุกครั้ง:

```powershell
firebase use
npm run check
```

Deploy rules, storage, Functions หลัก และ Hosting:

```powershell
firebase deploy --only firestore:rules,storage
firebase deploy --only functions:createRequest,functions:finalizeRequest,functions:trackRequest,functions:publicStats,functions:updateRequest,functions:manageCamera
firebase deploy --only hosting
```

เมื่อมี LINE secrets ครบแล้ว สามารถ Deploy notification worker เพิ่มได้:

```powershell
firebase deploy --only functions:processNotificationOutbox
```

หลัง Deploy ให้ทดสอบอย่างน้อย 5 เส้นทาง: ยื่นคำร้องพร้อมไฟล์, ติดตามด้วย tracking token, เข้าสู่ระบบเจ้าหน้าที่, เปลี่ยนสถานะพร้อมหมายเหตุ และออกจากระบบแล้ว refresh ต้องไม่กลับเข้าแดชบอร์ด

## ข้อมูลเดิมและความปลอดภัย

- ข้อมูลเดิมอยู่ใน collection `cctv_requests` และยังอ่านผ่าน normalization layer ได้
- ประชาชนไม่สามารถอ่านหรือเขียน Firestore โดยตรง การยื่นและติดตามต้องผ่าน Cloud Functions
- เจ้าหน้าที่ต้องอยู่ใน allowlist/role ที่กำหนด และการแก้สถานะถูกบันทึกใน audit log
- ห้าม commit `.env.local`, `functions/.secret.local`, service-account key และไฟล์ข้อมูลจริงเข้าระบบ version control
