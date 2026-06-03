import os
import requests
import pymongo
import schedule
import time
import threading
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv('../.env.local')

client = pymongo.MongoClient(os.getenv("MONGODB_URI"))
db     = client["observatory_weather"]

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

# แปลงค่า cloud cover เป็นชื่อสภาพอากาศ
def get_condition(cloud: float) -> str:
  if cloud < 20: return "Clear"
  if cloud < 60: return "Partly Cloudy"
  if cloud < 85: return "Cloudy"
  return "Overcast"

# แปลงองศาลมเป็นทิศ
def get_direction(degree: float) -> str:
  directions = ["N","NE","E","SE","S","SW","W","NW"]
  return directions[round(degree / 45) % 8]

# ดึงข้อมูลอากาศ realtime จาก API ของ NARIT
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
    ts_str = d.get('lastestTimestamp') or d.get('lastestClientTimeStamp')
    try:
      narit_ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00')) if ts_str else datetime.now(timezone.utc)
    except Exception:
      narit_ts = datetime.now(timezone.utc)
    return {
      "observatory_id": obs["id"],
      "name":           obs["name"],
      "timestamp":      narit_ts,
      "collected_at":   datetime.now(timezone.utc),
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
    print(f"  [WARN] NARIT weather {obs['id']}: {e}")
    return None

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
    d           = data[0]
    ts          = d.get('TicksTime')
    station_name= d.get('Station')
    sky_status  = d.get('SkyStatus')
    score_all   = d.get('ScoreAll', [])
    now         = datetime.now(timezone.utc)
    image_url   = f"https://weather.narit.or.th/skycamera/{station_name}/{now.strftime('%Y')}/{now.strftime('%Y-%m-%d')}/{ts}.jpg"
    condition_map = {'Clear': 'Clear', 'Cloudy': 'Cloudy', 'Partly': 'Partly Cloudy', 'Rain': 'Overcast', 'Rainy': 'Overcast'}
    condition     = condition_map.get(sky_status, 'Cloudy')
    score_cloudy  = float(score_all[1]) if len(score_all) > 1 else 0
    score_partly  = float(score_all[2]) if len(score_all) > 2 else 0
    score_rain    = float(score_all[3]) if len(score_all) > 3 else 0
    # รวม score เป็น % เมฆโดยรวม
    cloud_cover   = round((score_cloudy + score_partly * 0.5 + score_rain) * 100)
    return {
      'narit_image_url':    image_url,
      'narit_sky_status':   sky_status,
      'narit_score_clear':  float(score_all[0]) if len(score_all) > 0 else 0,
      'narit_score_cloudy': score_cloudy,
      'narit_score_partly': score_partly,
      'narit_score_rain':   score_rain,
      'cloud_cover':        cloud_cover,
      'condition':          condition,
    }
  except Exception as e:
    print(f"  [WARN] SkyCamera {obs_id}: {e}")
    return {}

# ดึงพยากรณ์อากาศ 15 วันจาก Open-Meteo
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
    print(f"  [WARN] Forecast {obs['id']}: {e}")
    return []

# ดึงข้อมูลรายชั่วโมงของวันที่กำหนด (ใช้ได้ทั้งย้อนหลังและอนาคต)
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
        "timestamp":      t,
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
    print(f"  [WARN] Hourly {obs['id']} {date}: {e}")
    return []

# เก็บข้อมูล realtime ของทุกหอ ลง weather_realtime และ weather_history
def collect_realtime():
  print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Realtime (NARIT)")
  for obs in OBSERVATORIES:
    r = fetch_narit_weather(obs)
    if r:
      sky = fetch_skycamera(obs['id'])
      r.update(sky)

      db.weather_realtime.update_one(
        {'observatory_id': obs['id']}, {'$set': r}, upsert=True
      )

      history_record = r.copy()
      history_record.pop('_id', None)
      db.weather_history.update_one(
        {'observatory_id': history_record['observatory_id'], 'timestamp': history_record['timestamp']},
        {'$set': history_record}, upsert=True
      )

      obs_id = f"{obs['id']}:".ljust(5)
      temp   = f"{r['temperature']}C".ljust(8)
      humid  = f"H:{r['humidity']}%".ljust(7)
      cond   = f"[{r.get('condition', 'N/A')}]"
      img    = "img" if r.get('narit_image_url') else "no-img"
      print(f"  OK   {obs_id} {temp} {humid} {cond} {img}")
    else:
      print(f"  FAIL {obs['id']}")

  # ลบข้อมูลย้อนหลังที่เกิน 3 เดือน (90 วัน)
  cutoff = datetime.now(timezone.utc) - timedelta(days=90)
  db.weather_history.delete_many({"timestamp": {"$lt": cutoff}})
  print("Realtime done")

# เก็บพยากรณ์ 15 วันของทุกหอ ลง weather_forecast
def collect_forecast():
  print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Forecast (Open-Meteo)")
  for obs in OBSERVATORIES:
    records = fetch_forecast(obs)
    for r in records:
      db.weather_forecast.update_one(
        {"observatory_id": r["observatory_id"], "date": r["date"]},
        {"$set": r}, upsert=True
      )
    if records:
      print(f"  OK   {obs['id']} -> {len(records)} days")
  db.weather_forecast.create_index(
    [("observatory_id", 1), ("date", 1)], unique=True
  )
  print("Forecast done")

# เก็บข้อมูลรายชั่วโมงย้อนหลัง 7 วัน ลง weather_hourly
def collect_hourly_history():
  print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Hourly history (Open-Meteo)")
  today = datetime.now(timezone.utc).date()
  dates = [(today - timedelta(days=i)).isoformat() for i in range(1, 8)]
  for obs in OBSERVATORIES:
    for date in dates:
      # ถ้ามีครบ 24 ชั่วโมงแล้วข้ามไป
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
        print(f"  OK   {obs['id']} {date} -> {len(records)} hours")
  db.weather_hourly.create_index(
    [("observatory_id", 1), ("date", 1), ("timestamp", 1)], unique=True
  )
  cutoff_date = (today - timedelta(days=7)).isoformat()
  db.weather_hourly.delete_many({"date": {"$lt": cutoff_date}})
  print("Hourly history done")

# เก็บข้อมูลรายชั่วโมงล่วงหน้า 8 วัน ลง weather_hourly
def collect_hourly_future():
  print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Hourly future (Open-Meteo)")
  today = datetime.now(timezone.utc).date()
  dates = [(today + timedelta(days=i)).isoformat() for i in range(0, 8)]
  for obs in OBSERVATORIES:
    for date in dates:
      records = fetch_hourly_history(obs, date)
      for r in records:
        db.weather_hourly.update_one(
          {"observatory_id": r["observatory_id"], "timestamp": r["timestamp"]},
          {"$set": r}, upsert=True
        )
    print(f"  OK   {obs['id']} -> 8 days ahead")
  cutoff_future = (today - timedelta(days=1)).isoformat()
  db.weather_hourly.delete_many({"date": {"$lt": cutoff_future}})
  print("Hourly future done")

if __name__ == "__main__":
  print("Observatory Weather Collector started")
  print("Realtime: every 1 min | Forecast: every 1 hour\n")

  # รัน realtime รอบแรกทันที ไม่ต้องรอ forecast/history
  collect_realtime()

  # ตั้งเวลาทำงานของแต่ละงาน
  schedule.every(1).minutes.do(collect_realtime)
  schedule.every(1).hours.do(collect_forecast)
  schedule.every(6).hours.do(collect_hourly_history)
  schedule.every(1).hours.do(collect_hourly_future)

  # รัน forecast/history ใน thread แยก ไม่ให้บล็อก realtime
  threading.Thread(target=collect_forecast,       daemon=True).start()
  threading.Thread(target=collect_hourly_history, daemon=True).start()
  threading.Thread(target=collect_hourly_future,  daemon=True).start()

  while True:
    schedule.run_pending()
    time.sleep(1)
