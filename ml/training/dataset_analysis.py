"""MarineGuard AI — Dataset Analysis Script.

Inspects both sonar datasets and generates:
  - ml/datasets/dataset_stats.json
  - ml/datasets/DATASET_REPORT.md

Usage:
    python ml/training/dataset_analysis.py
"""

import json
import os
import sys
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime, timezone

import cv2
import numpy as np
import yaml
from tqdm import tqdm

# Ensure project root is on path
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))


def analyze_dataset(name: str, base_path: Path, yaml_path: Path = None) -> dict:
    """Analyze a single dataset and return statistics."""
    stats = {
        "name": name,
        "path": str(base_path),
        "yaml_path": str(yaml_path) if yaml_path else None,
        "exists": base_path.exists(),
    }

    if not base_path.exists():
        stats["error"] = "Dataset path does not exist"
        return stats

    # Parse YAML config if available
    yaml_config = {}
    if yaml_path and yaml_path.exists():
        with open(yaml_path) as f:
            yaml_config = yaml.safe_load(f)
        stats["yaml_config"] = yaml_config

    # Discover class names
    class_names = {}
    names_cfg = yaml_config.get("names", {})
    if isinstance(names_cfg, dict):
        class_names = {int(k): v for k, v in names_cfg.items()}
    elif isinstance(names_cfg, list):
        class_names = {i: n for i, n in enumerate(names_cfg)}
    stats["classes"] = class_names
    stats["num_classes"] = len(class_names)

    # Find image and label directories
    splits = {}
    for split_name in ["train", "val", "test"]:
        split_info = _find_split(base_path, split_name)
        if split_info:
            splits[split_name] = split_info

    stats["splits"] = {}
    total_images = 0
    total_labels = 0
    all_class_counts = Counter()
    all_objects_per_image = []
    all_bbox_widths = []
    all_bbox_heights = []
    all_formats = Counter()
    all_dimensions = Counter()
    missing_labels = 0
    empty_labels = 0
    corrupt_images = 0

    for split_name, (img_dir, lbl_dir) in splits.items():
        split_stats = {"image_dir": str(img_dir), "label_dir": str(lbl_dir)}

        # Image files
        image_files = sorted([
            f for f in img_dir.iterdir()
            if f.is_file() and f.suffix.lower() in (".png", ".jpg", ".jpeg", ".bmp", ".tiff")
        ])
        split_stats["image_count"] = len(image_files)
        total_images += len(image_files)

        # Formats
        for f in image_files:
            all_formats[f.suffix.lower()] += 1

        # Sample dimensions (check first 50 + random 50)
        sample_files = image_files[:50]
        dim_counter = Counter()
        corrupt_count = 0
        for f in sample_files:
            try:
                img = cv2.imread(str(f))
                if img is not None:
                    h, w = img.shape[:2]
                    dim_counter[(w, h)] += 1
                    all_dimensions[(w, h)] += 1
                else:
                    corrupt_count += 1
            except Exception:
                corrupt_count += 1

        split_stats["sample_dimensions"] = {f"{w}x{h}": c for (w, h), c in dim_counter.most_common(5)}
        split_stats["corrupt_images_sampled"] = corrupt_count
        corrupt_images += corrupt_count

        # Label files
        if lbl_dir and lbl_dir.exists():
            label_files = sorted([
                f for f in lbl_dir.iterdir()
                if f.is_file() and f.suffix.lower() == ".txt"
            ])
            split_stats["label_count"] = len(label_files)
            total_labels += len(label_files)

            # Check for missing labels
            image_stems = {f.stem for f in image_files}
            label_stems = {f.stem for f in label_files}
            missing = image_stems - label_stems
            split_stats["missing_labels"] = len(missing)
            missing_labels += len(missing)

            # Parse labels
            class_counts = Counter()
            objects_per_image = []
            bbox_widths = []
            bbox_heights = []
            empty_count = 0

            for lf in tqdm(label_files, desc=f"  {name}/{split_name} labels", leave=False):
                try:
                    with open(lf) as f:
                        lines = [l.strip() for l in f.readlines() if l.strip()]

                    if not lines:
                        empty_count += 1
                        objects_per_image.append(0)
                        continue

                    objects_per_image.append(len(lines))
                    for line in lines:
                        parts = line.split()
                        if len(parts) >= 5:
                            cls_id = int(parts[0])
                            bw = float(parts[3])
                            bh = float(parts[4])
                            class_counts[cls_id] += 1
                            bbox_widths.append(bw)
                            bbox_heights.append(bh)
                except Exception:
                    pass

            split_stats["class_distribution"] = {
                class_names.get(k, f"class_{k}"): v
                for k, v in sorted(class_counts.items())
            }
            split_stats["empty_labels"] = empty_count
            split_stats["objects_per_image"] = {
                "min": min(objects_per_image) if objects_per_image else 0,
                "max": max(objects_per_image) if objects_per_image else 0,
                "mean": round(np.mean(objects_per_image), 2) if objects_per_image else 0,
            }
            if bbox_widths:
                split_stats["bbox_width"] = {
                    "min": round(min(bbox_widths), 4),
                    "max": round(max(bbox_widths), 4),
                    "mean": round(np.mean(bbox_widths), 4),
                }
                split_stats["bbox_height"] = {
                    "min": round(min(bbox_heights), 4),
                    "max": round(max(bbox_heights), 4),
                    "mean": round(np.mean(bbox_heights), 4),
                }

            all_class_counts += class_counts
            all_objects_per_image.extend(objects_per_image)
            all_bbox_widths.extend(bbox_widths)
            all_bbox_heights.extend(bbox_heights)
            empty_labels += empty_count
        else:
            split_stats["label_count"] = 0
            split_stats["missing_labels"] = len(image_files)

        stats["splits"][split_name] = split_stats

    # Aggregates
    stats["total_images"] = total_images
    stats["total_labels"] = total_labels
    stats["total_missing_labels"] = missing_labels
    stats["total_empty_labels"] = empty_labels
    stats["total_corrupt_images_sampled"] = corrupt_images
    stats["image_formats"] = dict(all_formats)
    stats["common_dimensions"] = {f"{w}x{h}": c for (w, h), c in all_dimensions.most_common(5)}
    stats["total_class_distribution"] = {
        class_names.get(k, f"class_{k}"): v
        for k, v in sorted(all_class_counts.items())
    }
    stats["total_objects"] = sum(all_class_counts.values())
    if all_objects_per_image:
        stats["objects_per_image_overall"] = {
            "min": min(all_objects_per_image),
            "max": max(all_objects_per_image),
            "mean": round(np.mean(all_objects_per_image), 2),
        }

    return stats


def _find_split(base: Path, split_name: str):
    """Find image and label directories for a split."""
    # Try common structures
    candidates_img = [
        base / "images" / split_name,
        base / split_name / "images",
        base / split_name / split_name / "images",
    ]
    candidates_lbl = [
        base / "labels" / split_name,
        base / split_name / "labels",
        base / split_name / split_name / "labels",
    ]

    img_dir = None
    lbl_dir = None

    for c in candidates_img:
        if c.exists() and any(c.iterdir()):
            img_dir = c
            break

    for c in candidates_lbl:
        if c.exists() and any(c.iterdir()):
            lbl_dir = c
            break

    if img_dir:
        return (img_dir, lbl_dir)
    return None


def generate_report(stats: dict) -> str:
    """Generate human-readable markdown report."""
    lines = [
        "# MarineGuard AI — Dataset Inspection Report",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        "",
        "---",
        "",
    ]

    for ds in stats.get("datasets", []):
        lines.append(f"## {ds['name']}")
        lines.append("")
        lines.append(f"**Path:** `{ds['path']}`")
        lines.append(f"**Total Images:** {ds.get('total_images', 0)}")
        lines.append(f"**Total Labels:** {ds.get('total_labels', 0)}")
        lines.append(f"**Classes ({ds.get('num_classes', 0)}):** {', '.join(ds.get('classes', {}).values())}")
        lines.append(f"**Image Formats:** {ds.get('image_formats', {})}")
        lines.append(f"**Common Dimensions:** {ds.get('common_dimensions', {})}")
        lines.append("")

        # Annotation format
        lines.append("**Annotation Format:** YOLO (class_id cx cy w h, normalized)")
        lines.append("")

        # Splits
        lines.append("### Splits")
        lines.append("")
        lines.append("| Split | Images | Labels | Missing | Empty |")
        lines.append("|-------|--------|--------|---------|-------|")
        for split_name, split_data in ds.get("splits", {}).items():
            lines.append(
                f"| {split_name} | {split_data.get('image_count', 0)} | "
                f"{split_data.get('label_count', 0)} | "
                f"{split_data.get('missing_labels', 0)} | "
                f"{split_data.get('empty_labels', 0)} |"
            )
        lines.append("")

        # Class distribution
        dist = ds.get("total_class_distribution", {})
        if dist:
            lines.append("### Class Distribution (Total)")
            lines.append("")
            lines.append("| Class | Count |")
            lines.append("|-------|-------|")
            for cls, cnt in sorted(dist.items(), key=lambda x: -x[1]):
                lines.append(f"| {cls} | {cnt} |")
            lines.append("")
            lines.append(f"**Total Objects:** {ds.get('total_objects', 0)}")
            lines.append("")

        # Bbox stats
        obi = ds.get("objects_per_image_overall", {})
        if obi:
            lines.append(f"**Objects per Image:** min={obi.get('min')}, max={obi.get('max')}, mean={obi.get('mean')}")
            lines.append("")

        lines.append("---")
        lines.append("")

    # Modality notes
    lines.extend([
        "## Modality Notes",
        "",
        "- **Dataset 1 (forward_sonar):** Forward-Looking Sonar (ARIS 3000 Explorer). "
        "Images are from a controlled underwater debris detection experiment.",
        "- **Dataset 2 (sonar_mine):** Sonar mine detection imagery with MILCO/NonMILCO classification. "
        "Likely side-scan or synthetic aperture sonar imagery.",
        "",
        "> **IMPORTANT:** These two datasets use incompatible class taxonomies and "
        "potentially different sonar modalities. They are kept SEPARATE and should "
        "NOT be combined for training without careful consideration.",
        "",
        "## Suitability",
        "",
        "- **Dataset 1:** Primary training dataset for sonar object detection (11 classes).",
        "- **Dataset 2:** Secondary dataset for cross-modality robustness analysis (2 classes).",
        "",
    ])

    return "\n".join(lines)


def main():
    print("=" * 60)
    print("  MarineGuard AI — Dataset Analysis")
    print("=" * 60)

    output_dir = ROOT / "ml" / "datasets"
    output_dir.mkdir(parents=True, exist_ok=True)

    all_stats = {"datasets": [], "generated_at": datetime.now(timezone.utc).isoformat()}

    # Dataset 1
    print("\n[1/2] Analyzing Forward-Looking Sonar dataset...")
    ds1_path = ROOT / "datasets" / "forward_sonar"
    ds1_yaml = ds1_path / "data.yaml"
    ds1_stats = analyze_dataset(
        "Forward-Looking Sonar Object Detection",
        ds1_path,
        ds1_yaml,
    )
    ds1_stats["modality"] = "Forward-Looking Sonar"
    ds1_stats["source"] = "Kaggle: forward-looking-sonar-object-detection-dataset"
    all_stats["datasets"].append(ds1_stats)

    # Dataset 2
    print("\n[2/2] Analyzing Sonar Mine Detection dataset...")
    ds2_path = ROOT / "datasets" / "sonar_mine"
    ds2_yaml = ds2_path / "mine.yaml"
    ds2_stats = analyze_dataset(
        "Sonar Mine Detection (MILCO/NonMILCO)",
        ds2_path,
        ds2_yaml,
    )
    ds2_stats["modality"] = "Sonar Mine Imagery (Side-Scan / SAR)"
    ds2_stats["source"] = "Kaggle: sonar-imaging-mine-detection"
    all_stats["datasets"].append(ds2_stats)

    # Save JSON
    json_path = output_dir / "dataset_stats.json"
    with open(json_path, "w") as f:
        json.dump(all_stats, f, indent=2, default=str)
    print(f"\n✓ Saved: {json_path}")

    # Save Markdown report
    report = generate_report(all_stats)
    md_path = output_dir / "DATASET_REPORT.md"
    with open(md_path, "w") as f:
        f.write(report)
    print(f"✓ Saved: {md_path}")

    # Summary
    for ds in all_stats["datasets"]:
        print(f"\n  {ds['name']}:")
        print(f"    Images: {ds.get('total_images', 0)}")
        print(f"    Classes: {list(ds.get('classes', {}).values())}")
        print(f"    Objects: {ds.get('total_objects', 0)}")

    print("\n✓ Dataset analysis complete!")


if __name__ == "__main__":
    main()
