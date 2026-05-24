import os
import io
import cv2
import math
import requests
import pymongo
import schedule
import time
import torch
import torch.nn as nn
import numpy as np
from torchvision import transforms, models
from PIL import Image
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path

load_dotenv('../.env.local')

client = pymongo.MongoClient(os.getenv("MONGODB_URI"))
db     = client["observatory_weather"]

MODEL_PATH = Path("sky_model.pth")
IMG_SIZE   = 224

# โหลด CNN model ครั้งเดียว
def load_model():
    print("🔭 โหลด CNN model...")
    ckpt    = torch.load(MODEL_PATH, map_location='cpu')
    classes = {v: k for k, v in ckpt['class_to_idx'].items()}
    model   = models.efficientnet_b0()
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(classes))
    model.load_state_dict(ckpt['model_state'])
    model.eval()
    print(f"✅ โหลดสำเร็จ | classes: {list(classes.values())}")
    return model, classes

# โหลด template แต่ละหอครั้งเดียวตอนเริ่ม
def load_templates() -> dict:
    templates = {}
    for f in Path('.').glob('template_*.png'):
        obs_id = f.stem.replace('template_', '')
        tmpl   = cv2.imread(str(f), cv2.IMREAD_GRAYSCALE)
        if tmpl is not None:
            templates[obs_id] = tmpl
            print(f"  ✅ โหลด template {obs_id}: {tmpl.shape}")
    # fallback — ใช้ TNO ถ้าไม่มี template ของหอนั้น
    return templates

# นับดาวด้วย Template Matching (แม่นกว่า threshold มากครับ)
def count_stars(image_bytes: bytes, obs_id: str, templates: dict) -> int:
    try:
        img_array = np.frombuffer(image_bytes, np.uint8)
        img       = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return 0

        # เลือก template — ใช้ของหอนั้น หรือ fallback TNO
        tmpl = templates.get(obs_id)
        if tmpl is None:
            tmpl = templates.get('TNO')
        if tmpl is None:
            return 0

        # ตัดเฉพาะวงกลม allsky
        h, w   = img.shape
        mask   = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(mask, (w//2, h//2), min(w, h)//2 - 10, 255, -1)
        img_masked = cv2.bitwise_and(img, img, mask=mask)

        # Template matching
        result = cv2.matchTemplate(img_masked, tmpl, cv2.TM_CCOEFF_NORMED)
        loc    = np.where(result >= 0.7)

        # กรอง overlap ออก
        star_list = []
        for pt in zip(*loc[::-1]):
            x, y = int(pt[0]), int(pt[1])
            too_close = False
            for star in star_list:
                d = math.sqrt((x - star[0])**2 + (y - star[1])**2)
                if d < 10:
                    too_close = True
                    break
            if not too_close:
                star_list.append((x, y))

        return len(star_list)

    except Exception as e:
        print(f"  ❌ star count failed: {e}")
        return 0

# CNN predict
def predict_from_url(model, classes, classes_rev, image_url: str, obs_id: str, templates: dict) -> dict | None:
    try:
        res = requests.get(image_url, timeout=10)
        if res.status_code != 200 or len(res.content) < 5000:
            return None

        image_bytes = res.content
        img         = Image.open(io.BytesIO(image_bytes)).convert('RGB')

        tf = transforms.Compose([
            transforms.Resize((IMG_SIZE, IMG_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406],
                                 [0.229, 0.224, 0.225]),
        ])

        with torch.no_grad():
            out   = model(tf(img).unsqueeze(0))
            probs = torch.softmax(out, dim=1)[0]
            pred  = probs.argmax().item()

        # นับดาวด้วย Template Matching
        star_count = count_stars(image_bytes, obs_id, templates)

        return {
            'cnn_prediction':          classes[pred],
            'cnn_confidence':          round(probs[pred].item(), 3),
            'cnn_score_clear':         round(probs[classes_rev['clear']].item(), 3)         if 'clear'         in classes_rev else 0,
            'cnn_score_partly_cloudy': round(probs[classes_rev['partly_cloudy']].item(), 3) if 'partly_cloudy' in classes_rev else 0,
            'cnn_score_cloudy':        round(probs[classes_rev['cloudy']].item(), 3)         if 'cloudy'        in classes_rev else 0,
            'cnn_score_rain':          round(probs[classes_rev['rain']].item(), 3)           if 'rain'          in classes_rev else 0,
            'cnn_updated_at':          datetime.now(timezone.utc),
            'star_count':              star_count,
            'star_updated_at':         datetime.now(timezone.utc),
        }
    except Exception as e:
        print(f"  ❌ predict failed: {e}")
        return None

# รันทุก 1 นาที
def run_prediction():
    print(f"\n🔭 {datetime.now().strftime('%H:%M:%S')} — CNN + Star Count...")

    records = list(db.weather_realtime.find({}))

    for r in records:
        obs_id    = r.get('observatory_id')
        image_url = r.get('narit_image_url')

        if not image_url:
            print(f"  ⚠️  {obs_id}: ไม่มีรูปครับ")
            continue

        result = predict_from_url(model, classes, classes_rev, image_url, obs_id, templates)
        if result:
            db.weather_realtime.update_one(
                {'observatory_id': obs_id},
                {'$set': result}
            )
            pred  = result['cnn_prediction']
            conf  = result['cnn_confidence']
            stars = result['star_count']
            print(f"  ✅ {obs_id}: {pred} ({conf*100:.1f}%) | ดาว {stars} ดวง")
        else:
            print(f"  ❌ {obs_id}: วิเคราะห์ไม่ได้ครับ")

    print("✅ เสร็จแล้วครับ!")

if __name__ == "__main__":
    if not MODEL_PATH.exists():
        print(f"❌ ไม่พบ {MODEL_PATH} ครับ")
        exit(1)

    model, classes = load_model()
    classes_rev    = {v: k for k, v in classes.items()}
    templates      = load_templates()

    print("\n🚀 เริ่มรัน CNN + Star Count ทุก 1 นาทีครับ")

    run_prediction()

    schedule.every(1).minutes.do(run_prediction)

    while True:
        schedule.run_pending()
        time.sleep(1)