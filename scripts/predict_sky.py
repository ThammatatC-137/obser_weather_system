import os
import cv2
import requests
import pymongo
import schedule
import time
import numpy as np
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pathlib import Path
from ultralytics import YOLO

load_dotenv('../.env.local')

client = pymongo.MongoClient(os.getenv("MONGODB_URI"))
db     = client["observatory_weather"]

FASTSAM_PATH = Path("FastSAM-s.pt")

OBSERVATORIES = [
  { "id": "TNO", "name": "Thai National Observatory",   "lat": 18.57,  "lon": 98.48   },
  { "id": "APK", "name": "Astro Park Observatory",      "lat": 18.85,  "lon": 98.96   },
  { "id": "CCO", "name": "Chachoengsao Observatory",    "lat": 13.59,  "lon": 101.26  },
  { "id": "SKA", "name": "Songkhla Observatory",        "lat": 7.16,   "lon": 100.61  },
  { "id": "KKN", "name": "KhonKaen Observatory",        "lat": 16.76,  "lon": 102.62  },
  { "id": "GAO", "name": "Gao Mei Gu Observatory",      "lat": 26.70,  "lon": 100.03  },
  { "id": "SPB", "name": "Springbrook Observatory",     "lat": -28.22, "lon": 153.28  },
  { "id": "SRO", "name": "Sierra Remote Observatories", "lat": 36.97,  "lon": -119.40 },
  { "id": "PR8", "name": "PROMPT-8",                    "lat": -30.16, "lon": -70.80  },
]

NARIT_STATION = {
  'TNO': '1mtno', 'APK': 'astropark', 'CCO': 'cco', 'SKA': 'sko',
  'KKN': 'kkn',   'GAO': 'gao',       'SPB': 'sbo', 'SRO': 'sro', 'PR8': 'cto',
}

# ค่าปรับ threshold ของแต่ละหอ (แต่ละกล้องมีความสว่างไม่เท่ากัน)
THRESHOLD_OFFSET = {
  'TNO': -15,
  'KKN': -15,
  'GAO': -10,
  'SPB': -10,
  'SRO':   0,
  'PR8':   0,
  'APK':   0,
  'CCO':   0,
  'SKA':   5,
}

LITELLM_URL = "https://lllm.narit.or.th/v1/chat/completions"
LITELLM_KEY = os.getenv("LITELLM_API_KEY")

# ส่งข้อมูลย้อนหลัง 24 ชม. ให้ LLM ทำนายปริมาณเมฆ 1 ชม. ข้างหน้า (12 ค่า ทุก 5 นาที)
def predict_cloud_1h(obs_id: str, history_24h: list, current: dict) -> list:
    try:
        import json as _json
        pcts = [r.get('pixel_cloud_percent') for r in history_24h if r.get('pixel_cloud_percent') is not None]
        if len(pcts) < 6:
            return []

        # สุ่มเลือกค่ารายชั่วโมง สูงสุด 24 จุด
        step = max(1, len(pcts) // 24)
        hourly = [round(pcts[i], 1) for i in range(0, len(pcts), step)][-24:]
        # 30 นาทีล่าสุดแบบละเอียด (ทุก 5 นาที)
        recent = [round(p, 1) for p in pcts[-6:]]

        prompt = f"""ทำนายปริมาณเมฆหอดูดาว {obs_id} ล่วงหน้า 1 ชั่วโมง

เมฆ 24 ชม. (รายชั่วโมง): {' → '.join(map(str, hourly))}
เมฆ 30 นาทีล่าสุด (5-นาที): {' → '.join(map(str, recent))}
ตอนนี้: เมฆ {current.get('pixel_cloud_percent','--')}% ชื้น {current.get('humidity','--')}% ลม {current.get('wind_speed','--')} m/s ฝน {current.get('rain_rate',0)} mm/hr กดอากาศ {current.get('pressure','--')} hPa สภาพ {current.get('narit_sky_status','--')}

ตอบ JSON เท่านั้น (12 ค่า ทุก 5 นาที = 60 นาที, ค่าเป็น % เมฆ 0-100):
{{"p":[45,44,43,44,46,48,50,52,51,50,48,46]}}"""

        res = requests.post(
            LITELLM_URL,
            headers={'Authorization': f'Bearer {LITELLM_KEY}', 'Content-Type': 'application/json'},
            json={'model': 'deepseek-v4-flash', 'messages': [{'role': 'user', 'content': prompt}],
                  'max_tokens': 80, 'temperature': 0.2},
            timeout=20
        )
        content = res.json()['choices'][0]['message']['content'].strip()
        content = content.replace('```json','').replace('```','').strip()
        data = _json.loads(content)
        preds = data.get('p', [])
        if len(preds) == 12 and all(isinstance(v, (int, float)) for v in preds):
            return [max(0.0, min(100.0, float(v))) for v in preds]
        return []
    except Exception as e:
        print(f"  [WARN] Cloud predict {obs_id}: {e}")
        return []


# ส่งค่าเมฆ 5 นาทีย้อนหลัง + sensor ให้ LLM วิเคราะห์ trend และคำทำนายสั้นๆ
def ai_fusion_trend(obs_id: str, history_pcts: list, narit_status: str,
                    humidity: float, rain_rate: float) -> dict:
    try:
        valid = [p for p in history_pcts if p is not None]
        if len(valid) < 2:
            return {}

        trend_str = ' → '.join([f"{p}%" for p in history_pcts])

        first_pct = valid[0]
        last_pct  = valid[-1]
        delta     = round(last_pct - first_pct, 1)

        prompt = f"""วิเคราะห์ข้อมูลท้องฟ้าหอดูดาว {obs_id}:

ปริมาณเมฆ 5 นาทีที่ผ่านมา: {trend_str}
การเปลี่ยนแปลง: {'+' if delta >= 0 else ''}{delta}% ใน {len(valid)-1} นาที
สภาพท้องฟ้า (NARIT): {narit_status}
ความชื้น: {humidity}%
ฝน: {rain_rate} mm/hr

ตอบ JSON เท่านั้น ห้ามมีข้อความอื่น:
prediction ต้องระบุ % เมฆที่เปลี่ยนแปลงด้วย เช่น "เมฆเพิ่มขึ้น 15% ใน 5 นาที คาดว่าจะมืดครึ้มครับ"
{{"trend": "อธิบาย trend เมฆสั้นๆ ไม่เกิน 10 คำ", "prediction": "คาดการณ์ 15-30 นาทีข้างหน้า ระบุ % เมฆที่เปลี่ยน ไม่เกิน 20 คำ"}}"""

        res = requests.post(
            LITELLM_URL,
            headers={'Authorization': f'Bearer {LITELLM_KEY}', 'Content-Type': 'application/json'},
            json={
                'model': 'deepseek-v4-flash',
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': 150,
                'temperature': 0.3,
            },
            timeout=20
        )

        import json
        content = res.json()['choices'][0]['message']['content'].strip()
        content = content.replace('```json', '').replace('```', '').strip()
        data    = json.loads(content)
        return {
            'ai_trend':      data.get('trend', ''),
            'ai_prediction': data.get('prediction', ''),
            'ai_updated_at': datetime.now(timezone.utc),
        }

    except Exception as e:
        print(f"  [WARN] AI Fusion {obs_id}: {e}")
        return {}

# โหลดโมเดล FastSAM
def load_fastsam():
    print("Loading FastSAM model...")
    fastsam = YOLO(str(FASTSAM_PATH))
    print("FastSAM loaded")
    return fastsam

# ดึงรูปกล้องท้องฟ้าและ sky status จาก NARIT
def fetch_skycamera(obs_id: str) -> dict:
    try:
        station = NARIT_STATION.get(obs_id)
        if not station:
            return {}
        res = requests.post(
            'https://weather.narit.or.th/api/GetSkyCamera',
            json={'station': station}, timeout=10
        )
        data = res.json()
        if not data or len(data) == 0:
            return {}
        d            = data[0]
        ts           = d.get('TicksTime')
        station_name = d.get('Station')
        sky_status   = d.get('SkyStatus')
        score_all    = d.get('ScoreAll', [])
        now          = datetime.now(timezone.utc)
        image_url    = f"https://weather.narit.or.th/skycamera/{station_name}/{now.strftime('%Y')}/{now.strftime('%Y-%m-%d')}/{ts}.jpg"
        score_clear  = float(score_all[0]) if len(score_all) > 0 else 0
        score_cloudy = float(score_all[1]) if len(score_all) > 1 else 0
        score_partly = float(score_all[2]) if len(score_all) > 2 else 0
        score_rain   = float(score_all[3]) if len(score_all) > 3 else 0

        narit_cloud_percent = round((score_cloudy + score_partly * 0.5 + score_rain) * 100, 1)

        condition_map = {'Clear': 'Clear', 'Cloudy': 'Cloudy', 'Partly': 'Partly Cloudy', 'Rainy': 'Overcast'}
        condition    = condition_map.get(sky_status, 'Partly Cloudy')
        cloud_cover  = round(narit_cloud_percent)
        return {
            'narit_image_url':      image_url,
            'narit_sky_status':     sky_status,
            'narit_score_clear':    score_clear,
            'narit_score_cloudy':   score_cloudy,
            'narit_score_partly':   score_partly,
            'narit_score_rain':     score_rain,
            'narit_cloud_percent':  narit_cloud_percent,
            'cloud_cover':          cloud_cover,
            'condition':            condition,
            'image_url':            image_url,
        }
    except Exception as e:
        print(f"  [WARN] SkyCamera {obs_id}: {e}")
        return {}

# นับ % เมฆจากรูปด้วย FastSAM (กลางวัน) คืน None ถ้าเป็นกลางคืน
def calc_cloud_percent_fastsam(image_bytes: bytes, fastsam, obs_id: str) -> float | None:
    try:
        img_array = np.frombuffer(image_bytes, np.uint8)
        img_bgr   = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img_bgr is None:
            return None

        img_rgb  = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        img_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        h, w     = img_rgb.shape[:2]

        # สร้าง mask วงกลมเฉพาะส่วนท้องฟ้า
        cx, cy = w // 2, h // 2
        radius = min(w, h) // 2 - 10
        sky_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(sky_mask, (cx, cy), radius, 255, -1)
        total_sky_pixels = int(np.sum(sky_mask > 0))
        if total_sky_pixels == 0:
            return None

        sky_pixels      = img_gray[sky_mask > 0]
        mean_brightness = float(sky_pixels.mean())

        is_night = mean_brightness < 60

        # กลางคืน ภาพมืดเกินไป ให้ frontend ไปใช้ narit_cloud_percent แทน
        if is_night:
            print(f"    [night] mean_brightness={mean_brightness:.1f} -> use NARIT score")
            return None

        # กลางวัน ใช้ FastSAM พร้อม threshold ที่ปรับตามแต่ละหอ
        offset    = THRESHOLD_OFFSET.get(obs_id, 0)
        threshold = min(mean_brightness * 1.1, 200) + offset
        threshold = max(threshold, 50)

        results = fastsam(img_rgb, device='cpu', retina_masks=True,
                          imgsz=640, conf=0.4, iou=0.9, verbose=False)

        # เก็บเฉพาะ segment ที่อยู่ในวงท้องฟ้าและสว่างกว่า threshold = เมฆ
        cloud_mask = np.zeros((h, w), dtype=np.uint8)
        if results and results[0].masks is not None:
            for mask in results[0].masks.data:
                seg = mask.cpu().numpy().astype(np.uint8)
                if seg.shape != (h, w):
                    seg = cv2.resize(seg, (w, h), interpolation=cv2.INTER_NEAREST)
                overlap   = int(np.sum((seg > 0) & (sky_mask > 0)))
                seg_total = int(np.sum(seg > 0))
                if seg_total == 0 or overlap / seg_total < 0.5:
                    continue
                region_brightness = img_gray[seg > 0].mean()
                if region_brightness > threshold:
                    cloud_mask = cv2.bitwise_or(cloud_mask, seg)

        cloud_pixels = int(np.sum((cloud_mask > 0) & (sky_mask > 0)))
        cloud_pct    = round(min((cloud_pixels / total_sky_pixels) * 100, 100.0), 1)

        print(f"    [day] mean={mean_brightness:.1f} threshold={threshold:.1f} (offset={offset:+d}) cloud={cloud_pct}%")
        return cloud_pct

    except Exception as e:
        print(f"  [ERROR] FastSAM cloud %: {e}")
        return None

_run_counter = 0

# loop หลัก เก็บรูปทุกหอ คำนวณ % เมฆ และอัปเดต DB
def run():
    global _run_counter
    _run_counter += 1
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Collect + FastSAM")

    for obs in OBSERVATORIES:
        obs_id = obs['id']

        sky = fetch_skycamera(obs_id)
        if not sky or not sky.get('image_url'):
            print(f"  [SKIP] {obs_id}: no image")
            continue

        image_url    = sky.pop('image_url')
        narit_status = sky.get('narit_sky_status', '')

        try:
            res = requests.get(image_url, timeout=10)
            if res.status_code != 200 or len(res.content) < 5000:
                print(f"  [SKIP] {obs_id}: image load failed")
                continue
            image_bytes = res.content
        except Exception as e:
            print(f"  [ERROR] {obs_id}: download failed {e}")
            continue

        # คำนวณ % เมฆ (กลางวันใช้ FastSAM, กลางคืนคืน None)
        cloud_pct = calc_cloud_percent_fastsam(image_bytes, fastsam, obs_id)

        # กลางคืน fallback ไปใช้ narit_cloud_percent
        if cloud_pct is None:
            cloud_pct = sky.get('narit_cloud_percent')

        result = {
            **sky,
            'narit_image_url':     image_url,
            'pixel_cloud_percent': cloud_pct,
            'updated_at':          datetime.now(timezone.utc),
        }

        # ดึง history 5 นาทีล่าสุด ส่งให้ LLM วิเคราะห์ trend + prediction
        try:
            now_utc   = datetime.now(timezone.utc)
            from_ts   = now_utc - timedelta(minutes=5)
            history_5 = list(db.weather_history.find(
                {'observatory_id': obs_id, 'timestamp': {'$gte': from_ts}},
                {'pixel_cloud_percent': 1}
            ).sort('timestamp', 1).limit(5))
            history_pcts = [r.get('pixel_cloud_percent') for r in history_5]
            history_pcts.append(cloud_pct)  # เพิ่มค่าปัจจุบันต่อท้าย

            ai = ai_fusion_trend(
                obs_id       = obs_id,
                history_pcts = history_pcts,
                narit_status = sky.get('narit_sky_status', '--'),
                humidity     = sky.get('humidity', 0) or 0,
                rain_rate    = sky.get('rain_rate', 0) or 0,
            )
            if ai:
                result.update(ai)
        except Exception as e:
            print(f"  [WARN] AI Fusion skip {obs_id}: {e}")

        db.weather_realtime.update_one(
            {'observatory_id': obs_id}, {'$set': result}, upsert=True
        )

        # ทำนายเมฆ 1 ชม. ข้างหน้า ทุกๆ 5 รอบ (ประมาณ 5 นาที)
        if _run_counter % 5 == 1:
            try:
                now_utc    = datetime.now(timezone.utc)
                hist_24h   = list(db.weather_history.find(
                    {'observatory_id': obs_id, 'timestamp': {'$gte': now_utc - timedelta(hours=24)}},
                    {'pixel_cloud_percent': 1, 'timestamp': 1}
                ).sort('timestamp', 1))
                current_doc = {**result, 'narit_sky_status': sky.get('narit_sky_status', '')}
                preds = predict_cloud_1h(obs_id, hist_24h, current_doc)
                if preds:
                    db.weather_cloud_predictions.update_one(
                        {'observatory_id': obs_id},
                        {'$set': {
                            'observatory_id': obs_id,
                            'predicted_at': now_utc,
                            'predictions': [
                                {'time': now_utc + timedelta(minutes=5*(i+1)), 'pct': p}
                                for i, p in enumerate(preds)
                            ],
                        }},
                        upsert=True
                    )
                    print(f"  [PRED] {obs_id}: saved {len(preds)} points")
            except Exception as e:
                print(f"  [WARN] Cloud predict skip {obs_id}: {e}")

        # บันทึกลง history เป็นจุดข้อมูลใหม่
        history = result.copy()
        history['observatory_id'] = obs_id
        history['name']           = obs['name']
        history['timestamp']      = datetime.now(timezone.utc)
        history.pop('_id', None)
        db.weather_history.insert_one(history)

        # เติมค่า % เมฆให้ record ในนาทีนี้ที่ยังว่างอยู่
        now_utc = datetime.now(timezone.utc)
        from_ts = now_utc.replace(second=0, microsecond=0) - timedelta(minutes=5)
        to_ts   = now_utc.replace(second=59, microsecond=999999)
        db.weather_history.update_many(
            {'observatory_id': obs_id, 'timestamp': {'$gte': from_ts, '$lte': to_ts}, 'pixel_cloud_percent': None},
            {'$set': {'pixel_cloud_percent': cloud_pct}}
        )

        source   = "FastSAM" if cloud_pct != sky.get('narit_cloud_percent') else "NARIT fallback"
        ai_trend = result.get('ai_trend', '')
        print(f"  OK   {obs_id}: NARIT={narit_status} | cloud {cloud_pct}% ({source}){f' | AI: {ai_trend}' if ai_trend else ''}")

    # ลบข้อมูลย้อนหลังที่เกิน 3 เดือน (90 วัน)
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    db.weather_history.delete_many({"timestamp": {"$lt": cutoff}})
    print("Done")


if __name__ == "__main__":
    if not FASTSAM_PATH.exists():
        print(f"[ERROR] {FASTSAM_PATH} not found")
        exit(1)

    fastsam = load_fastsam()

    print("\nRunning Collect + FastSAM every 1 min")

    run()

    schedule.every(1).minutes.do(run)

    while True:
        schedule.run_pending()
        time.sleep(1)
