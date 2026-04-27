
# ดึงข้อมูลอากาศจาก Open-Meteo API


import os
import requests
import pymongo
import schedule
import time
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# โหลด .env.local
load_dotenv('../.env.local')

# เชื่อม MongoDB
client = pymongo.MongoClient(os.getenv("MONGODB_URI"))
db     = client["observatory_weather"]


OBSERVATORIES = [
  { "id": "TNO", "name": "Thai National Observatory",   "lat": 18.57,  "lon": 98.48   },
  { "id": "APK", "name": "Astro Park Observatory",      "lat": 14.87,  "lon": 102.01  },
  { "id": "CCO", "name": "Chachoengsao Observatory",    "lat": 13.72,  "lon": 101.08  },
  { "id": "SKA", "name": "Songkhla Observatory",         "lat": 7.16,   "lon": 100.61  },
  { "id": "KKN", "name": "KhonKaen Observatory",         "lat": 16.43,  "lon": 102.82  },
  { "id": "GAO", "name": "Gao Mei Gu Observatory",       "lat": 26.70,  "lon": 100.03  },
  { "id": "SPB", "name": "Springbrook Observatory",      "lat": -28.22, "lon": 153.28  },
  { "id": "SRO", "name": "Sierra Remote Observatories",  "lat": 36.97,  "lon": -119.40 },
  { "id": "PR8", "name": "PROMPT-8",                     "lat": -30.16, "lon": -70.80  },
]

# ===== แปลง Cloud Cover เป็น Condition =====
def get_condition(cloud: float) -> str:
  if cloud < 20: return "Clear"
  if cloud < 60: return "Partly Cloudy"
  if cloud < 85: return "Cloudy"
  return "Overcast"

# ===== แปลงองศาลมเป็นทิศทาง =====
def get_direction(degree: float) -> str:
  directions = ["N","NE","E","SE","S","SW","W","NW"]
  return directions[round(degree / 45) % 8]

# ===== ดึงข้อมูล 1 หอ =====
def fetch_weather(obs: dict) -> dict | None:
  try:
    url    = "https://api.open-meteo.com/v1/forecast"
    params = {
      "latitude":        obs["lat"],
      "longitude":       obs["lon"],
      "current":         [
        "temperature_2m",
        "relative_humidity_2m",
        "wind_speed_10m",
        "wind_direction_10m",
        "surface_pressure",
        "precipitation",
        "cloud_cover",
        "uv_index"
      ],
      "wind_speed_unit": "ms",
      "timezone":        "auto",
    }

    res     = requests.get(url, params=params, timeout=10)
    current = res.json().get("current", {})
    cloud   = current.get("cloud_cover", 0)

    return {
      "observatory_id": obs["id"],
      "name":           obs["name"],
      "timestamp":      datetime.now(timezone.utc),
      "temperature":    current.get("temperature_2m"),
      "humidity":       current.get("relative_humidity_2m"),
      "wind_speed":     current.get("wind_speed_10m"),
      "wind_direction": get_direction(current.get("wind_direction_10m", 0)),
      "pressure":       current.get("surface_pressure"),
      "rain_rate":      current.get("precipitation", 0),
      "cloud_cover":    cloud,
      "uv_index":       current.get("uv_index", 0),
      "condition":      get_condition(cloud),
      "seeing_dimm":    None,
      "source":         "open-meteo",
    }
  except Exception as e:
    print(f"❌ Error {obs['id']}: {e}")
    return None

# ===== บันทึกลง MongoDB =====
def collect_realtime():
  print(f"\n⚡ {datetime.now().strftime('%H:%M:%S')} — กำลังดึงข้อมูล...")

  for obs in OBSERVATORIES:
    record = fetch_weather(obs)
    if record:
      # upsert = ถ้ามีอยู่แล้วเขียนทับ ถ้าไม่มีสร้างใหม่
      db.weather_realtime.update_one(
        { "observatory_id": obs["id"] },
        { "$set": record },
        upsert=True
      )
      print(f"  ✅ {obs['id']} → {record['temperature']}°C {record['condition']}")

  print("✅ เสร็จแล้วครับ!\n")

# ===== เริ่มทำงาน =====
if __name__ == "__main__":
  print("🚀 Observatory Weather Collector เริ่มทำงานแล้วครับ!")
  print("⚡ ดึงข้อมูลทุก 15 นาที\n")

  # รันทันทีตอนเริ่ม
  collect_realtime()


  schedule.every(15).minutes.do(collect_realtime)

  while True:
    schedule.run_pending()
    time.sleep(1)