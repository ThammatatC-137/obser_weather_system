import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, transforms, models
from pathlib import Path
import json

DATASET_DIR = Path("dataset")
MODEL_PATH  = Path("sky_model.pth")
BATCH_SIZE  = 32
EPOCHS      = 15
IMG_SIZE    = 224
CLASSES = ["clear", "cloudy", "partly_cloudy", "rain"]

# augmentation สำหรับ train
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

# สำหรับ validation ไม่ augment
val_tf = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

def main():
    print("🔭 Sky Condition CNN — Training")
    print(f"   Dataset: {DATASET_DIR}")
    print(f"   Device:  CPU")
    print()

    # โหลด dataset
    full_dataset = datasets.ImageFolder(DATASET_DIR, transform=train_tf)
    print(f" Dataset: {len(full_dataset)} รูป")
    for cls, idx in full_dataset.class_to_idx.items():
        count = sum(1 for _, l in full_dataset.samples if l == idx)
        print(f"   {cls}: {count} รูป")

    # แบ่ง train/val 80:20
    n     = len(full_dataset)
    n_val = int(n * 0.2)
    n_trn = n - n_val
    train_ds, val_ds = torch.utils.data.random_split(full_dataset, [n_trn, n_val])
    val_ds.dataset.transform = val_tf

    # WeightedSampler แก้ imbalanced dataset
    labels     = [full_dataset.samples[i][1] for i in train_ds.indices]
    class_count = [labels.count(i) for i in range(len(CLASSES))]
    weights    = [1.0 / class_count[l] for l in labels]
    sampler    = WeightedRandomSampler(weights, len(weights))

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, sampler=sampler,  num_workers=2)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=2)

    # โหลด EfficientNet pretrained แล้ว fine-tune
    model     = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(CLASSES))

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)

    best_acc = 0.0
    print(f"\n เริ่ม Train {EPOCHS} epochs...")
    print("-" * 50)

    for epoch in range(EPOCHS):
        # Train
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

        # Validation
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

        # บันทึก model ที่ดีที่สุด
        if val_acc > best_acc:
            best_acc = val_acc
            torch.save({
                'model_state': model.state_dict(),
                'class_to_idx': full_dataset.class_to_idx,
                'val_acc': val_acc,
            }, MODEL_PATH)
            print(f"           บันทึก model ใหม่ (val_acc={val_acc:.1f}%)")

        scheduler.step()

    print("-" * 50)
    print(f"\n Train เสร็จ! Best val accuracy: {best_acc:.1f}%")
    print(f"   Model บันทึกที่: {MODEL_PATH}")

if __name__ == "__main__":
    main()