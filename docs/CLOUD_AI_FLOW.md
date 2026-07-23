# Flow การทำงานของ AI ทำนายเมฆ

ระบบทำนายเมฆมี **3 ชั้น AI** ทำงานร่วมกัน วนทุก 1 นาที ใน service `predict`
(`scripts/predict_sky.py`) แล้วส่งผลให้ frontend แสดงกราฟผ่าน API

---

## ภาพรวม Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│  predict_sky.py  (รันทุก 1 นาที ใน container "predict")       │
└─────────────────────────────────────────────────────────────┘
        │
        │ 1. ดึงรูป + sky status จาก NARIT API (ทุกหอ 9 แห่ง)
        ▼
  fetch_skycamera(obs_id)
        │  → narit_image_url, narit_sky_status, narit_cloud_percent
        │  → ดาวน์โหลดรูป .jpg
        ▼
  ┌──────────────────────────────────────────────────┐
  │ 2. นับ % เมฆจากรูป (Computer Vision)              │
  │    calc_cloud_percent_fastsam()                  │
  └──────────────────────────────────────────────────┘
        │
        ├─ เช็คความสว่างเฉลี่ย (mean_brightness)
        │
        ├─ กลางคืน (brightness < 60) → return None
        │        └─→ fallback ใช้ narit_cloud_percent แทน
        │
        └─ กลางวัน → FastSAM (YOLO segmentation)
                 ├─ mask วงกลมเฉพาะท้องฟ้า
                 ├─ แบ่ง segment ด้วย FastSAM-s.pt
                 ├─ segment ที่สว่างกว่า threshold = เมฆ
                 │   (threshold ปรับตามแต่ละหอ THRESHOLD_OFFSET)
                 └─→ pixel_cloud_percent (% เมฆจริง)
        │
        ▼
  ┌──────────────────────────────────────────────────┐
  │ 3a. AI Fusion Trend (LLM)  — ทุกนาที             │
  │     ai_fusion_trend()                            │
  └──────────────────────────────────────────────────┘
        │  ส่งเมฆ 5 นาทีล่าสุด + sensor → deepseek-v4-flash
        │  (NARIT LiteLLM endpoint)
        └─→ ai_trend, ai_prediction (ข้อความสั้นๆ ภาษาไทย)
        │
        ▼   เก็บลง weather_realtime + weather_history
        │
  ┌──────────────────────────────────────────────────┐
  │ 3b. ทำนายเมฆ 1 ชม. (LLM) — ทุก 5 รอบ            │
  │     predict_cloud_1h()                           │
  └──────────────────────────────────────────────────┘
        │  ส่ง history 24 ชม. + 30 นาทีล่าสุด → LLM
        └─→ 12 ค่า (ทุก 5 นาที = 60 นาที ข้างหน้า)
            เก็บลง weather_cloud_predictions
```

---

## รายละเอียดแต่ละชั้น

### ชั้น 1 — Computer Vision (FastSAM / YOLO)
ไฟล์: `scripts/predict_sky.py` → `calc_cloud_percent_fastsam()` (บรรทัด ~201)

- โมเดล `FastSAM-s.pt` ทำ segmentation แบ่งวัตถุในรูปท้องฟ้า
- สร้าง mask วงกลมเฉพาะส่วนท้องฟ้า (ตัดขอบกล้องออก)
- เลือกเฉพาะ segment ที่อยู่ในวงท้องฟ้า + สว่างกว่า threshold → นับเป็นเมฆ
- threshold ปรับแยกตามแต่ละหอ ด้วย `THRESHOLD_OFFSET` (กล้องแต่ละตัวสว่างไม่เท่ากัน)
- ผลลัพธ์: `pixel_cloud_percent` = % เมฆจากภาพจริง
- **กลางคืน** (mean_brightness < 60) ภาพมืดเกินไป → คืน `None`
  แล้ว fallback ไปใช้คะแนนเมฆจาก NARIT (`narit_cloud_percent`) แทน

### ชั้น 2 — LLM วิเคราะห์ Trend (ทุกนาที)
ไฟล์: `scripts/predict_sky.py` → `ai_fusion_trend()` (บรรทัด ~96)

- ส่งค่าเมฆ 5 นาทีล่าสุด + ความชื้น + ฝน + สถานะ NARIT ให้ `deepseek-v4-flash`
  (ผ่าน NARIT LiteLLM endpoint)
- คืนคำอธิบายแนวโน้มสั้นๆ ภาษาไทย เช่น "เมฆเพิ่มขึ้น 15% ใน 5 นาที คาดว่าจะมืดครึ้ม"
- เก็บลงฟิลด์ `ai_trend`, `ai_prediction` ใน `weather_realtime`

### ชั้น 3 — LLM ทำนายล่วงหน้า 1 ชม. (ทุก 5 รอบ ≈ 5 นาที)
ไฟล์: `scripts/predict_sky.py` → `predict_cloud_1h()` (บรรทัด ~54)

- ส่งประวัติเมฆ 24 ชม. (รายชั่วโมง) + 30 นาทีล่าสุด (ละเอียด 5 นาที) ให้ LLM
- LLM คืน 12 จุด (ทุก 5 นาที = 60 นาทีข้างหน้า) ค่าเป็น % เมฆ 0-100
- เก็บลง collection `weather_cloud_predictions`

---

## ฝั่งแสดงผล (Frontend)

```
weather_cloud_predictions ─┐
weather_history ───────────┤→ /api/cloud-prediction ──→ CloudForecastChart.tsx
                            │   (route.ts)                 (กราฟ)
```

ไฟล์ API: `app/api/cloud-prediction/route.ts`
ไฟล์กราฟ: `components/CloudForecastChart.tsx`

- API ส่ง `history` (ค่าจริง 24 ชม.) + `predictions` (ค่าทำนายจาก LLM)
- กราฟวาด 2 เส้น:
  - **เส้นเขียว** = ค่าจริง (SAM กลางวัน / NARIT กลางคืน)
  - **เส้นเหลืองประ** = ค่าทำนาย
- frontend **ยังคำนวณ trend เองด้วย** (`trendSlope`, `backtest`):
  - ทำนายย้อนหลังเทียบค่าจริง → แสดง "คลาดเคลื่อนเฉลี่ย"
  - ต่อเส้นทำนายอนาคต 15 นาที ด้วย linear trend

---

## MongoDB Collections ที่เกี่ยวข้อง

| Collection                   | เก็บอะไร                                      |
|------------------------------|----------------------------------------------|
| `weather_realtime`           | ค่าล่าสุดของแต่ละหอ + ai_trend / ai_prediction |
| `weather_history`            | จุดข้อมูลย้อนหลัง (เก็บ 15 วัน)                 |
| `weather_cloud_predictions`  | ค่าทำนายเมฆ 1 ชม. ข้างหน้า (12 จุด)            |

---

## หมายเหตุ: train_sky_cnn.py

มีสคริปต์เทรน CNN (ResNet, 4 คลาส: clear / cloudy / partly_cloudy / rain)
อยู่ที่ `scripts/train_sky_cnn.py` — เป็น classifier แยกต่างหาก
แต่ pipeline production จริงตอนนี้ใช้ **FastSAM + LLM** เป็นหลัก
ยังไม่ได้เรียกโมเดล CNN ตัวนี้ใน `predict_sky.py`

---

## 2 จุดสำคัญที่ควรเข้าใจ

1. **AI ซ้อน 2 แบบ** — CV (FastSAM) วัดเมฆ "ตอนนี้" จากภาพ
   ส่วน LLM ทำนาย "อนาคต" จากแนวโน้มตัวเลข
2. **ทำนายซ้ำ 2 ที่** — ทั้ง backend (LLM → `weather_cloud_predictions`)
   และ frontend (linear trend) ต่างทำนายเอง
