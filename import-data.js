/**
 * สคริปต์สำหรับ Import ข้อมูลจาก CSV เข้าสู่ Firebase Firestore
 * วิธีใช้:
 * 1. วางไฟล์ serviceAccountKey.json ไว้ในโฟลเดอร์เดียวกับไฟล์นี้
 * 2. เตรียมไฟล์ data.csv
 * 3. รันคำสั่ง: npm install firebase-admin csv-parser
 * 4. รันคำสั่ง: node import-data.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

// 1. ตั้งค่าการเชื่อมต่อ (เปลี่ยนชื่อไฟล์ให้ตรงกับที่ดาวน์โหลดมา)
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ⚠️ ปรับแก้ตรงนี้ให้ตรงกับ Path ที่คุณใช้ในโปรเจกต์
const COLLECTION_PATH = 'cctv_requests'; 

const results = [];

console.log('--- เริ่มการอ่านไฟล์ CSV ---');

fs.createReadStream('data.csv') // ชื่อไฟล์ CSV ของคุณ
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', async () => {
    console.log(`อ่านไฟล์เสร็จสิ้น พบข้อมูล ${results.length} รายการ`);
    console.log('--- กำลังนำข้อมูลขึ้น Firebase ---');

    for (const item of results) {
      try {
        // จัดเตรียมข้อมูลให้ตรงตาม CCTVRequest Interface ล่าสุด
        const docData = {
          trackingId: item.trackingId || `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          status: item.status || 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          
          // ข้อมูลจาก FormData / Spreadsheet
          name: item.name || 'ไม่ระบุชื่อ',
          nationalId: item.nationalId || '',
          phone: item.phone || '',
          email: item.email || '',
          eventDate: item.eventDate || '',
          eventTimeStart: item.eventTimeStart || '',
          eventTimeEnd: item.eventTimeEnd || '',
          eventType: item.eventType || 'อื่นๆ',
          accidentSubtype: item.accidentSubtype || '',
          location: item.location || '',
          latitude: item.latitude ? parseFloat(item.latitude) : 0,
          longitude: item.longitude ? parseFloat(item.longitude) : 0,
          description: item.description || '',
          deliveryMethod: item.deliveryMethod || 'online',

          // ไฟล์แนบ (เริ่มต้นเป็นค่าว่าง)
          attachments: {
            idCard: item.idCardUrl || '',
            report: item.reportUrl || '',
            scene: item.sceneUrls ? item.sceneUrls.split(',') : []
          },

          // ประวัติและการจัดการ
          adminNote: item.adminNote || '',
          statusHistory: [
            {
              status: item.status || 'pending',
              timestamp: new Date(),
              note: 'นำเข้าข้อมูลจากฐานข้อมูลเดิม (Bulk Import)'
            }
          ]
        };

        // เพิ่มข้อมูลลง Firestore
        await db.collection(COLLECTION_PATH).add(docData);
        console.log(`✅ สำเร็จ: ${docData.trackingId}`);
      } catch (error) {
        console.error(`❌ ผิดพลาดที่รายการ ${item.trackingId || 'N/A'}:`, error);
      }
    }

    console.log('--- ดำเนินการเสร็จสิ้นทั้งหมด ---');
    process.exit();
  });