import os
import sys
import json
import requests
import pymongo
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv('../.env.local')

client = pymongo.MongoClient(os.getenv("MONGODB_URI"))
db     = client["observatory_weather"]

def get_condition(cloud: float) -> str:
    if cloud < 20: return "Clear"
    if cloud < 60: return "Partly Cloudy"
    if cloud < 85: return "Cloudy"
    return "Overcast"

# ดึงสภาพอากาศปัจจุบัน + forecast 15 วัน + hourly วันนี้
def fetch_location_weather(lat: float, lon: float, location_id: str, name: str):
    now = datetime.now(timezone.utc)

    # ── Current weather (hourly ชั่วโมงล่าสุด) ──
    try:
        res = requests.get("https://api.open-meteo.com/v1/forecast", params={
            "latitude":        lat,
            "longitude":       lon,
            "current":         ["temperature_2m", "relative_humidity_2m", "dew_point_2m",
                                "wind_speed_10m", "wind_direction_10m", "surface_pressure",
                                "precipitation", "uv_index", "cloud_cover", "weather_code"],
            "wind_speed_unit": "ms",
            "timezone":        "auto",
        }, timeout=10)
        c = res.json().get("current", {})

        cloud   = c.get("cloud_cover", 50)
        wind_deg = c.get("wind_direction_10m", 0)
        directions = ["N","NE","E","SE","S","SW","W","NW"]
        wind_dir = directions[round(wind_deg / 45) % 8]

        current_record = {
            "location_id":    location_id,
            "name":           name,
            "lat":            lat,
            "lon":            lon,
            "timestamp":      now,
            "temperature":    c.get("temperature_2m"),
            "humidity":       c.get("relative_humidity_2m"),
            "dew_point":      c.get("dew_point_2m"),
            "wind_speed":     c.get("wind_speed_10m"),
            "wind_direction": wind_dir,
            "pressure":       c.get("surface_pressure"),
            "rain_rate":      c.get("precipitation", 0),
            "uv_index":       c.get("uv_index", 0),
            "cloud_cover":    cloud,
            "condition":      get_condition(cloud),
            "source":         "open-meteo",
        }

        # upsert ข้อมูล current
        db.location_weather.update_one(
            {"location_id": location_id},
            {"$set": current_record},
            upsert=True
        )
        print(f"  ✅ Current: {current_record['temperature']}°C {current_record['condition']}")

    except Exception as e:
        print(f"  ❌ Current weather: {e}")
        return False

    # ── Forecast 15 วัน ──
    try:
        res = requests.get("https://api.open-meteo.com/v1/forecast", params={
            "latitude":        lat,
            "longitude":       lon,
            "daily":           ["temperature_2m_max", "temperature_2m_min", "precipitation_sum",
                                "wind_speed_10m_max", "relative_humidity_2m_mean",
                                "cloud_cover_mean", "uv_index_max"],
            "forecast_days":   15,
            "wind_speed_unit": "ms",
            "timezone":        "auto",
        }, timeout=10)
        data = res.json().get("daily", {})

        for i, date in enumerate(data.get("time", [])):
            cloud = data.get("cloud_cover_mean", [])[i] or 0
            record = {
                "location_id": location_id,
                "name":        name,
                "lat":         lat,
                "lon":         lon,
                "date":        date,
                "updated_at":  now,
                "temp_max":    data.get("temperature_2m_max",        [])[i],
                "temp_min":    data.get("temperature_2m_min",        [])[i],
                "rain":        data.get("precipitation_sum",         [])[i] or 0,
                "wind_max":    data.get("wind_speed_10m_max",        [])[i],
                "humidity":    data.get("relative_humidity_2m_mean", [])[i],
                "cloud_cover": round(cloud),
                "uv_index":    data.get("uv_index_max",              [])[i],
                "condition":   get_condition(cloud),
            }
            db.location_forecast.update_one(
                {"location_id": location_id, "date": date},
                {"$set": record},
                upsert=True
            )
        print(f"  ✅ Forecast: {len(data.get('time', []))} วัน")

    except Exception as e:
        print(f"  ❌ Forecast: {e}")

    # ── Hourly วันนี้ (24hr) ──
    try:
        today = now.strftime("%Y-%m-%d")
        res = requests.get("https://api.open-meteo.com/v1/forecast", params={
            "latitude":        lat,
            "longitude":       lon,
            "hourly":          ["temperature_2m", "relative_humidity_2m", "dew_point_2m",
                                "wind_speed_10m", "surface_pressure", "precipitation", "uv_index"],
            "wind_speed_unit": "ms",
            "timezone":        "auto",
            "start_date":      today,
            "end_date":        today,
        }, timeout=10)
        h = res.json().get("hourly", {})

        for i, t in enumerate(h.get("time", [])):
            record = {
                "location_id": location_id,
                "date":        today,
                "timestamp":   t,
                "temperature": h.get("temperature_2m",       [])[i],
                "humidity":    h.get("relative_humidity_2m", [])[i],
                "dew_point":   h.get("dew_point_2m",         [])[i],
                "wind_speed":  h.get("wind_speed_10m",       [])[i],
                "pressure":    h.get("surface_pressure",     [])[i],
                "rain_rate":   h.get("precipitation",        [])[i],
                "uv_index":    h.get("uv_index",             [])[i],
                "updated_at":  now,
            }
            db.location_hourly.update_one(
                {"location_id": location_id, "timestamp": t},
                {"$set": record},
                upsert=True
            )
        print(f"  ✅ Hourly: {len(h.get('time', []))} ชั่วโมง")

    except Exception as e:
        print(f"  ❌ Hourly: {e}")

    # สร้าง index
    db.location_weather.create_index("location_id", unique=True)
    db.location_forecast.create_index([("location_id", 1), ("date", 1)], unique=True)
    db.location_hourly.create_index([("location_id", 1), ("timestamp", 1)], unique=True)

    return True


# รับ args จาก command line: lat lon location_id name
if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python collect_location.py <lat> <lon> <location_id> [name]")
        sys.exit(1)

    lat         = float(sys.argv[1])
    lon         = float(sys.argv[2])
    location_id = sys.argv[3]
    name        = sys.argv[4] if len(sys.argv) > 4 else f"Location {location_id}"

    print(f"\nดึงข้อมูล: {name} ({lat}, {lon})")
    success = fetch_location_weather(lat, lon, location_id, name)
    print("✅ เสร็จ!" if success else "❌ ล้มเหลว")