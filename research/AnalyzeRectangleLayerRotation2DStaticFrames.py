"""Analyze Phase 5.12C static Layer Rotation 2D validation frames."""

from __future__ import annotations

from dataclasses import dataclass
from math import ceil, cos, floor, radians, sin
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "output"
FRAMES = OUTPUT / "Phase512CValidationFrames"
REPORT = OUTPUT / "Phase512CValidationReport.txt"
COMP = (1920.0, 1080.0)
SIZE_DEFAULT = (400.0, 200.0)


@dataclass(frozen=True)
class Case:
    name: str
    rotation: float
    trim: tuple[float, float, float, float] = (10.0, 10.0, 10.0, 10.0)
    size: tuple[float, float] = SIZE_DEFAULT
    rect_position: tuple[float, float] = (0.0, 0.0)
    anchor: tuple[float, float] = (0.0, 0.0)
    position_offset: tuple[float, float] = (0.0, 0.0)
    scale: tuple[float, float] = (100.0, 100.0)
    return_only: bool = False


CASES: dict[str, Case] = {
    "A": Case("Rotation 0", 0.0),
    "B": Case("Rotation 15", 15.0),
    "C": Case("Rotation 30", 30.0),
    "D": Case("Rotation 45", 45.0),
    "E": Case("Rotation 90", 90.0),
    "F": Case("Rotation -45", -45.0),
    "G": Case("Rotation 180", 180.0),
    "H": Case("Rotation 360", 360.0),
    "I": Case("Rotation plus Scale 150x150", 30.0, scale=(150.0, 150.0)),
    "J": Case("Rotation plus Scale 150x75", 30.0, scale=(150.0, 75.0)),
    "K": Case("Rotation plus Anchor", 30.0, anchor=(100.0, 50.0)),
    "L": Case("Rotation plus Layer Position", 30.0, position_offset=(240.0, 160.0)),
    "M": Case("Rotation plus Rectangle Position", 30.0, rect_position=(200.0, 100.0)),
    "N": Case(
        "Rotation plus Anchor Position Scale",
        30.0,
        anchor=(100.0, 50.0),
        position_offset=(240.0, 160.0),
        rect_position=(200.0, 100.0),
        scale=(150.0, 75.0),
    ),
    "O": Case("Rotation 30 Trim 0", 30.0, trim=(0.0, 0.0, 0.0, 0.0)),
    "P": Case("Rotation 30 Trim 10", 30.0),
    "Q": Case("Rotation 30 Trim Left only", 30.0, trim=(10.0, 0.0, 0.0, 0.0)),
    "R": Case("Rotation 45 Trim non-uniform", 45.0, trim=(5.0, 15.0, 20.0, 10.0)),
    "RA": Case("Regression Scale 150x150", 0.0, scale=(150.0, 150.0)),
    "RB": Case("Regression Scale 150x75", 0.0, scale=(150.0, 75.0)),
    "RC": Case("Regression Anchor", 0.0, scale=(150.0, 150.0), anchor=(100.0, 50.0)),
    "RD": Case("Regression Layer Position", 0.0, scale=(150.0, 150.0), position_offset=(240.0, 160.0)),
    "RE": Case("Regression Rectangle Position", 0.0, scale=(150.0, 150.0), rect_position=(200.0, 100.0)),
    "RF": Case("Regression Scale animated T1", 0.0, scale=(150.0, 150.0)),
    "RG": Case("Regression Scale expression T1", 0.0, scale=(150.0, 150.0)),
    "RH": Case("Regression Return to Layer Bounds", 0.0, scale=(150.0, 150.0), return_only=True),
}


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


def transform_point(case: Case, point: tuple[float, float]) -> tuple[float, float]:
    sx = case.scale[0] / 100.0
    sy = case.scale[1] / 100.0
    angle = radians(case.rotation)
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


def corners(case: Case) -> tuple[tuple[float, float], ...]:
    left, top, right, bottom = local_trimmed_bounds(case)
    return (
        transform_point(case, (left, top)),
        transform_point(case, (right, top)),
        transform_point(case, (right, bottom)),
        transform_point(case, (left, bottom)),
    )


def expected_bbox(case: Case) -> tuple[int, int, int, int]:
    points = corners(case)
    return (
        floor(min(point[0] for point in points)),
        floor(min(point[1] for point in points)),
        ceil(max(point[0] for point in points)),
        ceil(max(point[1] for point in points)),
    )


def expected_center(case: Case) -> tuple[int, int]:
    left, top, right, bottom = local_trimmed_bounds(case)
    return tuple(round(value) for value in transform_point(case, ((left + right) * 0.5, (top + bottom) * 0.5)))


def expected_inside(case: Case) -> tuple[int, int]:
    left, top, right, bottom = local_trimmed_bounds(case)
    return tuple(round(value) for value in transform_point(case, (left + (right - left) * 0.25, top + (bottom - top) * 0.25)))


def expected_edge(case: Case) -> tuple[int, int]:
    left, top, right, bottom = local_trimmed_bounds(case)
    return tuple(round(value) for value in transform_point(case, ((left + right) * 0.5, top)))


def outside_inside_aabb_sample(case: Case) -> tuple[int, int]:
    bbox = expected_bbox(case)
    candidates = (
        (bbox[0] + 2, bbox[1] + 2),
        (bbox[2] - 3, bbox[1] + 2),
        (bbox[2] - 3, bbox[3] - 3),
        (bbox[0] + 2, bbox[3] - 3),
    )
    for candidate in candidates:
        if not point_inside_case(case, candidate[0] + 0.5, candidate[1] + 0.5):
            return candidate
    return candidates[0]


def has_aabb_only_region(case: Case) -> bool:
    bbox = expected_bbox(case)
    return any(
        not point_inside_case(case, candidate[0] + 0.5, candidate[1] + 0.5)
        for candidate in (
            (bbox[0] + 2, bbox[1] + 2),
            (bbox[2] - 3, bbox[1] + 2),
            (bbox[2] - 3, bbox[3] - 3),
            (bbox[0] + 2, bbox[3] - 3),
        )
    )


def point_inside_case(case: Case, x: float, y: float) -> bool:
    left, top, right, bottom = local_trimmed_bounds(case)
    sx = case.scale[0] / 100.0
    sy = case.scale[1] / 100.0
    angle = radians(case.rotation)
    c = cos(angle)
    s = sin(angle)
    axis_x = (c, s)
    axis_y = (-s, c)
    center = transform_point(case, ((left + right) * 0.5, (top + bottom) * 0.5))
    half_w = ((right - left) * sx) * 0.5
    half_h = ((bottom - top) * sy) * 0.5
    dx = x - center[0]
    dy = y - center[1]
    local_x = dx * axis_x[0] + dy * axis_x[1]
    local_y = dx * axis_y[0] + dy * axis_y[1]
    return abs(local_x) <= half_w + 1.0e-6 and abs(local_y) <= half_h + 1.0e-6


def analyze_case(stem: str, case: Case):
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
    expected = expected_bbox(case)
    center = expected_center(case)
    inside = expected_inside(case)
    outside = outside_inside_aabb_sample(case)
    edge = expected_edge(case)
    center_alpha = pixel_alpha(source, center)
    inside_alpha = pixel_alpha(source, inside)
    outside_alpha = pixel_alpha(source, outside)
    edge_alpha = pixel_alpha(source, edge)

    bbox_tolerance = 1
    bbox_pass = all(abs(a - e) <= bbox_tolerance for a, e in zip(source_bbox, expected))
    return_pass = fallback_diff is None
    outside_required = has_aabb_only_region(case)
    sample_pass = center_alpha > 0 and inside_alpha > 0 and (outside_alpha == 0 if outside_required else True)
    if stem == "RH":
        source_diff = rgba_difference(layer, source)
        passed = return_pass
    else:
        source_diff = None
        passed = bbox_pass and return_pass and sample_pass

    lines = [
        f"{stem} {case.name}: {'PASS' if passed else 'FAIL'}",
        "  source=Rectangle Source" if stem != "RH" else "  source=Layer Bounds after manual return",
        f"  expectedBBox={expected}",
        f"  alphaBBoxes layer={layer_bbox}, source={source_bbox}, fallback={fallback_bbox}",
        f"  samples center={center}:{center_alpha}, inside={inside}:{inside_alpha}, outsideAABBOnly={outside}:{outside_alpha}, outsideRequired={outside_required}, edge={edge}:{edge_alpha}",
        f"  sourceVsLayerDifference={source_diff}; fallbackVsLayerDifference={fallback_diff}",
    ]
    return lines, passed


def main() -> None:
    lines = ["", "External RGBA Phase 5.12C Static Layer Rotation 2D analysis"]
    all_passed = True
    for stem, case in CASES.items():
        case_lines, passed = analyze_case(stem, case)
        lines.extend(case_lines)
        all_passed = all_passed and passed

    rotation_0_bbox = alpha_bbox(FRAMES / "A_RectangleSource.png")
    rotation_360_bbox = alpha_bbox(FRAMES / "H_RectangleSource.png")
    equivalent_360 = all(abs(a - b) <= 1 for a, b in zip(rotation_0_bbox, rotation_360_bbox))
    lines.append(f"Rotation 360 equivalent to 0 bbox tolerance: {'PASS' if equivalent_360 else 'FAIL'}")
    all_passed = all_passed and equivalent_360

    lines.append(f"PHASE 5.12C STATIC LAYER ROTATION 2D RESULT: {'PASS' if all_passed else 'FAIL'}")
    text = "\n".join(lines) + "\n"
    print(text)
    with REPORT.open("a", encoding="utf-8") as report:
        report.write(text)
    raise SystemExit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
