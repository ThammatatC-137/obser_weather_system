import os
import requests
import pymongo
import schedule
import time
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv('../.env.local')

client = pymongo.MongoClient(os.getenv("MONGODB_URI"))
db     = client["observatory_weather"]

OBSERVATORIES = [
  { "id": "TNO", "name": "Thai National Observatory",   "lat": 18.57,  "lon": 98.48   },
  { "id": "APK", "name": "Astro Park Observatory",      "lat": 14.87,  "lon": 102.01  },
  { "id": "CCO", "name": "Chachoengsao Observatory",    "lat": 13.72,  "lon": 101.08  },
  { "id": "SKA", "name": "Songkhla Observatory",        "lat": 7.16,   "lon": 100.61  },
  { "id": "KKN", "name": "KhonKaen Observatory",        "lat": 16.43,  "lon": 102.82  },
  { "id": "GAO", "name": "Gao Mei Gu Observatory",      "lat": 26.70,  "lon": 100.03  },
  { "id": "SPB", "name": "Springbrook Observatory",     "lat": -28.22, "lon": 153.28  },
  { "id": "SRO", "name": "Sierra Remote Observatories", "lat": 36.97,  "lon": -119.40 },
  { "id": "PR8", "name": "PROMPT-8",                    "lat": -30.16, "lon": -70.80  },
]

NARIT_STATION = {
  'TNO': '1mtno', 'APK': 'astropark', 'CCO': 'cco', 'SKA': 'sko',
  'KKN': 'kkn',   'GAO': 'gao',       'SPB': 'sbo', 'SRO': 'sro', 'PR8': 'cto',
}

def get_condition(cloud: float) -> str:
  if cloud < 20: return "Clear"
  if cloud < 60: return "Partly Cloudy"
  if cloud < 85: return "Cloudy"
  return "Overcast"

def get_direction(degree: float) -> str:
  directions = ["N","NE","E","SE","S","SW","W","NW"]
  return directions[round(degree / 45) % 8]

# ── NARIT Realtime ──────────────────────────────
def fetch_narit_weather(obs: dict) -> dict | None:
  try:
    station = NARIT_STATION.get(obs['id'])
    if not station:
      return None
    res = requests.post(
      'https://weather.narit.or.th/api/GetWeatherData',
      json={'station': station}, timeout=10
    )
    data = res.json()
    if not data or len(data) == 0:
      return None
    d = data[0]
    return {
      "observatory_id": obs["id"],
      "name":           obs["name"],
      "timestamp":      datetime.now(timezone.utc),
      "temperature":    d.get("outsideTemp"),
      "humidity":       d.get("outsideHumidity"),
      "wind_speed":     d.get("windSpeed"),
      "wind_direction": d.get("windDirStr", "N"),
      "pressure":       d.get("barometer"),
      "rain_rate":      d.get("rainRate", 0),
      "daily_rain":     d.get("dailyRain", 0),
      "dew_point":      d.get("dewPoint"),
      "solar_rad":      d.get("solarRad"),
      "uv_index":       d.get("UV", 0),
      "cloud_cover":    None,
      "seeing_dimm":    None,
      "source":         "narit",
    }
  except Exception as e:
    print(f"  ❌ NARIT Weather {obs['id']}: {e}")
    return None

# ── NARIT SkyCamera ─────────────────────────────
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
    d           = data[0]
    ts          = d.get('TicksTime')
    station_name= d.get('Station')
    sky_status  = d.get('SkyStatus')
    score_all   = d.get('ScoreAll', [])
    now         = datetime.now(timezone.utc)
    image_url   = f"https://weather.narit.or.th/skycamera/{station_name}/{now.strftime('%Y')}/{now.strftime('%Y-%m-%d')}/{ts}.jpg"
    condition_map = {'Clear': 'Clear', 'Cloudy': 'Cloudy', 'Partly': 'Partly Cloudy', 'Rain': 'Overcast'}
    condition   = condition_map.get(sky_status, 'Partly Cloudy')
    cloud_cover = round(float(score_all[1]) * 100) if len(score_all) > 1 else 50
    return {
      'narit_image_url':    image_url,
      'narit_sky_status':   sky_status,
      'narit_score_clear':  float(score_all[0]) if len(score_all) > 0 else 0,
      'narit_score_cloudy': float(score_all[1]) if len(score_all) > 1 else 0,
      'narit_score_partly': float(score_all[2]) if len(score_all) > 2 else 0,
      'narit_score_rain':   float(score_all[3]) if len(score_all) > 3 else 0,
      'cloud_cover':        cloud_cover,
      'condition':          condition,
    }
  except Exception as e:
    print(f"  ❌ SkyCamera {obs_id}: {e}")
    return {}

# ── Forecast Open-Meteo (daily) ─────────────────
def fetch_forecast(obs: dict) -> list:
  try:
    res = requests.get("https://api.open-meteo.com/v1/forecast", params={
      "latitude":        obs["lat"],
      "longitude":       obs["lon"],
      "daily":           ["temperature_2m_max","temperature_2m_min","precipitation_sum",
                          "wind_speed_10m_max","relative_humidity_2m_mean",
                          "cloud_cover_mean","uv_index_max"],
      "forecast_days":   15,
      "wind_speed_unit": "ms",
      "timezone":        "auto",
    }, timeout=10)
    data    = res.json().get("daily", {})
    records = []
    for i, date in enumerate(data.get("time", [])):
      cloud = data.get("cloud_cover_mean", [])[i] or 0
      records.append({
        "observatory_id": obs["id"],
        "name":           obs["name"],
        "date":           date,
        "updated_at":     datetime.now(timezone.utc),
        "temp_max":       data.get("temperature_2m_max",        [])[i],
        "temp_min":       data.get("temperature_2m_min",        [])[i],
        "rain":           data.get("precipitation_sum",         [])[i] or 0,
        "wind_max":       data.get("wind_speed_10m_max",        [])[i],
        "humidity":       data.get("relative_humidity_2m_mean", [])[i],
        "cloud_cover":    round(cloud),
        "uv_index":       data.get("uv_index_max",              [])[i],
        "condition":      get_condition(cloud),
      })
    return records
  except Exception as e:
    print(f"  ❌ Forecast {obs['id']}: {e}")
    return []

# ── ✅ Hourly History Open-Meteo — เก็บรายชั่วโมง ──
def fetch_hourly_history(obs: dict, date: str) -> list:
  try:
    res = requests.get("https://api.open-meteo.com/v1/forecast", params={
      "latitude":        obs["lat"],
      "longitude":       obs["lon"],
      "hourly":          ["temperature_2m","relative_humidity_2m","dew_point_2m",
                          "wind_speed_10m","surface_pressure","precipitation","uv_index"],
      "wind_speed_unit": "ms",
      "timezone":        "auto",
      "start_date":      date,
      "end_date":        date,
    }, timeout=10)
    h       = res.json().get("hourly", {})
    records = []
    for i, t in enumerate(h.get("time", [])):
      records.append({
        "observatory_id": obs["id"],
        "date":           date,
        "timestamp":      t,                              # "2026-05-07T00:00"
        "temperature":    h.get("temperature_2m",       [])[i],
        "humidity":       h.get("relative_humidity_2m", [])[i],
        "dew_point":      h.get("dew_point_2m",         [])[i],
        "wind_speed":     h.get("wind_speed_10m",       [])[i],
        "pressure":       h.get("surface_pressure",     [])[i],
        "rain_rate":      h.get("precipitation",        [])[i],
        "uv_index":       h.get("uv_index",             [])[i],
        "seeing_dimm":    None,
        "updated_at":     datetime.now(timezone.utc),
      })
    return records
  except Exception as e:
    print(f"  ❌ Hourly {obs['id']} {date}: {e}")
    return []

# ── Jobs ────────────────────────────────────────
def collect_realtime():
  print(f"\n⚡ {datetime.now().strftime('%H:%M:%S')} — Realtime (NARIT)...")
  for obs in OBSERVATORIES:
    r = fetch_narit_weather(obs)
    if r:
      sky = fetch_skycamera(obs['id'])
      r.update(sky)

      # บันทึก realtime (upsert)
      db.weather_realtime.update_one(
        {'observatory_id': obs['id']}, {'$set': r}, upsert=True
      )

      # บันทึก history ทุก 1 นาที
      history_record = r.copy()
      history_record.pop('_id', None)
      db.weather_history.insert_one(history_record)

      obs_id = f"{obs['id']}:".ljust(5)
      temp   = f"{r['temperature']}°C".ljust(8)
      humid  = f"H:{r['humidity']}%".ljust(7)
      cond   = f"[{r.get('condition', 'N/A')}]"
      img    = "📷" if r.get('narit_image_url') else "❌"
      print(f"  ✅ {obs_id} {temp} {humid} {cond} {img}")
    else:
      print(f"  ❌ {obs['id']}: Failed")

  # ลบ history เกิน 7 วัน
  cutoff = datetime.now(timezone.utc) - timedelta(days=7)
  db.weather_history.delete_many({"timestamp": {"$lt": cutoff}})
  print("✅ Realtime เสร็จครับ!")

def collect_forecast():
  print(f"\n🌤️ {datetime.now().strftime('%H:%M:%S')} — Forecast (Open-Meteo)...")
  for obs in OBSERVATORIES:
    records = fetch_forecast(obs)
    for r in records:
      db.weather_forecast.update_one(
        {"observatory_id": r["observatory_id"], "date": r["date"]},
        {"$set": r}, upsert=True
      )
    if records:
      print(f"  ✅ {obs['id']} → {len(records)} วัน")
  db.weather_forecast.create_index(
    [("observatory_id", 1), ("date", 1)], unique=True
  )
  print("✅ Forecast เสร็จครับ!")

# ── ✅ เก็บ Hourly ย้อนหลัง 7 วัน ──────────────
def collect_hourly_history():
  print(f"\n{datetime.now().strftime('%H:%M:%S')} — Hourly History (Open-Meteo)...")
  today = datetime.now(timezone.utc).date()
  # เก็บย้อนหลัง 7 วัน (ไม่รวมวันนี้ เพราะใช้ weather_history จาก NARIT)
  dates = [(today - timedelta(days=i)).isoformat() for i in range(1, 8)]

  for obs in OBSERVATORIES:
    for date in dates:
      # ถ้ามีครบ 24 ชั่วโมงแล้ว ข้ามไป
      exists = db.weather_hourly.count_documents({
        "observatory_id": obs["id"], "date": date
      })
      if exists >= 24:
        continue

      records = fetch_hourly_history(obs, date)
      for r in records:
        db.weather_hourly.update_one(
          {"observatory_id": r["observatory_id"], "timestamp": r["timestamp"]},
          {"$set": r}, upsert=True
        )
      if records:
        print(f"  ✅ {obs['id']} {date} → {len(records)} ชั่วโมง")

  # สร้าง index
  db.weather_hourly.create_index(
    [("observatory_id", 1), ("date", 1), ("timestamp", 1)], unique=True
  )
  # ลบข้อมูลเกิน 7 วัน
  cutoff_date = (today - timedelta(days=7)).isoformat()
  db.weather_hourly.delete_many({"date": {"$lt": cutoff_date}})
  print("✅ Hourly History เสร็จ")

# ── Main ────────────────────────────────────────
if __name__ == "__main__":
  print("Observatory Weather Collector เริ่มทำงานครับ!")
  print("⚡ Realtime + History: NARIT API ทุก 1 นาที")
  print("Forecast: Open-Meteo ทุก 1 ชั่วโมง")
  print("Hourly History: Open-Meteo ทุก 6 ชั่วโมง\n")

  
  collect_realtime()
  collect_forecast()
  collect_hourly_history()  

  # Schedule
  schedule.every(1).minutes.do(collect_realtime)
  schedule.every(1).hours.do(collect_forecast)
  schedule.every(6).hours.do(collect_hourly_history)  

  while True:
    schedule.run_pending()
    time.sleep(1)