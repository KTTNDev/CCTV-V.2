# การตั้งค่าแจ้งคำร้องผ่าน LINE

ระบบนี้ใช้ **LINE Messaging API ผ่าน LINE Official Account** เพราะ LINE Notify
ยุติบริการแล้วตั้งแต่วันที่ 31 มีนาคม 2568

## สิ่งที่ต้องเตรียม

1. LINE Official Account ที่เชื่อมกับ Messaging API channel
2. Channel access token สำหรับ Messaging API
3. ปลายทางที่จะรับข้อความอย่างใดอย่างหนึ่ง
   - User ID ของเจ้าหน้าที่
   - Group ID ของกลุ่มเจ้าหน้าที่
   - Room ID ของห้องสนทนา

ถ้าจะส่งเข้ากลุ่ม ต้องอนุญาตให้ bot เข้าร่วมกลุ่ม และเพิ่ม Official Account
เข้าไปในกลุ่มก่อน ค่า Group ID ต้องอ่านจาก `source.groupId` ใน webhook event
ของกลุ่มนั้น ไม่ใช่ชื่อกลุ่มหรือ LINE ID ที่มองเห็นในแอป

## Secrets ที่ Functions ใช้

รันจากโฟลเดอร์รากของโครงการ และวางค่าจริงเมื่อระบบถาม ห้ามเขียน token
ลงใน source code, Firestore หรือ environment variable ที่ขึ้นต้นด้วย
`NEXT_PUBLIC_`

```powershell
firebase functions:secrets:set LINE_CHANNEL_ACCESS_TOKEN
firebase functions:secrets:set LINE_NOTIFICATION_TARGET_ID
```

ชื่อเดิม `LINE_ADMIN_USER_ID` ยังใช้เป็น fallback ได้ชั่วคราว แต่การตั้งค่าใหม่ควรใช้
`LINE_NOTIFICATION_TARGET_ID` เพราะรองรับทั้งผู้ใช้ กลุ่ม และห้องสนทนา

URL ระบบเจ้าหน้าที่มีค่าเริ่มต้นเป็น `https://db-rawaicctv.web.app/` หากเปลี่ยน
โดเมน ให้กำหนด `STAFF_PORTAL_BASE_URL` ใน environment ของ Functions โดยต้องเป็น
HTTP/HTTPS เท่านั้น

## Deploy และทดสอบ

```powershell
firebase deploy --only functions:processNotificationOutbox
```

จากนั้นยื่นคำร้องทดสอบหนึ่งรายการ ข้อความควรมีเลขคำร้อง ประเภทเหตุ สถานที่
ช่วงเวลา เวลารับเรื่อง สถานะ และปุ่ม **เปิดคำร้องนี้** เมื่อเจ้าหน้าที่กดปุ่ม:

1. ผู้ที่ยังไม่เข้าสู่ระบบจะเห็นหน้า Login เจ้าหน้าที่
2. ระบบตรวจสิทธิ์ Admin ตามปกติ ไม่มีการข้ามรหัสผ่าน
3. หลัง Login สำเร็จ ระบบเปิดรายละเอียดคำร้องนั้นโดยตรง

ข้อความ LINE จงใจไม่ส่งเลขบัตรประชาชน หนังสือเดินทาง เบอร์โทร อีเมล
URL ไฟล์แนบ หรือข้อมูลรับรองระบบ เพื่อจำกัดผลกระทบหากมีการส่งต่อข้อความ

## ความทนทานของระบบ

- การส่งคำร้องไม่ล้ม แม้ยังไม่ได้ตั้งค่า LINE
- งานแจ้งเตือนถูกแยกไว้ใน `notification_outbox`
- ใช้ retry key เดิมเมื่อส่งซ้ำ เพื่อช่วยป้องกันข้อความซ้ำ
- ส่งซ้ำเฉพาะกรณี timeout, network error, HTTP 429 หรือ HTTP 5xx
- ความผิดพลาดถาวรถูกเก็บเป็น `dead_letter` เพื่อตรวจสอบภายหลัง
