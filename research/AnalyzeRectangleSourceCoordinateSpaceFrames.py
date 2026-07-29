"""Analyze Phase 5.9 coordinate-space PNG evidence."""

from __future__ import annotations

from dataclasses import dataclass
import math
from pathlib import Path
import sys

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "output"
FRAMES = OUTPUT / "RectangleSourceCoordinateSpaceFrames"
REPORT = OUTPUT / "RectangleSourceCoordinateSpaceReport.txt"


@dataclass(frozen=True)
class Case:
    case_id: str
    size: tuple[float, float]
    rectangle_position: tuple[float, float]
    anchor: tuple[float, float] = (0.0, 0.0)
    layer_position: tuple[float, float] = (960.0, 540.0)

    @property
    def center(self) -> tuple[int, int]:
        return (
            round(
                self.layer_position[0]
                + self.rectangle_position[0]
                - self.anchor[0]
            ),
            round(
                self.layer_position[1]
                + self.rectangle_position[1]
                - self.anchor[1]
            ),
        )

    @property
    def left_probe(self) -> tuple[int, int]:
        local_left = self.rectangle_position[0] - self.size[0] * 0.5
        return (
            round(
                self.layer_position[0]
                + local_left
                + self.size[0] * 0.05
                - self.anchor[0]
            ),
            self.center[1],
        )

    @property
    def expected_source_bbox(self) -> tuple[int, int, int, int]:
        trim_x = self.size[0] * 0.1
        trim_y = self.size[1] * 0.1
        local_left = (
            self.rectangle_position[0]
            - self.size[0] * 0.5
            + trim_x
        )
        local_top = (
            self.rectangle_position[1]
            - self.size[1] * 0.5
            + trim_y
        )
        local_right = (
            self.rectangle_position[0]
            + self.size[0] * 0.5
            - trim_x
        )
        local_bottom = (
            self.rectangle_position[1]
            + self.size[1] * 0.5
            - trim_y
        )
        return (
            math.ceil(
                self.layer_position[0]
                + local_left
                - self.anchor[0]
            ),
            math.ceil(
                self.layer_position[1]
                + local_top
                - self.anchor[1]
            ),
            math.ceil(
                self.layer_position[0]
                + local_right
                - self.anchor[0]
            ),
            math.ceil(
                self.layer_position[1]
                + local_bottom
                - self.anchor[1]
            ),
        )


CASES = (
    Case("A", (500, 500), (0, 0)),
    Case("B", (500, 500), (200, 100)),
    Case("C", (500, 500), (-200, -100)),
    Case("D", (1920, 1080), (0, 0)),
    Case("E", (501.5, 499.25), (10.25, -20.75)),
    Case("F", (500, 500), (0, 0)),
    Case("G", (500, 500), (0, 0), anchor=(100, 50)),
    Case("H", (500, 500), (0, 0), layer_position=(1200, 700)),
)


def rgba_at(image: Image.Image, point: tuple[int, int]) -> tuple[int, ...]:
    if not (0 <= point[0] < image.width and 0 <= point[1] < image.height):
        raise ValueError(
            f"Point {point} outside {image.width}x{image.height}"
        )
    return image.getpixel(point)


def visible(pixel: tuple[int, ...]) -> bool:
    red, green, blue, alpha = pixel
    return alpha >= 128 and max(red, green, blue) >= 128


def analyze_case(case: Case) -> tuple[list[str], bool]:
    layer_path = FRAMES / f"{case.case_id}_LayerBounds.png"
    source_path = FRAMES / f"{case.case_id}_RectangleSource.png"
    fallback_path = FRAMES / f"{case.case_id}_Fallback.png"

    for path in (layer_path, source_path, fallback_path):
        if not path.is_file():
            return [f"{case.case_id}: missing {path}"], False

    with (
        Image.open(layer_path).convert("RGBA") as layer_image,
        Image.open(source_path).convert("RGBA") as source_image,
        Image.open(fallback_path).convert("RGBA") as fallback_image,
    ):
        center_layer = rgba_at(layer_image, case.center)
        center_source = rgba_at(source_image, case.center)
        center_fallback = rgba_at(fallback_image, case.center)
        left_layer = rgba_at(layer_image, case.left_probe)
        left_source = rgba_at(source_image, case.left_probe)
        left_fallback = rgba_at(fallback_image, case.left_probe)
        layer_bbox = layer_image.getchannel("A").getbbox()
        source_bbox = source_image.getchannel("A").getbbox()
        fallback_bbox = fallback_image.getchannel("A").getbbox()

        fallback_diff = ImageChops.difference(
            layer_image, fallback_image
        ).getbbox()

    center_passed = (
        visible(center_layer)
        and visible(center_source)
        and visible(center_fallback)
    )

    if case.case_id == "D":
        left_passed = (
            visible(left_source) == visible(left_layer)
            and visible(left_fallback) == visible(left_layer)
        )
    else:
        left_passed = (
            visible(left_layer)
            and not visible(left_source)
            and visible(left_fallback)
        )

    fallback_passed = fallback_diff is None
    source_bbox_passed = source_bbox == case.expected_source_bbox
    passed = (
        center_passed
        and left_passed
        and source_bbox_passed
        and fallback_passed
    )

    lines = [
        (
            f"{case.case_id}: alphaBBoxes layer={layer_bbox} "
            f"source={source_bbox} fallback={fallback_bbox} "
            f"expectedSource={case.expected_source_bbox}"
        ),
        (
            f"{case.case_id}: center={case.center} "
            f"layer={center_layer} source={center_source} "
            f"fallback={center_fallback}"
        ),
        (
            f"{case.case_id}: leftProbe={case.left_probe} "
            f"layer={left_layer} source={left_source} "
            f"fallback={left_fallback}"
        ),
        (
            f"{case.case_id}: fallbackMatchesLayerBounds="
            f"{fallback_passed}, {'PASS' if passed else 'FAIL'}"
        ),
    ]
    return lines, passed


def main() -> int:
    if not REPORT.is_file():
        print(f"Missing report: {REPORT}", file=sys.stderr)
        return 1

    report_text = REPORT.read_text(encoding="utf-8-sig")
    script_passed = "SCRIPT RESULT: PASS" in report_text
    lines = [
        "",
        "External RGBA coordinate-space analysis",
        f"Pillow version: {Image.__version__}",
    ]
    all_cases_passed = True

    for case in CASES:
        case_lines, passed = analyze_case(case)
        lines.extend(case_lines)
        all_cases_passed = all_cases_passed and passed

    overall_passed = script_passed and all_cases_passed
    lines.append(
        "COORDINATE-SPACE RESULT: "
        + ("PASS" if overall_passed else "FAIL")
    )

    with REPORT.open("a", encoding="utf-8") as report_file:
        report_file.write("\n".join(lines))
        report_file.write("\n")

    print("\n".join(lines))
    return 0 if overall_passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
