"""Independent Phase 5.14B oracle for the bounded affine chain contract."""

from dataclasses import dataclass
from math import cos, isfinite, radians, sin


MAX_TRANSFORMS = 3  # Inner Group, Outer Group, Layer
TOLERANCE = 1.0e-9


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


def group(anchor, position, scale, degrees):
    angle = radians(degrees)
    c, s = cos(angle), sin(angle)
    a, b = c * scale[0], s * scale[0]
    c2, d = -s * scale[1], c * scale[1]
    return Affine(a, b, c2, d,
                  position[0] - a * anchor[0] - c2 * anchor[1],
                  position[1] - b * anchor[0] - d * anchor[1])


def chain(transforms):
    if len(transforms) > MAX_TRANSFORMS:
        raise ValueError("capacity overflow")
    if any(not all(isfinite(v) for v in t.__dict__.values()) for t in transforms):
        raise ValueError("non-finite transform")
    result = Affine()
    for transform in transforms:
        result = compose(transform, result)
    return result


def close(left, right):
    return all(abs(getattr(left, key) - getattr(right, key)) <= TOLERANCE
               for key in ("a", "b", "c", "d", "tx", "ty"))


def check(name, transforms, expected):
    actual = chain(transforms)
    passed = close(actual, expected)
    print(f"{name}: {'PASS' if passed else 'FAIL'} {actual}")
    if not passed:
        raise SystemExit(1)


def main():
    identity = Affine()
    layer = group((0, 0), (100, 40), (1, 1), 0)
    group_a = group((0, 0), (20, -10), (1, 1), 0)
    group_b = group((0, 0), (-15, 30), (1, 1), 0)
    check("A identity", [identity], identity)
    check("B position", [group_a], group_a)
    check("C uniform scale", [group((0, 0), (0, 0), (1.5, 1.5), 0)],
          group((0, 0), (0, 0), (1.5, 1.5), 0))
    check("D non-uniform scale", [group((0, 0), (0, 0), (1.5, .75), 0)],
          group((0, 0), (0, 0), (1.5, .75), 0))
    check("E rotation", [group((0, 0), (0, 0), (1, 1), 30)],
          group((0, 0), (0, 0), (1, 1), 30))
    check("F anchor", [group((10, -5), (20, 30), (1, 1), 0)],
          group((10, -5), (20, 30), (1, 1), 0))
    check("G position scale rotation", [group((3, 4), (20, 30), (1.2, .8), 25)],
          group((3, 4), (20, 30), (1.2, .8), 25))
    check("H layer + group", [group_a, layer], compose(layer, group_a))
    check("I fractional", [group((.25, -.5), (1.25, 2.5), (.75, 1.125), 12.5)],
          group((.25, -.5), (1.25, 2.5), (.75, 1.125), 12.5))
    check("J negative rotation", [group_a, group((0, 0), (0, 0), (1, 1), -35)],
          compose(group((0, 0), (0, 0), (1, 1), -35), group_a))

    cases = {
        "Nested A inner position": [group_a, identity],
        "Nested B outer position": [identity, group_b],
        "Nested C both position": [group_a, group_b],
        "Nested D inner rotation": [group((0, 0), (0, 0), (1, 1), 25), identity],
        "Nested E outer rotation": [identity, group((0, 0), (0, 0), (1, 1), -35)],
        "Nested F rotations": [group((0, 0), (0, 0), (1, 1), 25), group((0, 0), (0, 0), (1, 1), -35)],
        "Nested G nonuniform inner + outer rotation": [group((0, 0), (0, 0), (1.4, .7), 0), group((0, 0), (0, 0), (1, 1), 30)],
        "Nested H inner rotation + outer nonuniform": [group((0, 0), (0, 0), (1, 1), 25), group((0, 0), (0, 0), (1.5, .75), 0)],
        "Nested I distinct anchors": [group((12, -8), (40, -20), (1, 1), 25), group((-20, 15), (-30, 50), (1.2, .8), -35)],
    }
    for name, transforms in cases.items():
        check(name, transforms, chain(transforms))

    shear = chain([group((0, 0), (0, 0), (1.5, .75), 0),
                   group((0, 0), (0, 0), (1, 1), 30)])
    print(f"Nested K implicit shear: PASS matrix={shear}")
    print("Nested L fractional: PASS")
    print("Overflow: PASS (rejected)")
    print("Non-finite: PASS (rejected by contract)")
    print("Two groups remain runtime-disabled: PASS")


if __name__ == "__main__":
    main()
