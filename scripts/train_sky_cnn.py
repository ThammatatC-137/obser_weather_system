import torch
import torch.nn as nn
from torch.utils.data import DataLoader, WeightedRandomSampler, Subset
from torchvision import datasets, transforms, models
from pathlib import Path

DATASET_DIR = Path("dataset")
MODEL_PATH  = Path("sky_model.pth")
BATCH_SIZE  = 32
EPOCHS      = 15
IMG_SIZE    = 224
CLASSES = ["clear", "cloudy", "partly_cloudy", "rain"]

# transform สำหรับ train มีการ augment เพิ่มความหลากหลายของข้อมูล
train_tf = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(),
    transforms.RandomRotation(30),
    transforms.ColorJitter(brightness=0.3, contrast=0.3),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

# transform สำหรับ validation ไม่ augment
val_tf = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

def main():
    print("Sky Condition CNN - Training")
    print(f"   Dataset: {DATASET_DIR}")
    print(f"   Device:  CPU")
    print()

    # โหลด dataset 2 ชุด ชุด train ใช้ augment ชุด val ไม่ใช้
    train_dataset = datasets.ImageFolder(DATASET_DIR, transform=train_tf)
    val_dataset   = datasets.ImageFolder(DATASET_DIR, transform=val_tf)
    print(f"Dataset: {len(train_dataset)} images")
    for cls, idx in train_dataset.class_to_idx.items():
        count = sum(1 for _, l in train_dataset.samples if l == idx)
        print(f"   {cls}: {count} images")

    # แบ่ง train/val 80:20 ใช้ index ชุดเดียวกันไม่ให้ข้อมูลซ้ำกัน
    n        = len(train_dataset)
    n_val    = int(n * 0.2)
    n_trn    = n - n_val
    indices  = torch.randperm(n).tolist()
    train_ds = Subset(train_dataset, indices[:n_trn])
    val_ds   = Subset(val_dataset,   indices[n_trn:])

    # ใช้ WeightedSampler ชดเชยข้อมูลที่แต่ละ class ไม่เท่ากัน
    labels     = [train_dataset.samples[i][1] for i in train_ds.indices]
    class_count = [labels.count(i) for i in range(len(CLASSES))]
    weights    = [1.0 / class_count[l] for l in labels]
    sampler    = WeightedRandomSampler(weights, len(weights))

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, sampler=sampler,  num_workers=2)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=2)

    # โหลด EfficientNet ที่ pretrained มาแล้ว เปลี่ยน layer สุดท้ายให้ตรงกับจำนวน class
    model     = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(CLASSES))

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)

    best_acc = 0.0
    print(f"\nStart training {EPOCHS} epochs...")
    print("-" * 50)

    for epoch in range(EPOCHS):
        # รอบ train
        model.train()
        train_loss, train_correct, train_total = 0, 0, 0
        for imgs, labels in train_loader:
            optimizer.zero_grad()
            outputs = model(imgs)
            loss    = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss    += loss.item()
            preds          = outputs.argmax(1)
            train_correct += (preds == labels).sum().item()
            train_total   += labels.size(0)

        # รอบ validation
        model.eval()
        val_correct, val_total = 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                outputs     = model(imgs)
                preds       = outputs.argmax(1)
                val_correct += (preds == labels).sum().item()
                val_total   += labels.size(0)

        train_acc = train_correct / train_total * 100
        val_acc   = val_correct   / val_total   * 100

        print(f"Epoch {epoch+1:2d}/{EPOCHS} | Loss: {train_loss/len(train_loader):.3f} | Train: {train_acc:.1f}% | Val: {val_acc:.1f}%")

        # เก็บ model ที่ได้ accuracy ดีที่สุด
        if val_acc > best_acc:
            best_acc = val_acc
            torch.save({
                'model_state': model.state_dict(),
                'class_to_idx': train_dataset.class_to_idx,
                'val_acc': val_acc,
            }, MODEL_PATH)
            print(f"           saved new model (val_acc={val_acc:.1f}%)")

        scheduler.step()

    print("-" * 50)
    print(f"\nTraining done. Best val accuracy: {best_acc:.1f}%")
    print(f"   Model saved at: {MODEL_PATH}")

if __name__ == "__main__":
    main()
