import os
import requests
import pymongo
import schedule
import time
from datetime import datetime, timezone
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

def get_condition(cloud: float) -> str:
  if cloud < 20: return "Clear"
  if cloud < 60: return "Partly Cloudy"
  if cloud < 85: return "Cloudy"
  return "Overcast"

def get_direction(degree: float) -> str:
  directions = ["N","NE","E","SE","S","SW","W","NW"]
  return directions[round(degree / 45) % 8]

def fetch_realtime(obs: dict):
  try:
    res = requests.get("https://api.open-meteo.com/v1/forecast", params={
      "latitude":        obs["lat"],
      "longitude":       obs["lon"],
      "current":         ["temperature_2m","relative_humidity_2m","wind_speed_10m","wind_direction_10m","surface_pressure","precipitation","cloud_cover","uv_index"],
      "wind_speed_unit": "ms",
      "timezone":        "auto",
    }, timeout=10)
    c     = res.json().get("current", {})
    cloud = c.get("cloud_cover", 0)
    return {
      "observatory_id": obs["id"],
      "name":           obs["name"],
      "timestamp":      datetime.now(timezone.utc),
      "temperature":    c.get("temperature_2m"),
      "humidity":       c.get("relative_humidity_2m"),
      "wind_speed":     c.get("wind_speed_10m"),
      "wind_direction": get_direction(c.get("wind_direction_10m", 0)),
      "pressure":       c.get("surface_pressure"),
      "rain_rate":      c.get("precipitation", 0),
      "cloud_cover":    cloud,
      "uv_index":       c.get("uv_index", 0),
      "condition":      get_condition(cloud),
      "seeing_dimm":    None,
      "source":         "open-meteo",
    }
  except Exception as e:
    print(f"  ❌ Realtime {obs['id']}: {e}")
    return None

def fetch_forecast(obs: dict):
  try:
    res = requests.get("https://api.open-meteo.com/v1/forecast", params={
      "latitude":        obs["lat"],
      "longitude":       obs["lon"],
      "daily":           ["temperature_2m_max","temperature_2m_min","precipitation_sum","wind_speed_10m_max","relative_humidity_2m_mean","cloud_cover_mean","uv_index_max"],
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

def collect_realtime():
    print(f"\n⚡ {datetime.now().strftime('%H:%M:%S')} — Realtime...")
    for obs in OBSERVATORIES:
        r = fetch_realtime(obs)
        if r:
            # ... (โค้ด update_one / insert_one เดิมของคุณ) ...
            
            # --- แก้ไขตรงนี้เพื่อจัด Format Output ---
            # ใช้การเว้นวรรคแบบคงที่ (Padding) เพื่อให้คอลัมน์ตรงกัน
            obs_id = f"{obs['id']}:".ljust(5)
            temp   = f"{r['temperature']}°C".ljust(8)
            humid  = f"H:{r['humidity']}%".ljust(7)
            cloud  = f"C:{r['cloud_cover']}%".ljust(7)
            cond   = f"[{r['condition']}]"
            
            print(f"  ✅ {obs_id} {temp} {humid} {cloud} {cond}")
        else:
            # กรณี Error ให้พิมพ์สั้นๆ พอ
            print(f"  ❌ {obs['id']}: Failed to fetch data")

 

    print("Realtime เสร็จ")

def collect_forecast():
  print(f"\n🌤️ {datetime.now().strftime('%H:%M:%S')} — Forecast 15 วัน...")
  for obs in OBSERVATORIES:
    records = fetch_forecast(obs)
    for r in records:
      db.weather_forecast.update_one(
        { "observatory_id": r["observatory_id"], "date": r["date"] },
        { "$set": r },
        upsert=True
      )
    if records:
      print(f"  ✅ {obs['id']} → {len(records)} วัน")

  db.weather_forecast.create_index(
    [("observatory_id", 1), ("date", 1)], unique=True
  )
  print("✅ Forecast เสร็จครับ!")

if __name__ == "__main__":
  print(" Observatory Weather Collector เริ่มทำงานครับ!")
  print("⚡ Realtime ทุก 1 นาที + บันทึก History")
  print(" Forecast ทุก 1 ชั่วโมง\n")

  collect_realtime()
  collect_forecast()

  schedule.every(1).minutes.do(collect_realtime)
  schedule.every(1).minutes.do(collect_forecast)

  while True:
    schedule.run_pending()
    time.sleep(1)
