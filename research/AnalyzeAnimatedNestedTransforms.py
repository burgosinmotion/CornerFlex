"""Independent geometry oracle for Phase 5.15A.

Expected values are generated from declared transforms, never from observed
PNG bounds. PNG alpha comparison is deferred until manual AE execution.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import cos, radians, sin
from pathlib import Path

TIMES = (0.0, 0.5, 1.0)
ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "output" / "Phase515AAnimatedNestedTransforms"
REPORT = OUTPUT / "Phase515AAnimatedNestedTransformsIndependentAnalysis.txt"


@dataclass(frozen=True)
class M:
    a: float = 1.0
    b: float = 0.0
    c: float = 0.0
    d: float = 1.0
    tx: float = 0.0
    ty: float = 0.0


def lerp(first, last, t):
    return tuple(a + (b - a) * t for a, b in zip(first, last))


def mul(parent: M, child: M) -> M:
    return M(parent.a * child.a + parent.c * child.b, parent.b * child.a + parent.d * child.b,
             parent.a * child.c + parent.c * child.d, parent.b * child.c + parent.d * child.d,
             parent.a * child.tx + parent.c * child.ty + parent.tx,
             parent.b * child.tx + parent.d * child.ty + parent.ty)


def group(position, scale, rotation, anchor=(0.0, 0.0)) -> M:
    angle = radians(rotation); co, si = cos(angle), sin(angle)
    a, b, c, d = co * scale[0], si * scale[0], -si * scale[1], co * scale[1]
    return M(a, b, c, d, position[0] - a * anchor[0] - c * anchor[1], position[1] - b * anchor[0] - d * anchor[1])


def values(case, t):
    identity = ((0.0, 0.0), (100.0, 100.0), 0.0, (0.0, 0.0))
    layer = ((960.0, 540.0), (100.0, 100.0), 0.0, (0.0, 0.0))
    if case == "A": return (lerp((0, 0), (160, 20), t), (100, 100), 0, (0, 0)), identity, layer
    if case == "B": return identity, (lerp((0, 0), (-160, 20), t), (100, 100), 0, (0, 0)), layer
    if case == "C": return ((0, 0), (100, 100), 50 * t, (0, 0)), identity, layer
    if case == "D": return identity, ((0, 0), (100, 100), -40 * t, (0, 0)), layer
    if case == "E": return ((0, 0), lerp((100, 100), (150, 70), t), 0, (0, 0)), identity, layer
    if case == "F": return identity, ((0, 0), lerp((100, 100), (80, 140), t), 0, (0, 0)), layer
    if case == "G": return ((0, 0), (100, 100), 0, lerp((0, 0), (80, 40), t)), identity, layer
    if case == "H": return identity, ((0, 0), (100, 100), 0, lerp((0, 0), (-60, 50), t)), layer
    if case == "I": return (lerp((0, 0), (120, 0), t), (100, 100), 30 * t, (0, 0)), (lerp((0, 0), (-80, 40), t), (100, 100), -20 * t, (0, 0)), layer
    if case == "J": return (lerp((0, 0), (80, 0), t), lerp((100, 100), (140, 80), t), 0, (0, 0)), ((0, 0), (100, 100), 40 * t, (0, 0)), (lerp((960, 540), (1120, 460), t), lerp((100, 100), (120, 90), t), 20 * t, (960, 540))
    if case == "K": return ((60 * t, -30 * t), (100, 100), 0, (0, 0)), identity, layer
    return ((50 * t, 0), (100, 100), 0, (0, 0)), ((0, -40 * t), (100, 100), 0, (0, 0)), layer


def aabb(matrix: M):
    corners = [(-250, -150), (250, -150), (250, 150), (-250, 150)]
    points = [(matrix.a * x + matrix.c * y + matrix.tx, matrix.b * x + matrix.d * y + matrix.ty) for x, y in corners]
    xs, ys = zip(*points)
    return min(xs), min(ys), max(xs), max(ys)


def main() -> None:
    lines = ["PHASE 5.15A INDEPENDENT ORACLE", "EXPECTED_SOURCE=RECTANGLE_SOURCE", "TRIM=0", "PIXEL_CENTER_CONVENTION=x+0.5,y+0.5", "ANALYSIS_MODE=EXPECTED_GEOMETRY_ONLY"]
    for case in "ABCDEFGHIJKL":
        boxes = []
        for time in TIMES:
            inner, outer, layer = values(case, time)
            matrix = mul(group(layer[0], tuple(v / 100 for v in layer[1]), layer[2], layer[3]), mul(group(outer[0], tuple(v / 100 for v in outer[1]), outer[2], outer[3]), group(inner[0], tuple(v / 100 for v in inner[1]), inner[2], inner[3])))
            boxes.append(aabb(matrix))
            lines.append(f"CASE_{case}_TIME={time}_EXPECTED_AABB={boxes[-1]}")
        lines.append(f"CASE_{case}_FRAME_DIFFERENCE={'EXPECTED' if len(set(boxes)) > 1 else 'UNVERIFIED_OR_EXPECTED_STATIC'}")
    lines.append("PNG_ALPHA_COMPARISON=RUN_AFTER_MANUAL_EXECUTION")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(REPORT)


if __name__ == "__main__":
    main()
