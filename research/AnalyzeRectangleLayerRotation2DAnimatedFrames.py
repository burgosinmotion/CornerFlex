"""Analyze Phase 5.12D animated/expression Layer Rotation 2D validation frames."""

from __future__ import annotations

from dataclasses import dataclass
from math import ceil, cos, floor, radians, sin
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "output"
FRAMES = OUTPUT / "Phase512DValidationFrames"
REPORT = OUTPUT / "Phase512DValidationReport.txt"
COMP = (1920.0, 1080.0)


@dataclass(frozen=True)
class Case:
    name: str
    times: tuple[float, ...]
    rotations: tuple[float, ...]
    scales: tuple[tuple[float, float], ...]
    trim: tuple[float, float, float, float] = (10.0, 10.0, 10.0, 10.0)
    size: tuple[float, float] = (400.0, 200.0)
    rect_position: tuple[float, float] = (0.0, 0.0)
    anchor: tuple[float, float] = (0.0, 0.0)
    position_offset: tuple[float, float] = (0.0, 0.0)
    fallback: bool = False
    return_only: bool = False


def interp(v0: float, v1: float, t: float) -> float:
    return v0 + ((v1 - v0) * t)


def scale_interp(s0: tuple[float, float], s1: tuple[float, float], t: float) -> tuple[float, float]:
    return (interp(s0[0], s1[0], t), interp(s0[1], s1[1], t))


def make_cases() -> dict[str, Case]:
    cases: dict[str, Case] = {}
    cases["A"] = Case("Animated Rotation 0 to 90", (0, 0.5, 1), (0, 45, 90), ((100, 100),) * 3)
    cases["B"] = Case("Animated Negative Rotation", (0, 0.5, 1), (0, -22.5, -45), ((100, 100),) * 3)
    times_c = (0, 0.25, 0.5, 0.75, 1)
    cases["C"] = Case("Animated Rotation 0 to 180", times_c, tuple(180 * t for t in times_c), ((100, 100),) * 5)
    cases["D"] = Case("Animated Rotation 0 to 360", times_c, tuple(360 * t for t in times_c), ((100, 100),) * 5)
    cases["E"] = Case("Expression Rotation time * 90", (0, 0.5, 1), (0, 45, 90), ((100, 100),) * 3)
    cases["F"] = Case("Expression Negative Rotation -time * 90", (0, 0.5, 1), (0, -45, -90), ((100, 100),) * 3)
    cases["G"] = Case("Animated Rotation plus Animated Scale", (0, 0.5, 1), (0, 22.5, 45), tuple(scale_interp((100, 100), (150, 150), t) for t in (0, 0.5, 1)))
    cases["H"] = Case("Animated Rotation plus Animated Non-uniform Scale", (0, 0.5, 1), (0, 22.5, 45), tuple(scale_interp((100, 100), (150, 75), t) for t in (0, 0.5, 1)))
    cases["I"] = Case("Animated Rotation plus Anchor", (0, 0.5, 1), (0, 22.5, 45), ((100, 100),) * 3, anchor=(100, 50))
    cases["J"] = Case("Animated Rotation plus Layer Position", (0, 0.5, 1), (0, 22.5, 45), ((100, 100),) * 3, position_offset=(240, 160))
    cases["K"] = Case("Animated Rotation plus Rectangle Position", (0, 0.5, 1), (0, 22.5, 45), ((100, 100),) * 3, rect_position=(200, 100))
    cases["L"] = Case("Animated Full Combination", (0, 0.5, 1), (0, 22.5, 45), tuple(scale_interp((100, 100), (150, 75), t) for t in (0, 0.5, 1)), anchor=(100, 50), position_offset=(240, 160), rect_position=(200, 100))
    cases["M"] = Case("Animated Rotation plus Trim 10", (0, 0.5, 1), (0, 22.5, 45), ((100, 100),) * 3)
    cases["N"] = Case("Animated Rotation plus Trim Left only", (0, 0.5, 1), (0, 22.5, 45), ((100, 100),) * 3, trim=(10, 0, 0, 0))
    cases["O"] = Case("Animated Rotation plus Non-uniform Trim", (0, 0.5, 1), (0, 22.5, 45), ((100, 100),) * 3, trim=(5, 15, 20, 10))
    cases["P"] = Case("Animated Rotation plus Parent fallback", (1,), (45,), ((100, 100),), fallback=True)
    cases["Q"] = Case("Animated Rotation plus 3D fallback", (1,), (45,), ((100, 100),), fallback=True)
    cases["R"] = Case("Animated Rotation plus Scale Zero fallback", (1,), (45,), ((0, 100),), fallback=True)
    cases["S"] = Case("Animated Rotation plus Negative Scale fallback", (1,), (45,), ((-100, 100),), fallback=True)
    cases["T"] = Case("Equivalence 0 to 360", (0, 1), (0, 360), ((100, 100),) * 2)
    cases["U"] = Case("Equivalence -360", (1,), (-360,), ((100, 100),))
    cases["V"] = Case("Equivalence 720", (1,), (720,), ((100, 100),))
    cases["RS1"] = Case("Static regression Rotation 15", (1,), (15,), ((100, 100),))
    cases["RS2"] = Case("Static regression Rotation 45", (1,), (45,), ((100, 100),))
    cases["RS3"] = Case("Static regression Rotation -45", (1,), (-45,), ((100, 100),))
    cases["RS4"] = Case("Static regression Rotation plus Scale", (1,), (30,), ((150, 150),))
    cases["RS5"] = Case("Static regression Return to Layer Bounds", (1,), (30,), ((100, 100),), return_only=True)
    cases["RS6"] = Case("Static regression Scale animated", (1,), (0,), ((150, 150),))
    cases["RS7"] = Case("Static regression Scale expression", (1,), (0,), ((150, 150),))
    return cases


CASES = make_cases()


def label(time: float) -> str:
    return "T" + str(time).replace(".", "p")


def alpha_bbox(path: Path):
    with Image.open(path).convert("RGBA") as image:
        return image.getchannel("A").getbbox()


def rgba_difference(first: Path, second: Path):
    with Image.open(first).convert("RGBA") as first_image, Image.open(second).convert("RGBA") as second_image:
        return ImageChops.difference(first_image, second_image).getbbox()


def pixel_alpha(path: Path, point: tuple[int, int]) -> int:
    with Image.open(path).convert("RGBA") as image:
        x = max(0, min(image.width - 1, point[0]))
        y = max(0, min(image.height - 1, point[1]))
        return image.getpixel((x, y))[3]


def local_trimmed_bounds(case: Case) -> tuple[float, float, float, float]:
    half_w = case.size[0] * 0.5
    half_h = case.size[1] * 0.5
    left = case.rect_position[0] - half_w
    top = case.rect_position[1] - half_h
    right = case.rect_position[0] + half_w
    bottom = case.rect_position[1] + half_h
    width = right - left
    height = bottom - top
    trim_left, trim_top, trim_right, trim_bottom = case.trim
    return (
        left + (width * trim_left / 100.0),
        top + (height * trim_top / 100.0),
        right - (width * trim_right / 100.0),
        bottom - (height * trim_bottom / 100.0),
    )


def transform_point(case: Case, rotation: float, scale: tuple[float, float], point: tuple[float, float]) -> tuple[float, float]:
    sx = scale[0] / 100.0
    sy = scale[1] / 100.0
    angle = radians(rotation)
    c = cos(angle)
    s = sin(angle)
    a = c * sx
    b = s * sx
    cc = -s * sy
    d = c * sy
    position = (COMP[0] * 0.5 + case.position_offset[0], COMP[1] * 0.5 + case.position_offset[1])
    tx = position[0] - ((a * case.anchor[0]) + (cc * case.anchor[1]))
    ty = position[1] - ((b * case.anchor[0]) + (d * case.anchor[1]))
    return (a * point[0] + cc * point[1] + tx, b * point[0] + d * point[1] + ty)


def corners(case: Case, rotation: float, scale: tuple[float, float]):
    left, top, right, bottom = local_trimmed_bounds(case)
    return (
        transform_point(case, rotation, scale, (left, top)),
        transform_point(case, rotation, scale, (right, top)),
        transform_point(case, rotation, scale, (right, bottom)),
        transform_point(case, rotation, scale, (left, bottom)),
    )


def expected_bbox(case: Case, rotation: float, scale: tuple[float, float]) -> tuple[int, int, int, int]:
    points = corners(case, rotation, scale)
    return (
        floor(min(point[0] for point in points)),
        floor(min(point[1] for point in points)),
        ceil(max(point[0] for point in points)),
        ceil(max(point[1] for point in points)),
    )


def expected_center(case: Case, rotation: float, scale: tuple[float, float]) -> tuple[int, int]:
    left, top, right, bottom = local_trimmed_bounds(case)
    return tuple(round(value) for value in transform_point(case, rotation, scale, ((left + right) * 0.5, (top + bottom) * 0.5)))


def expected_inside(case: Case, rotation: float, scale: tuple[float, float]) -> tuple[int, int]:
    left, top, right, bottom = local_trimmed_bounds(case)
    return tuple(round(value) for value in transform_point(case, rotation, scale, (left + (right - left) * 0.25, top + (bottom - top) * 0.25)))


def expected_edge(case: Case, rotation: float, scale: tuple[float, float]) -> tuple[int, int]:
    left, top, right, _bottom = local_trimmed_bounds(case)
    return tuple(round(value) for value in transform_point(case, rotation, scale, ((left + right) * 0.5, top)))


def point_inside_case(case: Case, rotation: float, scale: tuple[float, float], x: float, y: float) -> bool:
    left, top, right, bottom = local_trimmed_bounds(case)
    sx = scale[0] / 100.0
    sy = scale[1] / 100.0
    angle = radians(rotation)
    c = cos(angle)
    s = sin(angle)
    axis_x = (c, s)
    axis_y = (-s, c)
    center = transform_point(case, rotation, scale, ((left + right) * 0.5, (top + bottom) * 0.5))
    half_w = abs((right - left) * sx) * 0.5
    half_h = abs((bottom - top) * sy) * 0.5
    dx = x - center[0]
    dy = y - center[1]
    local_x = dx * axis_x[0] + dy * axis_x[1]
    local_y = dx * axis_y[0] + dy * axis_y[1]
    return abs(local_x) <= half_w + 1.0e-6 and abs(local_y) <= half_h + 1.0e-6


def outside_inside_aabb_sample(case: Case, rotation: float, scale: tuple[float, float]) -> tuple[tuple[int, int], bool]:
    bbox = expected_bbox(case, rotation, scale)
    candidates = (
        (bbox[0] + 2, bbox[1] + 2),
        (bbox[2] - 3, bbox[1] + 2),
        (bbox[2] - 3, bbox[3] - 3),
        (bbox[0] + 2, bbox[3] - 3),
    )
    for candidate in candidates:
        if not point_inside_case(case, rotation, scale, candidate[0] + 0.5, candidate[1] + 0.5):
            return candidate, True
    return candidates[0], False


def analyze_frame(case_id: str, case: Case, index: int):
    time = case.times[index]
    rotation = case.rotations[index]
    scale = case.scales[index]
    stem = f"{case_id}_{label(time)}"
    source = FRAMES / f"{stem}_RectangleSource.png"
    layer = FRAMES / f"{stem}_LayerBounds.png"
    fallback = FRAMES / f"{stem}_Fallback.png"
    missing = [str(path) for path in (source, layer, fallback) if not path.is_file()]
    if missing:
        return [f"{stem} {case.name}: FAIL missing {missing}"], False
    source_bbox = alpha_bbox(source)
    layer_bbox = alpha_bbox(layer)
    fallback_bbox = alpha_bbox(fallback)
    fallback_diff = rgba_difference(layer, fallback)
    if case.fallback:
        source_diff = rgba_difference(layer, source)
        passed = source_diff is None and fallback_diff is None and source_bbox == layer_bbox == fallback_bbox
        return [
            f"{stem} {case.name}: {'PASS' if passed else 'FAIL'}",
            "  source=Layer Bounds fallback",
            f"  evaluatedRotation={rotation}; evaluatedScale={scale}",
            f"  alphaBBoxes layer={layer_bbox}, source={source_bbox}, fallback={fallback_bbox}",
            f"  sourceVsLayerDifference={source_diff}; fallbackVsLayerDifference={fallback_diff}",
        ], passed

    expected = expected_bbox(case, rotation, scale)
    center = expected_center(case, rotation, scale)
    inside = expected_inside(case, rotation, scale)
    outside, outside_required = outside_inside_aabb_sample(case, rotation, scale)
    edge = expected_edge(case, rotation, scale)
    center_alpha = pixel_alpha(source, center)
    inside_alpha = pixel_alpha(source, inside)
    outside_alpha = pixel_alpha(source, outside)
    edge_alpha = pixel_alpha(source, edge)
    bbox_pass = all(abs(a - e) <= 1 for a, e in zip(source_bbox, expected))
    sample_pass = center_alpha > 0 and inside_alpha > 0 and (outside_alpha == 0 if outside_required else True)
    if case.return_only:
        source_diff = rgba_difference(layer, source)
        passed = fallback_diff is None
    else:
        source_diff = None
        passed = bbox_pass and sample_pass and fallback_diff is None
    return [
        f"{stem} {case.name}: {'PASS' if passed else 'FAIL'}",
        "  source=Rectangle Source" if not case.return_only else "  source=Layer Bounds after manual return",
        f"  evaluatedRotation={rotation}; evaluatedScale={scale}",
        f"  expectedBBox={expected}",
        f"  alphaBBoxes layer={layer_bbox}, source={source_bbox}, fallback={fallback_bbox}",
        f"  samples center={center}:{center_alpha}, inside={inside}:{inside_alpha}, outsideAABBOnly={outside}:{outside_alpha}, outsideRequired={outside_required}, edge={edge}:{edge_alpha}",
        f"  sourceVsLayerDifference={source_diff}; fallbackVsLayerDifference={fallback_diff}",
    ], passed


def main() -> None:
    lines = ["", "External RGBA Phase 5.12D Animated/Expression Layer Rotation 2D analysis"]
    all_passed = True
    for case_id, case in CASES.items():
        for index, _time in enumerate(case.times):
            frame_lines, passed = analyze_frame(case_id, case, index)
            lines.extend(frame_lines)
            all_passed = all_passed and passed

    equivalences = (
        ("T_0_vs_T_1", FRAMES / "T_T0_RectangleSource.png", FRAMES / "T_T1_RectangleSource.png"),
        ("A_T0_vs_E_T0", FRAMES / "A_T0_RectangleSource.png", FRAMES / "E_T0_RectangleSource.png"),
        ("A_T1_vs_E_T1", FRAMES / "A_T1_RectangleSource.png", FRAMES / "E_T1_RectangleSource.png"),
    )
    for name, first, second in equivalences:
        diff = rgba_difference(first, second)
        passed = diff is None
        lines.append(f"{name} RGBA equivalence: {'PASS' if passed else 'FAIL'} diff={diff}")
        all_passed = all_passed and passed

    lines.append(f"PHASE 5.12D ANIMATED/EXPRESSION LAYER ROTATION 2D RESULT: {'PASS' if all_passed else 'FAIL'}")
    text = "\n".join(lines) + "\n"
    print(text)
    with REPORT.open("a", encoding="utf-8") as report:
        report.write(text)
    raise SystemExit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
