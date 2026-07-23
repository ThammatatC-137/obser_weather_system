# Observatory Weather System

ระบบ dashboard สำหรับเฝ้าสภาพอากาศของหอดูดาว NARIT จำนวน 9 แห่ง แบบ realtime
จุดประสงค์หลักคือช่วยให้คนเฝ้าหอดูดาวประเมินได้ว่าตอนนี้หอไหน "เปิดโดม / ดูดาวได้"
โดยรวมข้อมูลจากเซนเซอร์ตรวจอากาศ, ภาพจากกล้อง all-sky, พยากรณ์อากาศ และการวิเคราะห์ด้วย AI
มาไว้ในหน้าเดียว

โปรเจกต์นี้แยกการทำงานออกเป็น 3 ส่วน คือ ตัวเก็บข้อมูล (collector), ตัวประมวลผลภาพ
และทำนายด้วย AI (predict) และเว็บแสดงผล (web) ทั้งหมดต่อกับ MongoDB ตัวเดียวกัน

## เทคโนโลยีที่ใช้

- Frontend / API: Next.js 16 (App Router), React 19, TypeScript
- ฐานข้อมูล: MongoDB (ใช้ MongoDB Atlas)
- งานฝั่ง Python: FastSAM (PyTorch) สำหรับนับปริมาณเมฆจากภาพกล้อง
- AI: Groq (โมเดล Llama) สำหรับงานเบื้องหลัง และ Google Gemini สำหรับแชตในเว็บ
- แหล่งข้อมูลภายนอก: NARIT API (ข้อมูลอากาศ + กล้องท้องฟ้า) และ Open-Meteo (พยากรณ์)
- Deploy: Docker / docker-compose

## ฟีเจอร์หลัก

- หน้าหลัก: ลูกโลก 3 มิติ (globe.gl) แสดงตำแหน่งหอทั้ง 9 แห่ง พร้อมการ์ดของแต่ละหอ
  และคะแนนความพร้อมดูดาว 0–100 ที่คำนวณจากสภาพอากาศปัจจุบัน
- หน้ารายหอดูดาว: ค่าจากเซนเซอร์ 8 ตัว, ตำแหน่งดวงอาทิตย์และดวงจันทร์,
  พยากรณ์ 15 วัน และกราฟย้อนหลัง 24 ชั่วโมง
- ส่วน AI ของแต่ละหอ: ภาพ timelapse จากกล้อง all-sky, การวิเคราะห์ปริมาณเมฆด้วย FastSAM,
  แชตถาม AI และ event log
- การทำนายเมฆล่วงหน้า 15 นาที: เปรียบเทียบค่าจริงกับค่าที่ทำนายไว้บนกราฟ
- หน้าหาที่ดูดาว (`/find`): แผนที่ ค้นหาสถานที่ ใช้ GPS และจุดท้องฟ้ามืดทั่วโลก
  (หน้านี้ดึง Open-Meteo ตรงจากฝั่ง client)

## ภาพรวมการทำงาน

```
NARIT API, Open-Meteo            (แหล่งข้อมูลภายนอก)
        |
        |-- collect_weather.py    เก็บค่าอากาศ + พยากรณ์
        |-- predict_sky.py        นับเมฆด้วย FastSAM + วิเคราะห์/ทำนายด้วย AI
        |
        v
   MongoDB (observatory_weather)
        |
   Next.js API Routes
        |
   React Frontend                 (เว็บ port 3001)
```

ทั้งสามส่วนเป็น service แยกกันใน `docker-compose.yml`

| Service | Dockerfile | หน้าที่ |
|---------|-----------|---------|
| web | Dockerfile.web | เว็บ Next.js + API (port 3001) |
| collector | Dockerfile.collector | ดึงข้อมูล NARIT และ Open-Meteo มาเก็บใน MongoDB |
| predict | Dockerfile.predict | นับ % เมฆด้วย FastSAM และเรียก AI ทำนาย/วิเคราะห์ |

ตัว MongoDB ไม่ได้อยู่ใน docker-compose เพราะใช้ MongoDB Atlas (cloud) ข้อมูลทั้งหมดเก็บไว้บน Atlas

## รายละเอียดแต่ละส่วน

### collect_weather.py (collector)

ทำงานเป็น loop ตลอดเวลา แบ่งงานตามรอบเวลา

- ทุก 1 นาที: ดึงค่าอากาศ realtime ของทุกหอจาก NARIT มาเก็บใน `weather_realtime` และ `weather_history`
- ทุก 1 ชั่วโมง: ดึงพยากรณ์ 15 วันจาก Open-Meteo เก็บใน `weather_forecast`
- ทุก 6 ชั่วโมง: ดึงข้อมูลรายชั่วโมงย้อนหลัง 7 วัน
- ทุก 1 ชั่วโมง: ดึงข้อมูลรายชั่วโมงล่วงหน้า 8 วัน
- ลบข้อมูลย้อนหลังที่เกิน 15 วันทิ้งอัตโนมัติ

ส่วนนี้ดึงข้อมูลอย่างเดียว ไม่ได้เรียก AI

### predict_sky.py (predict)

ทำงานทุก 1 นาที ในแต่ละรอบจะวนดึงภาพกล้อง all-sky ของทุกหอ แล้วใช้ FastSAM
นับปริมาณเมฆเป็นเปอร์เซ็นต์ (กลางคืนภาพมืดเกินไปจะใช้ค่าสถานะจาก NARIT แทน)
แล้วบันทึกลง `weather_realtime` กับ `weather_history`

ส่วนที่เรียก AI มี 2 อย่าง คือ
- วิเคราะห์ trend เมฆ 5 นาทีล่าสุด แล้วเขียนคำอธิบายสั้น ๆ + คาดการณ์ระยะใกล้
- ทำนายปริมาณเมฆล่วงหน้า 15 นาที (3 จุด ทุก 5 นาที)

เพื่อไม่ให้ยิง AI ถี่เกินไป ระบบจะ "วนทีละหอ" คือแต่ละนาทีเรียก AI ให้หอเดียว
ไล่ครบทั้ง 9 หอใน 9 นาทีแล้ววนใหม่ ทำให้ส่งคำขอประมาณ 2 ครั้งต่อนาที
(ราว 2,880 ครั้งต่อวัน) ส่วนการนับเมฆด้วย FastSAM และการเก็บข้อมูลยังทำครบทุกหอทุกนาทีเหมือนเดิม

งาน AI ฝั่งนี้ใช้ Groq (โมเดล llama-3.1-8b-instant) เพราะโควต้าฟรีต่อวันสูงพอกับการยิงต่อเนื่อง

### web (Next.js)

เว็บแสดงผลและมี API routes อยู่ใน `app/api/` (weather, history, forecast, cloud-prediction, ai-chat)
แชต AI ในเว็บ (`/api/ai-chat`) ใช้ Google Gemini (gemini-2.5-flash) เป็นหลัก
ถ้า Gemini ตอบไม่ได้ชั่วคราว (เช่นคนใช้เยอะ) ระบบจะสลับไปใช้ Groq ให้อัตโนมัติ
ผู้ใช้จึงแทบไม่เจอข้อความ error แชตจะยิง AI เฉพาะตอนที่ผู้ใช้พิมพ์ถามเท่านั้น ไม่มีการยิงอัตโนมัติ

## การติดตั้งและรัน

### รันแบบ development (เฉพาะเว็บ)

```bash
npm install
npm run dev
```

เปิดที่ http://localhost:3001

### รันสคริปต์ Python แยก

```bash
cd scripts
pip install -r requirements.txt           # สำหรับ collect_weather.py
pip install -r requirements-predict.txt   # สำหรับ predict_sky.py (ต้องมีไฟล์ FastSAM-s.pt)

python collect_weather.py
python predict_sky.py
```

### รันด้วย Docker (production)

```bash
docker compose up -d --build
```

ก่อนรันต้องสร้างไฟล์ `.env.local` ก่อน เพราะไม่ได้เก็บไว้ใน git (กันคีย์หลุด)

## Environment Variables (`.env.local`)

| ตัวแปร | ใช้ทำอะไร |
|--------|-----------|
| MONGODB_URI | connection string ของ MongoDB Atlas |
| GROQ_API_KEY | คีย์เรียก Groq (ใช้ใน predict_sky และเป็นตัวสำรองของแชต) |
| GEMINI_API_KEY | คีย์เรียก Gemini (แชต AI ในเว็บ) |
| NEXT_PUBLIC_GEOAPIFY_KEY | geocode สำรองในหน้า /find (เปิดเผยฝั่ง client) |

## MongoDB Collections

| Collection | เนื้อหา |
|------------|---------|
| weather_realtime | ค่าล่าสุดของแต่ละหอ (1 เอกสารต่อหอ) |
| weather_history | ค่าย้อนหลัง เก็บ 15 วัน |
| weather_forecast | พยากรณ์ 15 วันต่อหอ |
| weather_hourly | รายชั่วโมง ย้อนหลัง 7 วัน และล่วงหน้า 8 วัน |
| weather_cloud_predictions | ค่าทำนายเมฆล่วงหน้า 15 นาที (3 จุด ทุก 5 นาที) |

## โครงสร้างโปรเจกต์

```
app/
  api/                 weather, history, forecast, cloud-prediction, ai-chat
  observatory/[id]/    หน้ารายหอ
  find/                หน้าหาที่ดูดาว
  page.tsx             หน้าหลัก
components/             GlobeMap, ObsCard, AiChat, ObsAiChat, CloudForecastChart, ...
constants/             observatories.ts (รายชื่อ 9 หอ, ธีมสี, timezone)
hooks/useWeather.ts    ดึง /api/weather ทุก 1 นาที
lib/                   mongodb, moonPhase, obsScore, skyPhoto
types/                 TypeScript types
scripts/               collect_weather.py, predict_sky.py, train_sky_cnn.py
                       + FastSAM-s.pt (โมเดลที่ใช้ segment เมฆ)
public/                รูป sky-*.svg ใช้เป็น fallback ตามสภาพอากาศ
```

## หอดูดาวที่เฝ้า (9 แห่ง)

ไทย: TNO, APK, CCO, SKA, KKN
ต่างประเทศ: GAO (จีน), SPB (ออสเตรเลีย), SRO (สหรัฐฯ), PR8 (ชิลี)

## หมายเหตุ

- ข้อมูลอากาศและภาพกล้องดึงจาก NARIT API ซึ่งเป็น endpoint สาธารณะ ไม่ต้องใช้คีย์
- ไฟล์โมเดล FastSAM-s.pt ถูกเก็บไว้ใน repo อยู่แล้ว ตัว predict ใช้ไฟล์นี้ในการนับเมฆ
- ตอน deploy บนเครื่องใหม่ ต้องสร้าง `.env.local` ขึ้นมาเองและใส่คีย์ให้ครบ
  เพราะไฟล์นี้ไม่ได้ถูก commit ขึ้น git
