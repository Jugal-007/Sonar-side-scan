import os
import shutil
from pathlib import Path
import yaml

# Paths
ROOT = Path(__file__).resolve().parent.parent
FS_ROOT = ROOT / "datasets" / "forward_sonar"
SM_ROOT = ROOT / "datasets" / "sonar_mine"
SY3_ROOT = ROOT / "datasets" / "sonar-yolo-3.yolov11"
OUT_ROOT = ROOT / "ml" / "datasets" / "processed" / "combined"

def setup_dirs():
    if OUT_ROOT.exists():
        shutil.rmtree(OUT_ROOT)
    for split in ["train", "val", "test"]:
        (OUT_ROOT / "images" / split).mkdir(parents=True, exist_ok=True)
        (OUT_ROOT / "labels" / split).mkdir(parents=True, exist_ok=True)

def process_forward_sonar():
    print("Processing forward_sonar...")
    for split in ["train", "val", "test"]:
        img_dir = FS_ROOT / "images" / split
        lbl_dir = FS_ROOT / "labels" / split
        
        if not img_dir.exists():
            continue
            
        for img_file in img_dir.glob("*.*"):
            if img_file.suffix.lower() not in [".jpg", ".png", ".jpeg"]:
                continue
                
            new_name = f"fs_{img_file.name}"
            shutil.copy(img_file, OUT_ROOT / "images" / split / new_name)
            
            lbl_file = lbl_dir / f"{img_file.stem}.txt"
            if lbl_file.exists():
                shutil.copy(lbl_file, OUT_ROOT / "labels" / split / f"fs_{img_file.stem}.txt")

def process_sonar_mine():
    print("Processing sonar_mine...")
    # mapping splits
    splits = {
        "train": SM_ROOT / "train" / "train",
        "val": SM_ROOT / "val" / "val",
        "test": SM_ROOT / "test" / "test"
    }
    
    for split, src_dir in splits.items():
        img_dir = src_dir / "images"
        lbl_dir = src_dir / "labels"
        
        if not img_dir.exists():
            continue
            
        for img_file in img_dir.glob("*.*"):
            if img_file.suffix.lower() not in [".jpg", ".png", ".jpeg"]:
                continue
                
            new_name = f"sm_{img_file.name}"
            shutil.copy(img_file, OUT_ROOT / "images" / split / new_name)
            
            lbl_file = lbl_dir / f"{img_file.stem}.txt"
            if lbl_file.exists():
                out_lbl_path = OUT_ROOT / "labels" / split / f"sm_{img_file.stem}.txt"
                with open(lbl_file, "r") as f:
                    lines = f.readlines()
                
                with open(out_lbl_path, "w") as f:
                    for line in lines:
                        parts = line.strip().split()
                        if not parts:
                            continue
                        cls_id = int(parts[0])
                        # Map: 0 (MILCO) -> 0 (mine), 1 (NonMILCO) -> 11
                        if cls_id == 1:
                            parts[0] = "11"
                        f.write(" ".join(parts) + "\n")

def process_sonar_yolo_3():
    print("Processing sonar-yolo-3.yolov11...")
    splits = {
        "train": SY3_ROOT / "train",
        "val": SY3_ROOT / "valid",
        # no test split
    }
    
    for split, src_dir in splits.items():
        img_dir = src_dir / "images"
        lbl_dir = src_dir / "labels"
        
        if not img_dir.exists():
            continue
            
        for img_file in img_dir.glob("*.*"):
            if img_file.suffix.lower() not in [".jpg", ".png", ".jpeg"]:
                continue
                
            new_name = f"sy3_{img_file.name}"
            shutil.copy(img_file, OUT_ROOT / "images" / split / new_name)
            
            lbl_file = lbl_dir / f"{img_file.stem}.txt"
            if lbl_file.exists():
                out_lbl_path = OUT_ROOT / "labels" / split / f"sy3_{img_file.stem}.txt"
                with open(lbl_file, "r") as f:
                    lines = f.readlines()
                
                with open(out_lbl_path, "w") as f:
                    for line in lines:
                        parts = line.strip().split()
                        if not parts:
                            continue
                        cls_id = int(parts[0])
                        # Map: 0: boat -> 12, 1: body -> 13, 2: plane -> 14, 3: rocks -> 15
                        parts[0] = str(cls_id + 12)
                        f.write(" ".join(parts) + "\n")

def write_yaml():
    yaml_content = {
        "path": str(OUT_ROOT.resolve()),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "nc": 16,
        "names": {
            0: "mine",
            1: "can",
            2: "bottle",
            3: "drink-carton",
            4: "chain",
            5: "propeller",
            6: "tire",
            7: "hook",
            8: "valve",
            9: "shampoo-bottle",
            10: "standing-bottle",
            11: "NonMILCO",
            12: "boat",
            13: "body",
            14: "plane",
            15: "rocks"
        }
    }
    
    with open(OUT_ROOT / "combined.yaml", "w") as f:
        yaml.dump(yaml_content, f, default_flow_style=False)
    print(f"Created YAML at {OUT_ROOT / 'combined.yaml'}")

if __name__ == "__main__":
    setup_dirs()
    process_forward_sonar()
    process_sonar_mine()
    process_sonar_yolo_3()
    write_yaml()
    print("Done combining datasets.")
