"""Analyze CornerFlex Phase 5.10 defensive and render-time PNG evidence."""

from __future__ import annotations

from pathlib import Path
import sys

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "output"
FRAMES = OUTPUT / "RectangleLayerTranslationDefensiveFrames"
REPORT = OUTPUT / "RectangleLayerTranslationDefensiveReport.txt"
DEFENSIVE_CASES = ("K", "L", "N", "O")


def compare_identical(
    first_path: Path,
    second_path: Path,
) -> tuple[bool, tuple[int, int, int, int] | None]:
    with (
        Image.open(first_path).convert("RGBA") as first,
        Image.open(second_path).convert("RGBA") as second,
    ):
        difference_bbox = ImageChops.difference(first, second).getbbox()
    return difference_bbox is None, difference_bbox


def alpha_bbox(path: Path) -> tuple[int, int, int, int] | None:
    with Image.open(path).convert("RGBA") as image:
        return image.getchannel("A").getbbox()


def analyze_defensive_case(case_id: str) -> tuple[list[str], bool]:
    layer = FRAMES / f"{case_id}_LayerBounds.png"
    source = FRAMES / f"{case_id}_RectangleSource.png"
    fallback = FRAMES / f"{case_id}_Fallback.png"

    for path in (layer, source, fallback):
        if not path.is_file():
            return [f"{case_id}: missing {path}"], False

    source_matches, source_difference = compare_identical(layer, source)
    fallback_matches, fallback_difference = compare_identical(layer, fallback)
    passed = source_matches and fallback_matches
    lines = [
        (
            f"{case_id}: alphaBBoxes layer={alpha_bbox(layer)}, "
            f"source={alpha_bbox(source)}, fallback={alpha_bbox(fallback)}"
        ),
        (
            f"{case_id}: sourceVsLayerDifference={source_difference}, "
            f"fallbackVsLayerDifference={fallback_difference}, "
            f"{'PASS' if passed else 'FAIL'}"
        ),
    ]
    return lines, passed


def analyze_null_observation() -> list[str]:
    layer = FRAMES / "M_LayerBounds.png"
    source = FRAMES / "M_RectangleSource.png"
    fallback = FRAMES / "M_Fallback.png"

    for path in (layer, source, fallback):
        if not path.is_file():
            return [f"M: missing {path}"]

    source_matches, source_difference = compare_identical(layer, source)
    fallback_matches, fallback_difference = compare_identical(layer, fallback)
    return [
        (
            f"M: alphaBBoxes layer={alpha_bbox(layer)}, "
            f"source={alpha_bbox(source)}, fallback={alpha_bbox(fallback)}"
        ),
        (
            f"M: sourceVsLayerDifference={source_difference}, "
            f"fallbackVsLayerDifference={fallback_difference}, "
            f"framesIdentical={source_matches and fallback_matches}"
        ),
        (
            "M: INCONCLUSIVE — an AE Null Layer has a valid layer handle and "
            "transparent raster; a null AEGP_LayerH cannot be produced through "
            "the DOM while an effect instance is rendering."
        ),
    ]


def analyze_time_test() -> tuple[list[str], bool]:
    paths = {
        "t0_layer": FRAMES / "T0_LayerBounds.png",
        "t0_source": FRAMES / "T0_RectangleSource.png",
        "t1_layer": FRAMES / "T1_LayerBounds.png",
        "t1_source": FRAMES / "T1_RectangleSource.png",
        "t1_fallback": FRAMES / "T1_Fallback.png",
    }

    for path in paths.values():
        if not path.is_file():
            return [f"T: missing {path}"], False

    expected_t0 = (760, 340, 1160, 740)
    expected_t1 = (880, 400, 1280, 800)
    observed_t0 = alpha_bbox(paths["t0_source"])
    observed_t1 = alpha_bbox(paths["t1_source"])
    fallback_matches, fallback_difference = compare_identical(
        paths["t1_layer"],
        paths["t1_fallback"],
    )
    passed = (
        observed_t0 == expected_t0
        and observed_t1 == expected_t1
        and fallback_matches
    )
    lines = [
        (
            f"T: sourceBBoxes T0={observed_t0}, T1={observed_t1}, "
            f"expectedT0={expected_t0}, expectedT1={expected_t1}"
        ),
        (
            f"T: bboxDeltaObserved="
            f"{None if observed_t0 is None or observed_t1 is None else (observed_t1[0] - observed_t0[0], observed_t1[1] - observed_t0[1], observed_t1[2] - observed_t0[2], observed_t1[3] - observed_t0[3])}, "
            f"expectedDelta=(120, 60, 120, 60)"
        ),
        (
            f"T: fallbackVsLayerDifference={fallback_difference}, "
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
        "External RGBA defensive and render-time analysis",
        f"Pillow version: {Image.__version__}",
    ]
    defensive_passed = True

    for case_id in DEFENSIVE_CASES:
        case_lines, passed = analyze_defensive_case(case_id)
        lines.extend(case_lines)
        defensive_passed = defensive_passed and passed

    lines.extend(analyze_null_observation())
    time_lines, time_passed = analyze_time_test()
    lines.extend(time_lines)
    overall_passed = script_passed and defensive_passed and time_passed
    lines.extend(
        [
            "DEFENSIVE K,L,N,O RESULT: "
            + ("PASS" if defensive_passed else "FAIL"),
            "DEFENSIVE M RESULT: INCONCLUSIVE (host limitation documented)",
            "POST-EXPRESSION TIME RESULT: "
            + ("PASS" if time_passed else "FAIL"),
            "FINAL DEFENSIVE RESULT: "
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
