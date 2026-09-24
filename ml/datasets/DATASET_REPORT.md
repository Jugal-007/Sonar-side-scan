# MarineGuard AI — Dataset Inspection Report

Generated: 2026-09-10T12:24:37.446197+00:00

---

## Forward-Looking Sonar Object Detection

**Path:** `D:\hackathon_project\datasets\forward_sonar`
**Total Images:** 2035
**Total Labels:** 2035
**Classes (11):** mine, can, bottle, drink-carton, chain, propeller, tire, hook, valve, shampoo-bottle, standing-bottle
**Image Formats:** {'.png': 1868, '.jpg': 167}
**Common Dimensions:** {'438x658': 84, '500x605': 66}

**Annotation Format:** YOLO (class_id cx cy w h, normalized)

### Splits

| Split | Images | Labels | Missing | Empty |
|-------|--------|--------|---------|-------|
| train | 1627 | 1627 | 0 | 0 |
| val | 202 | 202 | 0 | 0 |
| test | 206 | 206 | 0 | 0 |

### Class Distribution (Total)

| Class | Count |
|-------|-------|
| bottle | 449 |
| can | 367 |
| drink-carton | 349 |
| tire | 331 |
| chain | 226 |
| valve | 208 |
| mine | 195 |
| propeller | 137 |
| hook | 133 |
| shampoo-bottle | 99 |
| standing-bottle | 65 |

**Total Objects:** 2559

**Objects per Image:** min=1, max=3, mean=1.26

---

## Sonar Mine Detection (MILCO/NonMILCO)

**Path:** `D:\hackathon_project\datasets\sonar_mine`
**Total Images:** 1170
**Total Labels:** 1170
**Classes (2):** MILCO, NonMILCO
**Image Formats:** {'.jpg': 1170}
**Common Dimensions:** {'1024x1024': 77, '416x416': 73}

**Annotation Format:** YOLO (class_id cx cy w h, normalized)

### Splits

| Split | Images | Labels | Missing | Empty |
|-------|--------|--------|---------|-------|
| train | 819 | 819 | 0 | 594 |
| val | 176 | 176 | 0 | 133 |
| test | 175 | 175 | 0 | 139 |

### Class Distribution (Total)

| Class | Count |
|-------|-------|
| MILCO | 437 |
| NonMILCO | 231 |

**Total Objects:** 668

**Objects per Image:** min=0, max=13, mean=0.57

---

## Modality Notes

- **Dataset 1 (forward_sonar):** Forward-Looking Sonar (ARIS 3000 Explorer). Images are from a controlled underwater debris detection experiment.
- **Dataset 2 (sonar_mine):** Sonar mine detection imagery with MILCO/NonMILCO classification. Likely side-scan or synthetic aperture sonar imagery.

> **IMPORTANT:** These two datasets use incompatible class taxonomies and potentially different sonar modalities. They are kept SEPARATE and should NOT be combined for training without careful consideration.

## Suitability

- **Dataset 1:** Primary training dataset for sonar object detection (11 classes).
- **Dataset 2:** Secondary dataset for cross-modality robustness analysis (2 classes).
