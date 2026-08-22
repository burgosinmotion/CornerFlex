"""Analyze Phase 5.11B.2 animated/expression Layer Scale validation frames."""

from dataclasses import dataclass
import math
from pathlib import Path
import sys

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "output"
FRAMES = OUTPUT / "Phase511B2ValidationFrames"
REPORT = OUTPUT / "Phase511B2ValidationReport.txt"

TIMES = (0.0, 0.5, 1.0)


@dataclass(frozen=True)
class Case:
    case_id: str
    name: str
    scales: dict[float, tuple[float, float]]
    rectangle_position: tuple[float, float] = (0.0, 0.0)
    anchor: tuple[float, float] = (0.0, 0.0)
    position_offset: tuple[float, float] = (0.0, 0.0)
    trim: float = 10.0
    sample_times: tuple[float, ...] = TIMES
    fallback_times: tuple[float, ...] = ()
    always_fallback: bool = False


CASES = (
    Case("A", "Animated uniform Scale", {0.0: (100, 100), 0.5: (125, 125), 1.0: (150, 150)}),
    Case("B", "Animated non-uniform Scale", {0.0: (100, 100), 0.5: (125, 87.5), 1.0: (150, 75)}),
    Case("C", "Animated decimal Scale", {0.0: (100, 100), 0.5: (111.75, 93.625), 1.0: (123.5, 87.25)}),
    Case("D", "Expression uniform Scale", {0.0: (100, 100), 0.5: (125, 125), 1.0: (150, 150)}),
    Case("E", "Expression non-uniform Scale", {0.0: (100, 100), 0.5: (125, 112.5), 1.0: (150, 125)}),
    Case("F", "Anchor plus animated Scale", {0.0: (100, 100), 0.5: (125, 125), 1.0: (150, 150)}, anchor=(100, 50)),
    Case("G", "Layer Position plus animated Scale", {0.0: (100, 100), 0.5: (125, 125), 1.0: (150, 150)}, position_offset=(240, 160)),
    Case("H", "Rectangle Position plus animated Scale", {0.0: (100, 100), 0.5: (125, 125), 1.0: (150, 150)}, rectangle_position=(200, 100)),
    Case("I", "Animated Scale with Trim 10 percent", {0.0: (100, 100), 0.5: (125, 125), 1.0: (150, 150)}),
    Case("J", "Return to Layer Bounds during animated state", {1.0: (150, 150)}, sample_times=(1.0,)),
    Case("K", "Expression zero Scale fallback", {0.0: (100, 100), 0.5: (100, 100), 1.0: (0, 100)}, fallback_times=(1.0,)),
    Case("L", "Expression negative Scale fallback", {0.0: (100, 100), 0.5: (100, 100), 1.0: (-100, 100)}, fallback_times=(1.0,)),
    Case("M", "Animated valid Scale plus Rotation fallback", {0.0: (100, 100), 0.5: (125, 125), 1.0: (150, 150)}, always_fallback=True),
    Case("RA", "Regression static uniform Scale", {1.0: (150, 150)}, sample_times=(1.0,)),
    Case("RB", "Regression static non-uniform Scale", {1.0: (150, 75)}, sample_times=(1.0,)),
    Case("RC", "Regression Anchor", {1.0: (150, 150)}, anchor=(100, 50), sample_times=(1.0,)),
    Case("RD", "Regression Layer Position", {1.0: (150, 150)}, position_offset=(240, 160), sample_times=(1.0,)),
    Case("RE", "Regression Rectangle Position", {1.0: (150, 150)}, rectangle_position=(200, 100), sample_times=(1.0,)),
    Case("RF", "Regression Rotation fallback", {1.0: (150, 150)}, sample_times=(1.0,), always_fallback=True),
    Case("RG", "Regression Return to Layer Bounds", {1.0: (150, 150)}, sample_times=(1.0,)),
)


def label(time: float) -> str:
    text = str(time).rstrip("0").rstrip(".")
    return "T" + text.replace(".", "p")


def alpha_bbox(path: Path):
    with Image.open(path).convert("RGBA") as image:
        return image.getchannel("A").getbbox()


def rgba_difference(first: Path, second: Path):
    with Image.open(first).convert("RGBA") as first_image, Image.open(second).convert("RGBA") as second_image:
        return ImageChops.difference(first_image, second_image).getbbox()


def expected_bbox(case: Case, time: float):
    scale = case.scales[time]
    scale_x = scale[0] / 100.0
    scale_y = scale[1] / 100.0
    center_x = 960 + case.position_offset[0] + (case.rectangle_position[0] - case.anchor[0]) * scale_x
    center_y = 540 + case.position_offset[1] + (case.rectangle_position[1] - case.anchor[1]) * scale_y
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


def expects_fallback(case: Case, time: float) -> bool:
    return case.always_fallback or time in case.fallback_times


def analyze_frame(case: Case, time: float):
    stem = f"{case.case_id}_{label(time)}"
    layer = FRAMES / f"{stem}_LayerBounds.png"
    source = FRAMES / f"{stem}_RectangleSource.png"
    fallback = FRAMES / f"{stem}_Fallback.png"
    missing = [str(path) for path in (layer, source, fallback) if not path.is_file()]
    if missing:
        return [f"{case.case_id} {label(time)}: missing {missing}"], False

    layer_bbox = alpha_bbox(layer)
    source_bbox = alpha_bbox(source)
    fallback_bbox = alpha_bbox(fallback)
    fallback_difference = rgba_difference(layer, fallback)
    source_difference = rgba_difference(layer, source) if expects_fallback(case, time) else None
    expected = "Layer Bounds fallback" if expects_fallback(case, time) else expected_bbox(case, time)

    if expects_fallback(case, time):
        passed = source_difference is None and fallback_difference is None and source_bbox == layer_bbox == fallback_bbox
        source = "Layer Bounds fallback"
    else:
        passed = source_bbox == expected and fallback_difference is None
        source = "Rectangle Source"

    lines = [
        f"{case.case_id} {label(time)} {case.name}: {'PASS' if passed else 'FAIL'}",
        f"  compTime={time:.4f}; scale={case.scales[time]}; source={source}",
        f"  expected={expected}",
        f"  alphaBBoxes layer={layer_bbox}, source={source_bbox}, fallback={fallback_bbox}",
        f"  sourceVsLayerDifference={source_difference}; fallbackVsLayerDifference={fallback_difference}",
    ]
    return lines, passed


def main() -> int:
    lines = ["", "External RGBA Phase 5.11B.2 Animated/Expression Layer Scale analysis"]
    passed = True
    for case in CASES:
        for time in case.sample_times:
            frame_lines, frame_passed = analyze_frame(case, time)
            lines.extend(frame_lines)
            passed = passed and frame_passed
    lines.append(f"PHASE 5.11B.2 ANIMATED SCALE RESULT: {'PASS' if passed else 'FAIL'}")
    output = "\n".join(lines) + "\n"
    print(output)
    with REPORT.open("a", encoding="utf-8", newline="\n") as report:
        report.write(output)
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())