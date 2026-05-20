import os
import requests
import pymongo
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pathlib import Path
import shutil

load_dotenv('../.env.local')

client = pymongo.MongoClient(os.getenv("MONGODB_URI"))
db     = client["observatory_weather"]

DATASET_DIR = Path("dataset")
CLASSES     = ["clear", "partly_cloudy", "cloudy", "rain"]

def get_label(record: dict) -> str | None:
    clear  = float(record.get("narit_score_clear",  0) or 0)
    partly = float(record.get("narit_score_partly", 0) or 0)
    cloudy = float(record.get("narit_score_cloudy", 0) or 0)
    rain   = float(record.get("narit_score_rain",   0) or 0)

    if clear == 0 and partly == 0 and cloudy == 0 and rain == 0:
        return None

    scores = {
        "clear":         clear,
        "partly_cloudy": partly,
        "cloudy":        cloudy,
        "rain":          rain,
    }
    label = max(scores, key=scores.get)

    # ต้องมั่นใจ >= 0.5
    if scores[label] < 0.5:
        return None

    return label

def download_image(url: str, save_path: Path) -> bool:
    try:
        res = requests.get(url, timeout=10)
        if res.status_code == 200 and len(res.content) > 5000:
            save_path.write_bytes(res.content)
            return True
        return False
    except Exception as e:
        print(f"   download failed: {e}")
        return False

def collect_dataset():
    print(f"\nเริ่มเก็บ dataset 4 class จาก MongoDB...")
    print(f"   classes: {CLASSES}\n")

    records = db.weather_history.find({
        "narit_image_url":   {"$exists": True, "$ne": None},
        "narit_score_clear": {"$exists": True},
    }).sort("timestamp", -1)

    total = saved = skipped = 0

    for record in records:
        total += 1
        obs_id    = record.get("observatory_id", "unknown")
        image_url = record.get("narit_image_url")
        timestamp = record.get("timestamp")
        label     = get_label(record)

        if not label or not image_url:
            skipped += 1
            continue

        save_dir = DATASET_DIR / label / obs_id
        save_dir.mkdir(parents=True, exist_ok=True)

        ts_str    = timestamp.strftime("%Y%m%d_%H%M%S") if isinstance(timestamp, datetime) else str(timestamp).replace(":", "-").replace(" ", "_")
        save_path = save_dir / f"{ts_str}.jpg"

        if save_path.exists():
            skipped += 1
            continue

        if download_image(image_url, save_path):
            saved += 1
            if saved % 50 == 0:
                print(f" บันทึกไปแล้ว {saved} รูป...")
        else:
            skipped += 1

    print(f"\nเสร็จแล้วครับ!")
    print(f"   ทั้งหมด: {total} records")
    print(f"   บันทึก:  {saved} รูป")
    print(f"   ข้าม:    {skipped} รูป")

def summary():
    print(f"\n สรุป dataset:")
    total = 0
    for label in CLASSES:
        label_dir = DATASET_DIR / label
        if not label_dir.exists():
            print(f"  {label}: 0 รูป")
            continue
        count = sum(1 for _ in label_dir.rglob("*.jpg"))
        total += count
        print(f"  {label}: {count} รูป")
        for obs_dir in sorted(label_dir.iterdir()):
            if obs_dir.is_dir():
                obs_count = len(list(obs_dir.glob("*.jpg")))
                print(f"    └── {obs_dir.name}: {obs_count} รูป")
    print(f"  รวม: {total} รูป")

def clear_dataset():
    if DATASET_DIR.exists():
        shutil.rmtree(DATASET_DIR)
        print(f"  ลบ dataset เก่าแล้วครับ")
    DATASET_DIR.mkdir()
    print(f" สร้างโฟลเดอร์ใหม่แล้วครับ")

if __name__ == "__main__":
    print("  ลบข้อมูลเก่าก่อนครับ...")
    clear_dataset()
    collect_dataset()
    summary()