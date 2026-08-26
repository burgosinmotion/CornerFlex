"""Read-only oracle for Phase 5.14A nested 2D transform composition.

The convention matches CornerFlex: point' = (a*x + c*y + tx,
b*x + d*y + ty), and ComposeAffineTransform2D(parent, child) applies the
child first and the parent second.  This file does not access After Effects
or project files.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import cos, radians, sin, isfinite


@dataclass(frozen=True)
class Vec:
    x: float
    y: float


@dataclass(frozen=True)
class Affine:
    a: float = 1.0
    b: float = 0.0
    c: float = 0.0
    d: float = 1.0
    tx: float = 0.0
    ty: float = 0.0


def compose(parent: Affine, child: Affine) -> Affine:
    return Affine(
        parent.a * child.a + parent.c * child.b,
        parent.b * child.a + parent.d * child.b,
        parent.a * child.c + parent.c * child.d,
        parent.b * child.c + parent.d * child.d,
        parent.a * child.tx + parent.c * child.ty + parent.tx,
        parent.b * child.tx + parent.d * child.ty + parent.ty,
    )


def apply(transform: Affine, point: Vec) -> Vec:
    return Vec(
        transform.a * point.x + transform.c * point.y + transform.tx,
        transform.b * point.x + transform.d * point.y + transform.ty,
    )


def group(anchor: Vec, position: Vec, scale: Vec, rotation: float) -> Affine:
    angle = radians(rotation)
    c = cos(angle)
    s = sin(angle)
    linear = Affine(c * scale.x, s * scale.x, -s * scale.y, c * scale.y)
    return Affine(
        linear.a,
        linear.b,
        linear.c,
        linear.d,
        position.x - linear.a * anchor.x - linear.c * anchor.y,
        position.y - linear.b * anchor.x - linear.d * anchor.y,
    )


def matrix_is_finite(transform: Affine) -> bool:
    return all(isfinite(value) for value in transform.__dict__.values())


def evaluate(name: str, inner: Affine, outer: Affine, valid=True) -> str:
    composed = compose(outer, inner)
    result = "PASS" if valid and matrix_is_finite(composed) else "FALLBACK"
    sample = apply(composed, Vec(10.0, 20.0))
    return f"{name}: {result}; matrix={composed}; sample=({sample.x:.6f},{sample.y:.6f})"


def main() -> None:
    identity = Affine()
    print(evaluate("A Inner Position", group(Vec(0, 0), Vec(40, -20), Vec(1, 1), 0), identity))
    print(evaluate("B Outer Position", identity, group(Vec(0, 0), Vec(-30, 50), Vec(1, 1), 0)))
    print(evaluate("C Inner + Outer Position", group(Vec(0, 0), Vec(40, -20), Vec(1, 1), 0), group(Vec(0, 0), Vec(-30, 50), Vec(1, 1), 0)))
    print(evaluate("D Inner Rotation", group(Vec(5, 7), Vec(40, -20), Vec(1, 1), 25), identity))
    print(evaluate("E Outer Rotation", identity, group(Vec(-3, 4), Vec(-30, 50), Vec(1, 1), -35)))
    print(evaluate("F Inner + Outer Rotation", group(Vec(5, 7), Vec(40, -20), Vec(1, 1), 25), group(Vec(-3, 4), Vec(-30, 50), Vec(1, 1), -35)))
    print(evaluate("G Inner non-uniform Scale + Outer Rotation", group(Vec(0, 0), Vec(40, -20), Vec(1.4, .7), 0), group(Vec(0, 0), Vec(-30, 50), Vec(1, 1), 30)))
    print(evaluate("H Inner Rotation + Outer non-uniform Scale", group(Vec(0, 0), Vec(40, -20), Vec(1, 1), 25), group(Vec(0, 0), Vec(-30, 50), Vec(1.5, .75), 0)))
    print(evaluate("I Distinct Anchors", group(Vec(12, -8), Vec(40, -20), Vec(1, 1), 25), group(Vec(-20, 15), Vec(-30, 50), Vec(1.2, .8), -35)))
    print(evaluate("J Negative Scale", identity, group(Vec(0, 0), Vec(0, 0), Vec(-1, 1), 0), valid=False))
    print(evaluate("K Zero Scale", identity, group(Vec(0, 0), Vec(0, 0), Vec(0, 1), 0), valid=False))
    print("L Depth 3: FALLBACK; policy rejects depth > 2 before activation")


if __name__ == "__main__":
    main()
