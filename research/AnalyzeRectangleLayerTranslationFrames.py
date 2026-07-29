"""Analyze CornerFlex Phase 5.10 layer-translation PNG evidence."""

from __future__ import annotations

from dataclasses import dataclass
import math
from pathlib import Path
import sys

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "output"
FRAMES = OUTPUT / "RectangleLayerTranslationFrames"
REPORT = OUTPUT / "RectangleLayerTranslationReport.txt"


@dataclass(frozen=True)
class Case:
    case_id: str
    comp: tuple[int, int]
    size: tuple[float, float]
    rectangle_position: tuple[float, float]
    anchor: tuple[float, float]
    position_offset: tuple[float, float]

    @property
    def layer_position(self) -> tuple[float, float]:
        return (
            self.comp[0] * 0.5 + self.position_offset[0],
            self.comp[1] * 0.5 + self.position_offset[1],
        )

    @property
    def translation(self) -> tuple[float, float]:
        return (
            self.layer_position[0] - self.comp[0] * 0.5 - self.anchor[0],
            self.layer_position[1] - self.comp[1] * 0.5 - self.anchor[1],
        )

    @property
    def geometry_bounds(self) -> tuple[float, float, float, float]:
        center_x = (
            self.comp[0] * 0.5
            + self.rectangle_position[0]
            + self.translation[0]
        )
        center_y = (
            self.comp[1] * 0.5
            + self.rectangle_position[1]
            + self.translation[1]
        )
        return (
            center_x - self.size[0] * 0.5,
            center_y - self.size[1] * 0.5,
            center_x + self.size[0] * 0.5,
            center_y + self.size[1] * 0.5,
        )

    @property
    def expected_source_bbox(self) -> tuple[int, int, int, int]:
        left, top, right, bottom = self.geometry_bounds
        trim_x = self.size[0] * 0.1
        trim_y = self.size[1] * 0.1
        unclamped = (
            math.ceil(left + trim_x),
            math.ceil(top + trim_y),
            math.ceil(right - trim_x),
            math.ceil(bottom - trim_y),
        )
        return (
            max(0, min(self.comp[0], unclamped[0])),
            max(0, min(self.comp[1], unclamped[1])),
            max(0, min(self.comp[0], unclamped[2])),
            max(0, min(self.comp[1], unclamped[3])),
        )


CASES = (
    Case("A", (1920, 1080), (500, 500), (0, 0), (0, 0), (0, 0)),
    Case("B", (1920, 1080), (500, 500), (0, 0), (100, 50), (0, 0)),
    Case("C", (1920, 1080), (500, 500), (0, 0), (-100, -50), (0, 0)),
    Case("D", (1920, 1080), (500, 500), (0, 0), (0, 0), (200, 100)),
    Case("E", (1920, 1080), (500, 500), (0, 0), (0, 0), (-200, -100)),
    Case("F", (1920, 1080), (500, 500), (0, 0), (100, 50), (200, 100)),
    Case("G", (1920, 1080), (500, 500), (0, 0), (0, 0), (0, 0)),
    Case("H", (1920, 1080), (500, 500), (0, 0), (0, 0), (240, 160)),
    Case("I", (1280, 720), (420, 260), (0, 0), (20, 10), (100, -50)),
    Case("J", (1920, 1080), (500, 360), (175, -85), (60, -35), (140, 90)),
    Case("RA", (1920, 1080), (500, 500), (0, 0), (0, 0), (0, 0)),
    Case("RB", (1920, 1080), (500, 500), (200, 100), (0, 0), (0, 0)),
    Case("RC", (1920, 1080), (500, 500), (-200, -100), (0, 0), (0, 0)),
    Case("RD", (1920, 1080), (1920, 1080), (0, 0), (0, 0), (0, 0)),
    Case(
        "RE",
        (1920, 1080),
        (501.5, 499.25),
        (10.25, -20.75),
        (0, 0),
        (0, 0),
    ),
    Case("RF", (1920, 1080), (500, 500), (0, 0), (0, 0), (0, 0)),
)


def bbox_difference(
    observed: tuple[int, int, int, int] | None,
    expected: tuple[int, int, int, int],
) -> tuple[int, int, int, int] | None:
    if observed is None:
        return None
    return tuple(
        observed[index] - expected[index]
        for index in range(4)
    )


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
        if (
            layer_image.size != case.comp
            or source_image.size != case.comp
            or fallback_image.size != case.comp
        ):
            return [
                f"{case.case_id}: unexpected frame dimensions "
                f"layer={layer_image.size}, source={source_image.size}, "
                f"fallback={fallback_image.size}"
            ], False

        layer_bbox = layer_image.getchannel("A").getbbox()
        source_bbox = source_image.getchannel("A").getbbox()
        fallback_bbox = fallback_image.getchannel("A").getbbox()
        fallback_difference = ImageChops.difference(
            layer_image,
            fallback_image,
        )
        fallback_difference_bbox = fallback_difference.getbbox()

        source_nonempty = source_bbox is not None
        source_bbox_passed = source_bbox == case.expected_source_bbox
        fallback_passed = fallback_difference_bbox is None
        passed = source_nonempty and source_bbox_passed and fallback_passed

    lines = [
        (
            f"{case.case_id}: comp={case.comp}, input={case.comp}, "
            f"size={case.size}, rectPosition={case.rectangle_position}, "
            f"anchor={case.anchor}, layerPosition={case.layer_position}"
        ),
        (
            f"{case.case_id}: translation={case.translation}, "
            f"geometryBounds={case.geometry_bounds}"
        ),
        (
            f"{case.case_id}: alphaBBoxes layer={layer_bbox}, "
            f"source={source_bbox}, fallback={fallback_bbox}, "
            f"expectedSource={case.expected_source_bbox}"
        ),
        (
            f"{case.case_id}: bboxDifference="
            f"{bbox_difference(source_bbox, case.expected_source_bbox)}, "
            f"fallbackPixelDifference={fallback_difference_bbox}, "
            f"{'PASS' if passed else 'FAIL'}"
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
        "External RGBA layer-translation analysis",
        f"Pillow version: {Image.__version__}",
    ]
    all_cases_passed = True
    case_results: dict[str, bool] = {}

    for case in CASES:
        case_lines, passed = analyze_case(case)
        lines.extend(case_lines)
        case_results[case.case_id] = passed
        all_cases_passed = all_cases_passed and passed

    translation_passed = all(
        case_results.get(case_id, False)
        for case_id in "ABCDEFGHIJ"
    )
    regression_passed = all(
        case_results.get(case_id, False)
        for case_id in ("RA", "RB", "RC", "RD", "RE", "RF")
    )
    overall_passed = (
        script_passed
        and translation_passed
        and regression_passed
    )

    lines.extend(
        [
            "TRANSLATION A-J RESULT: "
            + ("PASS" if translation_passed else "FAIL"),
            "PHASE 5.9 A-F REGRESSION RESULT: "
            + ("PASS" if regression_passed else "FAIL"),
            "LAYER TRANSLATION RESULT: "
            + ("PASS" if overall_passed else "FAIL"),
        ]
    )

    with REPORT.open("a", encoding="utf-8") as report_file:
        report_file.write("\n".join(lines))
        report_file.write("\n")

    print("\n".join(lines))
    return 0 if overall_passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
