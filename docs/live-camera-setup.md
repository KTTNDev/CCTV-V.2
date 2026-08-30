# การเชื่อมกล้อง RTSP เข้าหน้า Live Cameras

หน้าเว็บไม่ควรเชื่อม RTSP จากกล้องโดยตรง เพราะเว็บเบราว์เซอร์ไม่รองรับ RTSP และการเปิดเผย URL จะทำให้ IP, username และ password ของกล้องรั่วไหลได้

สถาปัตยกรรมที่ใช้:

```text
กล้อง RTSP ──หนึ่งการเชื่อมต่อ──> MediaMTX ──WebRTC──> ผู้ชมเว็บไซต์
```

## 1. ติดตั้ง MediaMTX บนเครื่องหรือเซิร์ฟเวอร์ในศูนย์ CCTV

กำหนดเฉพาะกล้องที่ผ่านการอนุมัติให้เผยแพร่ โดยใช้ sub-stream ความละเอียดประมาณ 640×360 หรือ 854×480, H.264 และ 10–15 FPS เพื่อลด bandwidth

ตัวอย่าง `mediamtx.yml` ฝั่งเซิร์ฟเวอร์ ห้าม commit ค่าจริงลง Git:

```yaml
pathDefaults:
  sourceOnDemand: true
  sourceOnDemandStartTimeout: 10s
  sourceOnDemandCloseAfter: 10s
  maxReaders: 50
  rtspTransport: tcp

paths:
  public/flood-01:
    source: rtsp://USERNAME:PASSWORD@CAMERA_PRIVATE_IP:554/SUB_STREAM_PATH

  public/traffic-01:
    source: rtsp://USERNAME:PASSWORD@CAMERA_PRIVATE_IP:554/SUB_STREAM_PATH

  public/tourism-01:
    source: rtsp://USERNAME:PASSWORD@CAMERA_PRIVATE_IP:554/SUB_STREAM_PATH
```

`sourceOnDemand: true` ทำให้ MediaMTX เชื่อมไปยังกล้องเมื่อมีผู้ชมเท่านั้น และตัดการเชื่อมต่อหลังไม่มีผู้ชมตามเวลาที่กำหนด

## 2. เปิด WebRTC Gateway ผ่าน HTTPS

Production ควรใช้โดเมน เช่น:

```text
https://stream.rawai.go.th
```

ให้ reverse proxy HTTPS ไปยัง WebRTC HTTP listener ของ MediaMTX และกำหนด firewall/NAT สำหรับ WebRTC ตามคู่มือของ MediaMTX ห้ามใช้ `http://` บนเว็บไซต์ production ที่เป็น `https://` เพราะเบราว์เซอร์จะบล็อก mixed content

## 3. ตั้งค่าหน้าเว็บ

เพิ่มลง `.env.local`:

```dotenv
NEXT_PUBLIC_STREAM_GATEWAY_URL=https://stream.rawai.go.th
```

จากนั้น restart development server หรือ build ใหม่:

```powershell
npm run dev
```

## 4. แก้รายการกล้อง

หลัง Deploy ระบบแล้ว ให้เข้าสู่หน้า Admin และเลือก **จัดการกล้อง** เพื่อเพิ่มชื่อ หมวดหมู่ สถานที่ พิกัด อุปกรณ์ IP และ `streamPath` โดย `streamPath` ต้องตรงกับ path ใน `mediamtx.yml`

ข้อมูลถูกแยกเก็บดังนี้:

- `public_cameras` — เฉพาะข้อมูลที่อนุญาตให้ประชาชนอ่าน
- `camera_private_configs` — IP, RTSP path, ข้อมูลอุปกรณ์และทรัพย์สิน อ่านได้เฉพาะ Admin
- `audit_logs` — ประวัติการเพิ่ม แก้ไข และเก็บกล้องเข้าคลัง

Deploy Function และ Rules ที่รองรับระบบนี้:

```powershell
firebase deploy --only firestore:rules
firebase deploy --only functions:manageCamera
firebase deploy --only hosting
```

ห้ามใส่สิ่งต่อไปนี้ใน `NEXT_PUBLIC_*` หรือ `lib/public-cameras.ts`:

- RTSP URL เต็ม
- IP ภายในของกล้อง
- username หรือ password
- token สำหรับระบบหลังบ้าน

หน้า Admin รับเฉพาะ IP/hostname, RTSP port และ RTSP path โดยตั้งใจไม่รับ username/password ของกล้อง ให้เก็บ credential จริงไว้ที่ MediaMTX, Secret Manager หรือระบบจัดการความลับของหน่วยงาน

## 5. แนวทางลด bandwidth

- ใช้ sub-stream H.264 แยกจาก main stream ที่ใช้บันทึก
- ตั้ง bitrate ประมาณ 350–800 Kbps ตามความละเอียดและภาพเคลื่อนไหว
- ใช้ 10–15 FPS สำหรับกล้องสาธารณะทั่วไป
- เปิด `sourceOnDemand`
- หน้าเว็บเริ่มต้นโดยไม่ autoplay และจำกัดโหมดหลายกล้องไว้สูงสุด 4 กล้อง
- หากมีผู้ชมจำนวนมาก ให้เพิ่ม CDN/HLS เป็น fallback แทนการเพิ่มการเชื่อมต่อ RTSP ไปยังกล้อง

ก่อนเผยแพร่จริงควรตรวจมุมกล้อง พื้นที่ส่วนบุคคล การ mask ภาพ ป้ายแจ้งเตือน นโยบายเก็บ log และการอนุมัติจากผู้รับผิดชอบข้อมูลของหน่วยงาน
