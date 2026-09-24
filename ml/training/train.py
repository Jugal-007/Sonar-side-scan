"""MarineGuard AI — YOLO Training Pipeline.

Train a YOLO model on the Forward-Looking Sonar dataset.

Usage:
    python ml/training/train.py [--epochs 30] [--batch 16] [--model yolo11s.pt] [--imgsz 640]
"""

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))


def create_dataset_yaml(dataset_path: Path, output_path: Path) -> Path:
    """Create a YOLO-compatible dataset YAML with correct paths."""
    import yaml

    original_yaml = dataset_path / "data.yaml"
    if not original_yaml.exists():
        raise FileNotFoundError(f"No data.yaml found at {original_yaml}")

    with open(original_yaml) as f:
        config = yaml.safe_load(f)

    # Fix paths to be absolute
    config["path"] = str(dataset_path.resolve())
    config["train"] = "images/train"
    config["val"] = "images/val"
    config["test"] = "images/test"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        yaml.dump(config, f, default_flow_style=False)

    print(f"✓ Dataset YAML: {output_path}")
    print(f"  Classes: {config.get('names', {})}")
    return output_path


def train(
    epochs: int = 30,
    batch: int = 16,
    model: str = "yolo11s.pt",
    imgsz: int = 640,
    device: str = "",
):
    """Train YOLO on the forward sonar dataset."""
    from ultralytics import YOLO
    import torch

    output_dir = ROOT / "ml" / "models" / "trained"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Point to the combined dataset YAML
    yaml_path = ROOT / "ml" / "datasets" / "processed" / "combined" / "combined.yaml"

    # Determine device
    if not device:
        device = "0" if torch.cuda.is_available() else "cpu"

    print(f"\n{'='*60}")
    print(f"  MarineGuard AI — YOLO Training")
    print(f"{'='*60}")
    print(f"  Model:   {model}")
    print(f"  Epochs:  {epochs}")
    print(f"  Batch:   {batch}")
    print(f"  ImgSize: {imgsz}")
    print(f"  Device:  {device}")
    if torch.cuda.is_available():
        print(f"  GPU:     {torch.cuda.get_device_name(0)}")
    print(f"{'='*60}\n")

    # Load base model
    yolo = YOLO(model)

    # Train
    results = yolo.train(
        data=str(yaml_path),
        epochs=epochs,
        batch=batch,
        imgsz=imgsz,
        device=device,
        project=str(ROOT / "runs"),
        name="marineguard_train",
        exist_ok=True,
        # Sonar-appropriate augmentation
        flipud=0.0,      # No vertical flip (sonar geometry)
        fliplr=0.5,      # Horizontal flip OK
        mosaic=0.5,       # Moderate mosaic
        degrees=5.0,      # Mild rotation
        scale=0.3,        # Scaling
        translate=0.1,    # Translation
        hsv_h=0.01,       # Minimal hue shift (grayscale-ish)
        hsv_s=0.3,        # Saturation
        hsv_v=0.3,        # Value/brightness
        verbose=True,
    )

    # Copy best weights
    best_src = ROOT / "runs" / "marineguard_train" / "weights" / "best.pt"
    last_src = ROOT / "runs" / "marineguard_train" / "weights" / "last.pt"

    if best_src.exists():
        import shutil
        shutil.copy2(best_src, output_dir / "best.pt")
        print(f"\n✓ Best weights: {output_dir / 'best.pt'}")

    if last_src.exists():
        import shutil
        shutil.copy2(last_src, output_dir / "last.pt")
        print(f"✓ Last weights: {output_dir / 'last.pt'}")

    print("\n✓ Training complete!")
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MarineGuard AI YOLO Training")
    parser.add_argument("--epochs", type=int, default=30, help="Training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--model", type=str, default="yolo11s.pt", help="Base model")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--device", type=str, default="", help="Device (e.g., 0, cpu)")
    args = parser.parse_args()

    train(
        epochs=args.epochs,
        batch=args.batch,
        model=args.model,
        imgsz=args.imgsz,
        device=args.device,
    )
