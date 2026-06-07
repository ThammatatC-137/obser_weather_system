# 🔭 Observatory Weather System

ระบบ dashboard เฝ้าสภาพอากาศ **9 หอดูดาว** ของ NARIT แบบ realtime สำหรับประเมินว่าหอไหน "เปิดโดม / ดูดาวได้" พร้อม AI วิเคราะห์ภาพท้องฟ้าจากกล้อง all-sky และทำนายปริมาณเมฆล่วงหน้า

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · MongoDB · Python (FastSAM / PyTorch) · LiteLLM (DeepSeek) · Docker

---

## ✨ ฟีเจอร์หลัก

- **Realtime dashboard** — ลูกโลก 3D (globe.gl) + การ์ดทุกหอ พร้อมคะแนนความพร้อมดูดาว 0–100
- **หน้ารายหอ** — sensor 8 ตัว, Sun & Moon, พยากรณ์ 15 วัน, กราฟย้อนหลัง 24 ชม.
- **AI Command Center** (รายหอ) — sky camera timelapse, วิเคราะห์เมฆด้วย FastSAM, แชท AI, event log
- **ทำนายเมฆ ±15 นาที** — เปรียบเทียบค่าจริง vs ค่าทำนายจาก LLM
- **หาที่ดูดาว** (`/find`) — แผนที่ + ค้นหาสถานที่ + GPS + จุดท้องฟ้ามืดทั่วโลก (ดึง Open-Meteo ตรง)

---

## 🏗️ สถาปัตยกรรม

```
NARIT API · Open-Meteo                    (แหล่งข้อมูลภายนอก)
        │
        ├── collect_weather.py  ──┐
        └── predict_sky.py      ──┤        (Python collectors)
                                  ▼
                          MongoDB (observatory_weather)
                                  │
                          Next.js API Routes
                                  │
                          React Frontend                 (เว็บ port 3001)
```

มี 3 service ใน `docker-compose.yml`:

| Service | Dockerfile | หน้าที่ |
|---------|-----------|---------|
| `web`       | `Dockerfile.web`       | Next.js (port 3001) |
| `collector` | `Dockerfile.collector` | ดึงข้อมูล NARIT + Open-Meteo → MongoDB |
| `predict`   | `Dockerfile.predict`   | FastSAM นับ % เมฆ + LLM ทำนาย |

---

## 🚀 เริ่มใช้งาน

### Frontend (development)

```bash
npm install
npm run dev          # เปิดที่ http://localhost:3001
```

### Collectors (Python)

```bash
cd scripts
pip install -r requirements.txt          # สำหรับ collect_weather.py
pip install -r requirements-predict.txt  # สำหรับ predict_sky.py (ต้องมี FastSAM-s.pt)

python collect_weather.py    # realtime 1 นาที / forecast 1 ชม. / hourly
python predict_sky.py        # FastSAM + AI ทุก 1 นาที
```

### Docker (production)

```bash
docker compose up -d --build
```

---

## 🔑 Environment Variables (`.env.local`)

| ตัวแปร | ใช้ทำอะไร |
|--------|-----------|
| `MONGODB_URI` | connection string ของ MongoDB |
| `GROQ_API_KEY` | คีย์เรียก Groq (ทำนายเมฆ/วิเคราะห์ใน predict_sky) |
| `GEMINI_API_KEY` | คีย์เรียก Gemini (แชต AI ในเว็บ) |
| `NEXT_PUBLIC_GEOAPIFY_KEY` | geocode สำรองในหน้า `/find` (เปิดเผยฝั่ง client) |

---

## 🗄️ MongoDB Collections

| Collection | เนื้อหา |
|------------|---------|
| `weather_realtime` | ค่าล่าสุดของแต่ละหอ (1 doc/หอ) |
| `weather_history` | ค่าย้อนหลัง (เก็บ 7 วัน) |
| `weather_forecast` | พยากรณ์ 15 วัน/หอ |
| `weather_hourly` | รายชั่วโมง ย้อนหลัง 7 วัน + ล่วงหน้า 8 วัน |
| `weather_cloud_predictions` | ค่าทำนายเมฆ 1 ชม. ข้างหน้า (12 จุด/5 นาที) |

---

## 📂 โครงสร้างโปรเจกต์

```
app/
  api/                 # weather, history, forecast, cloud-prediction, ai-chat
  observatory/[id]/    # หน้ารายหอ
  find/                # หน้าหาที่ดูดาว
  page.tsx             # หน้าหลัก
components/             # GlobeMap, ObsCard, ObsAiChat, SparkChart, CloudForecastChart, ...
constants/             # observatories.ts (9 หอ, ธีมสี, timezone)
hooks/useWeather.ts    # ดึง /api/weather ทุก 1 นาที
lib/                   # mongodb, moonPhase, obsScore, skyPhoto
types/                 # TypeScript types
scripts/               # collect_weather, predict_sky, train_sky_cnn, collect_dataset
                       # + FastSAM-s.pt (โมเดล segment เมฆ)
public/                # sky-*.svg (รูป fallback ตามสภาพอากาศ)
```

---

## 🌐 หอดูดาวที่เฝ้า (9 แห่ง)

🇹🇭 TNO · APK · CCO · SKA · KKN  |  🇨🇳 GAO  ·  🇦🇺 SPB  ·  🇺🇸 SRO  ·  🇨🇱 PR8
