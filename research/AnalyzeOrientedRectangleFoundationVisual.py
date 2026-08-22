"""Analyze Phase 5.12B oriented rectangle foundation visual validation frames."""

from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "output"
FRAMES = OUTPUT / "Phase512BValidationFrames"
REPORT = OUTPUT / "Phase512BValidationReport.txt"

CASES = {
    "A_T1": ("Base", (760, 340, 1160, 740), False),
    "B_T1": ("Scale 150x150", (660, 240, 1260, 840), False),
    "C_T1": ("Scale 150x75", (660, 390, 1260, 690), False),
    "D_T1": ("Anchor plus Scale", (510, 165, 1110, 765), False),
    "E_T1": ("Layer Position plus Scale", (900, 400, 1500, 1000), False),
    "F_T1": ("Rectangle Position plus Scale", (960, 390, 1560, 990), False),
    "G_T0": ("Animated Scale T0", (760, 340, 1160, 740), False),
    "G_T0p5": ("Animated Scale T0.5", (710, 290, 1210, 790), False),
    "G_T1": ("Animated Scale T1", (660, 240, 1260, 840), False),
    "H_T0": ("Expression Scale T0", (760, 340, 1160, 740), False),
    "H_T0p5": ("Expression Scale T0.5", (710, 290, 1210, 790), False),
    "H_T1": ("Expression Scale T1", (660, 240, 1260, 840), False),
    "I_T1": ("Rotation 20 fallback", "Layer Bounds fallback", True),
    "J_T1": ("Rotation 20 plus Scale 150x150 fallback", "Layer Bounds fallback", True),
    "K_T1": ("Return to Layer Bounds", (660, 240, 1260, 840), False),
}


def alpha_bbox(path: Path):
    with Image.open(path).convert("RGBA") as image:
        return image.getchannel("A").getbbox()


def rgba_difference(first: Path, second: Path):
    with Image.open(first).convert("RGBA") as first_image, Image.open(second).convert("RGBA") as second_image:
        return ImageChops.difference(first_image, second_image).getbbox()


def analyze_case(stem: str, name: str, expected, fallback: bool):
    layer = FRAMES / f"{stem}_LayerBounds.png"
    source = FRAMES / f"{stem}_RectangleSource.png"
    fallback_frame = FRAMES / f"{stem}_Fallback.png"
    missing = [str(path) for path in (layer, source, fallback_frame) if not path.is_file()]
    if missing:
        return [f"{stem} {name}: FAIL missing {missing}"], False

    layer_bbox = alpha_bbox(layer)
    source_bbox = alpha_bbox(source)
    fallback_bbox = alpha_bbox(fallback_frame)
    fallback_diff = rgba_difference(layer, fallback_frame)
    source_diff = rgba_difference(layer, source) if fallback else None

    if fallback:
        passed = source_diff is None and fallback_diff is None and source_bbox == layer_bbox == fallback_bbox
        source_name = "Layer Bounds fallback"
    else:
        passed = source_bbox == expected and fallback_diff is None
        source_name = "Rectangle Source"

    lines = [
        f"{stem} {name}: {'PASS' if passed else 'FAIL'}",
        f"  source={source_name}",
        f"  expected={expected}",
        f"  alphaBBoxes layer={layer_bbox}, source={source_bbox}, fallback={fallback_bbox}",
        f"  sourceVsLayerDifference={source_diff}; fallbackVsLayerDifference={fallback_diff}",
    ]
    return lines, passed


def main():
    lines = ["", "External RGBA Phase 5.12B Oriented Rectangle Foundation visual analysis"]
    all_passed = True
    for stem, (name, expected, fallback) in CASES.items():
        case_lines, passed = analyze_case(stem, name, expected, fallback)
        lines.extend(case_lines)
        all_passed = all_passed and passed

    lines.append(f"PHASE 5.12B ORIENTED RECTANGLE FOUNDATION VISUAL RESULT: {'PASS' if all_passed else 'FAIL'}")
    text = "\n".join(lines) + "\n"
    print(text)
    with REPORT.open("a", encoding="utf-8") as report:
        report.write(text)
    raise SystemExit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
