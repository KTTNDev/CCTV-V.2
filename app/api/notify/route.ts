import { NextResponse } from 'next/server';

// ✅ อ่านค่าจาก Environment Variables เท่านั้น (ห้าม hardcode secret ในซอร์สโค้ดเด็ดขาด)
// ตั้งค่าใน Vercel/Firebase: Settings > Environment Variables
//   LINE_CHANNEL_ACCESS_TOKEN=xxxx
//   LINE_ADMIN_USER_ID=xxxx
const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_USER_ID = process.env.LINE_ADMIN_USER_ID;

// 🎨 กำหนดสีตามความเร่งด่วน/ประเภท
const EVENT_COLORS: Record<string, string> = {
  'อุบัติเหตุ': '#EF4444', // สีแดง
  'อาชญากรรม': '#EF4444', // สีแดง
  'ทะเลาะวิวาท': '#F97316', // สีส้ม
  'ของหาย': '#3B82F6', // สีฟ้า
  'default': '#06C755' // สีเขียว LINE
};

export async function POST(request: Request) {
  try {
    // 🔍 Debug: เช็คว่าใน Production มีค่าเหล่านี้หรือไม่ (Log จะไปขึ้นใน Console ของ Hosting ที่ใช้)
    console.log("🔔 API Notify Started...");
    
    if (!LINE_ACCESS_TOKEN) {
        console.error("❌ Error: LINE_CHANNEL_ACCESS_TOKEN missing");
        return NextResponse.json({ success: false, error: 'LINE Token Missing' }, { status: 500 });
    }
    
    if (!LINE_USER_ID) {
        console.error("❌ Error: LINE_ADMIN_USER_ID missing");
        return NextResponse.json({ success: false, error: 'LINE User ID Missing' }, { status: 500 });
    }

    const body = await request.json();
    const { 
      trackingId, 
      name, 
      location, 
      eventType, 
      date, 
      time
    } = body;

    console.log(`📝 Processing notification for: ${trackingId}`);

    // 1. เลือกสีตามประเภทเหตุการณ์
    const eventKey = Object.keys(EVENT_COLORS).find(k => eventType.includes(k)) || 'default';
    const headerColor = EVENT_COLORS[eventKey] || EVENT_COLORS['default'];

    // 2. สร้าง Flex Message แบบใหม่ (เน้น Icon)
    const flexMessage = {
      type: "flex",
      altText: `🔔 แจ้งเหตุใหม่: ${eventType}`,
      contents: {
        type: "bubble",
        // ❌ เอาส่วน hero (รูปภาพ) ออกตามคำขอ เพื่อความกระชับและแก้ปัญหาภาพไม่ขึ้น
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            // หัวข้อเหตุการณ์
            {
              type: "text",
              text: "คำร้องขอ CCTV ใหม่",
              weight: "bold",
              size: "lg",
              color: headerColor
            },
            {
              type: "text",
              text: eventType, // แสดงประเภทตัวใหญ่ๆ
              weight: "bold",
              size: "xl",
              margin: "xs",
              color: "#1F2937"
            },
            {
              type: "separator",
              margin: "lg"
            },
            // รายละเอียด
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "ID",
                      color: "#9CA3AF",
                      size: "sm",
                      flex: 1
                    },
                    {
                      type: "text",
                      text: trackingId,
                      wrap: true,
                      color: "#4B5563",
                      size: "sm",
                      flex: 4,
                      weight: "bold"
                    }
                  ]
                },
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "ผู้แจ้ง",
                      color: "#9CA3AF",
                      size: "sm",
                      flex: 1
                    },
                    {
                      type: "text",
                      text: name,
                      wrap: true,
                      color: "#4B5563",
                      size: "sm",
                      flex: 4
                    }
                  ]
                },
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "สถานที่",
                      color: "#9CA3AF",
                      size: "sm",
                      flex: 1
                    },
                    {
                      type: "text",
                      text: location,
                      wrap: true,
                      color: "#4B5563",
                      size: "sm",
                      flex: 4
                    }
                  ]
                },
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "เวลา",
                      color: "#9CA3AF",
                      size: "sm",
                      flex: 1
                    },
                    {
                      type: "text",
                      text: `${date} (${time})`,
                      wrap: true,
                      color: "#4B5563",
                      size: "sm",
                      flex: 4
                    }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary", // ปุ่มสีทึบ
              color: headerColor, // สีเดียวกับหัวข้อ
              height: "sm",
              action: {
                type: "uri",
                label: "ตรวจสอบคำร้อง",
                uri: "https://db-rawaicctv.web.app/" // 🔗 เปลี่ยนเป็น URL ใหม่ตามที่แจ้ง
              }
            }
          ]
        }
      }
    };

    // 3. ยิง Request ไปยัง LINE Messaging API (Push Message)
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: LINE_USER_ID,
        messages: [flexMessage]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Line API Error:', errorText);
      return NextResponse.json({ success: false, error: errorText }, { status: response.status });
    }

    console.log('✅ Notification Sent Successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Internal Server Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}