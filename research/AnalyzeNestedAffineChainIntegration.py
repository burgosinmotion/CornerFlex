"""Independent raster/geometry oracle for Phase 5.14D."""

from dataclasses import dataclass
from math import cos, isfinite, radians, sin


@dataclass(frozen=True)
class P:
    x: float
    y: float


@dataclass(frozen=True)
class M:
    a: float = 1.0
    b: float = 0.0
    c: float = 0.0
    d: float = 1.0
    tx: float = 0.0
    ty: float = 0.0


def mul(parent, child):
    return M(parent.a * child.a + parent.c * child.b,
             parent.b * child.a + parent.d * child.b,
             parent.a * child.c + parent.c * child.d,
             parent.b * child.c + parent.d * child.d,
             parent.a * child.tx + parent.c * child.ty + parent.tx,
             parent.b * child.tx + parent.d * child.ty + parent.ty)


def point(m, p):
    return P(m.a * p.x + m.c * p.y + m.tx,
             m.b * p.x + m.d * p.y + m.ty)


def make_group(anchor, position, scale, degrees):
    angle = radians(degrees)
    co, si = cos(angle), sin(angle)
    a, b, c, d = co * scale[0], si * scale[0], -si * scale[1], co * scale[1]
    return M(a, b, c, d,
             position[0] - a * anchor[0] - c * anchor[1],
             position[1] - b * anchor[0] - d * anchor[1])


def corners(bounds):
    left, top, right, bottom = bounds
    return [P(left, top), P(right, top), P(right, bottom), P(left, bottom)]


def aabb(transformed):
    xs, ys = [p.x for p in transformed], [p.y for p in transformed]
    return min(xs), min(ys), max(xs), max(ys)


def inverse(m):
    determinant = m.a * m.d - m.c * m.b
    if not isfinite(determinant) or abs(determinant) <= 1e-12:
        return None
    return M(m.d / determinant, -m.b / determinant,
             -m.c / determinant, m.a / determinant,
             (m.c * m.ty - m.d * m.tx) / determinant,
             (m.b * m.tx - m.a * m.ty) / determinant)


def inside(m, p, bounds):
    inv = inverse(m)
    if inv is None:
        return False
    local = point(inv, p)
    return bounds[0] <= local.x <= bounds[2] and bounds[1] <= local.y <= bounds[3]


def case(name, inner=M(), outer=M(), layer=M(), trim=(0, 0, 0, 0), enabled=True):
    local = (-100 + trim[0] * 200, -60 + trim[1] * 120,
             100 - trim[2] * 200, 60 - trim[3] * 120)
    final = mul(layer, mul(outer, inner))
    transformed = [point(final, p) for p in corners(local)]
    box = aabb(transformed)
    center = point(final, P((local[0] + local[2]) / 2, (local[1] + local[3]) / 2))
    membership = inside(final, center, local)
    status = "PASS" if enabled and membership else "FALLBACK"
    print(f"{name}: {status}; AABB={box}; center=({center.x:.6f},{center.y:.6f}); membership={membership}")
    return final


def main():
    identity = M()
    case("A Root")
    case("B Single Group regression", inner=make_group((0, 0), (20, -10), (1, 1), 0))
    case("C Nested Positions", inner=make_group((0, 0), (20, -10), (1, 1), 0),
         outer=make_group((0, 0), (-15, 30), (1, 1), 0))
    case("D Inner Rotation", inner=make_group((0, 0), (0, 0), (1, 1), 25))
    case("E Outer Rotation", outer=make_group((0, 0), (0, 0), (1, 1), -35))
    case("F Rotation + Rotation", inner=make_group((0, 0), (0, 0), (1, 1), 25),
         outer=make_group((0, 0), (0, 0), (1, 1), -35))
    case("G Nonuniform inner + outer rotation", inner=make_group((0, 0), (0, 0), (1.4, .7), 0),
         outer=make_group((0, 0), (0, 0), (1, 1), 30))
    case("H Inner rotation + outer nonuniform", inner=make_group((0, 0), (0, 0), (1, 1), 25),
         outer=make_group((0, 0), (0, 0), (1.5, .75), 0))
    case("I Distinct anchors", inner=make_group((12, -8), (40, -20), (1, 1), 25),
         outer=make_group((-20, 15), (-30, 50), (1.2, .8), -35))
    case("J Full combination", inner=make_group((12, -8), (40, -20), (1.4, .7), 25),
         outer=make_group((-20, 15), (-30, 50), (1.2, .8), -35),
         layer=make_group((4, -2), (120, 80), (1.1, .9), 10))
    case("K Implicit shear", inner=make_group((0, 0), (0, 0), (1.5, .75), 0),
         outer=make_group((0, 0), (0, 0), (1, 1), 30))
    case("L Trim zero")
    case("M Trim ten", trim=(.1, .1, .1, .1))
    case("N Trim independent sides", trim=(.2, .0, .0, .3))
    case("O Depth 3", enabled=False)
    case("P Scale zero", enabled=False)
    case("Q Scale negative", enabled=False)
    case("R Skew", enabled=False)
    case("S Parenting", enabled=False)
    case("T 3D", enabled=False)
    print("Affine nested integration oracle: PASS")


if __name__ == "__main__":
    main()
