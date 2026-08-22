"""Analyze Phase 5.11B.1 static positive Layer Scale validation frames."""

from dataclasses import dataclass
import math
from pathlib import Path
import sys

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "output"
FRAMES = OUTPUT / "RectangleLayerScale2DFrames"
REPORT = OUTPUT / "RectangleLayerScale2DReport.txt"


@dataclass(frozen=True)
class Case:
    case_id: str
    scale: tuple[float, float]
    rectangle_position: tuple[float, float] = (0.0, 0.0)
    anchor: tuple[float, float] = (0.0, 0.0)
    position_offset: tuple[float, float] = (0.0, 0.0)
    trim: float = 10.0
    fallback: bool = False


CASES = (
    Case("A", (100, 100)),
    Case("B", (150, 150)),
    Case("C", (50, 50)),
    Case("D", (150, 75)),
    Case("E", (75, 150)),
    Case("F", (123.5, 87.25)),
    Case("I", (150, 150), anchor=(100, 50)),
    Case("J", (150, 150), position_offset=(240, 160)),
    Case("K", (150, 150), rectangle_position=(200, 100)),
    Case("L", (150, 75), rectangle_position=(200, 100), anchor=(100, 50), position_offset=(240, 160)),
    Case("M", (150, 150), trim=0),
    Case("N", (150, 150), trim=10),
    Case("O", (150, 150), trim=50),
    Case("P", (150, 150), trim=10),
    Case("Q", (150, 150), fallback=True),
    Case("R", (150, 150), fallback=True),
    Case("S", (150, 150), fallback=True),
    Case("T", (0, 100), fallback=True),
    Case("U", (-100, 100), fallback=True),
)


def alpha_bbox(path: Path):
    with Image.open(path).convert("RGBA") as image:
        return image.getchannel("A").getbbox()


def rgba_difference(first: Path, second: Path):
    with (
        Image.open(first).convert("RGBA") as first_image,
        Image.open(second).convert("RGBA") as second_image,
    ):
        return ImageChops.difference(first_image, second_image).getbbox()


def expected_bbox(case: Case):
    scale_x = case.scale[0] / 100.0
    scale_y = case.scale[1] / 100.0
    center_x = 960 + case.position_offset[0] + (
        case.rectangle_position[0] - case.anchor[0]
    ) * scale_x
    center_y = 540 + case.position_offset[1] + (
        case.rectangle_position[1] - case.anchor[1]
    ) * scale_y
    half_width = 250 * scale_x
    half_height = 250 * scale_y
    trim_x = half_width * 2 * case.trim / 100.0
    trim_y = half_height * 2 * case.trim / 100.0
    bounds = (
        center_x - half_width + trim_x,
        center_y - half_height + trim_y,
        center_x + half_width - trim_x,
        center_y + half_height - trim_y,
    )
    if bounds[0] >= bounds[2] or bounds[1] >= bounds[3]:
        return None
    return tuple(math.ceil(value) for value in bounds)


def analyze(case: Case):
    layer = FRAMES / f"{case.case_id}_LayerBounds.png"
    source = FRAMES / f"{case.case_id}_RectangleSource.png"
    restored = FRAMES / f"{case.case_id}_Fallback.png"
    missing = [path for path in (layer, source, restored) if not path.is_file()]
    if missing:
        return [f"{case.case_id}: missing {missing}"], False

    layer_bbox = alpha_bbox(layer)
    source_bbox = alpha_bbox(source)
    restored_bbox = alpha_bbox(restored)
    restored_difference = rgba_difference(layer, restored)

    if case.fallback:
        source_difference = rgba_difference(layer, source)
        passed = source_difference is None and restored_difference is None
        expected = "Layer Bounds fallback"
    else:
        source_difference = None
        expected = expected_bbox(case)
        passed = source_bbox == expected and restored_difference is None

    lines = [
        f"{case.case_id}: scale={case.scale}, trim={case.trim}, expected={expected}",
        f"{case.case_id}: alphaBBoxes layer={layer_bbox}, source={source_bbox}, fallback={restored_bbox}",
        f"{case.case_id}: sourceVsLayerDifference={source_difference}, fallbackVsLayerDifference={restored_difference}, {'PASS' if passed else 'FAIL'}",
    ]
    return lines, passed


def main():
    lines = ["", "External RGBA Phase 5.11B.1 Layer Scale analysis"]
    passed = True
    for case in CASES:
        case_lines, case_passed = analyze(case)
        lines.extend(case_lines)
        passed = passed and case_passed
    lines.append(f"PHASE 5.11B.1 STATIC SCALE RESULT: {'PASS' if passed else 'FAIL'}")
    output = "\n".join(lines) + "\n"
    print(output)
    with REPORT.open("a", encoding="utf-8", newline="\n") as report:
        report.write(output)
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
