"""Pure oracle for the Phase 5.13C single-group affine contract."""

import math


def compose(parent, child):
    a, b, c, d, tx, ty = parent
    A, B, C, D, X, Y = child
    return (
        a * A + c * B,
        b * A + d * B,
        a * C + c * D,
        b * C + d * D,
        a * X + c * Y + tx,
        b * X + d * Y + ty,
    )


def group(anchor, position, scale, degrees):
    rad = math.radians(degrees)
    c, s = math.cos(rad), math.sin(rad)
    sx, sy = scale
    return (
        c * sx,
        s * sx,
        -s * sy,
        c * sy,
        position[0] - c * sx * anchor[0] + s * sy * anchor[1],
        position[1] - s * sx * anchor[0] - c * sy * anchor[1],
    )


def point(t, p):
    return (t[0] * p[0] + t[2] * p[1] + t[4],
            t[1] * p[0] + t[3] * p[1] + t[5])


def valid_scale(scale):
    return all(math.isfinite(v) and v > 0 for v in scale)


def main():
    identity = (1, 0, 0, 1, 0, 0)
    cases = {
        "A group position": group((0, 0), (200, 100), (1, 1), 0),
        "B group anchor": group((100, 50), (0, 0), (1, 1), 0),
        "C uniform scale": group((0, 0), (0, 0), (1.5, 1.5), 0),
        "D nonuniform scale": group((0, 0), (0, 0), (1.5, .75), 0),
        "E positive rotation": group((0, 0), (0, 0), (1, 1), 30),
        "F negative rotation": group((0, 0), (0, 0), (1, 1), -45),
    }
    checks = []
    checks.extend(all(math.isfinite(v) for v in t) for t in cases.values())
    checks.append(point(identity, (12, -9)) == (12, -9))
    layer = group((0, 0), (120, 40), (1.2, .8), 15)
    child = group((20, 10), (50, -20), (1.5, 1.1), -30)
    probe = (3.0, -2.0)
    composedPoint = point(compose(layer, child), probe)
    sequentialPoint = point(layer, point(child, probe))
    checks.append(all(abs(a - b) < 1.0e-9 for a, b in zip(composedPoint, sequentialPoint)))
    checks.append(valid_scale((1, 1)))
    checks.append(not valid_scale((0, 1)))
    checks.append(not valid_scale((-1, 1)))
    checks.append(not valid_scale((float("nan"), 1)))
    for name, passed in zip(list(cases) + ["identity", "composition", "positive scale", "zero scale", "negative scale", "nonfinite scale"], checks):
        print(f"{name}: {'PASS' if passed else 'FAIL'}")
    result = all(checks)
    print(f"PHASE 5.13C PURE RESULT: {'PASS' if result else 'FAIL'}")
    return 0 if result else 1


if __name__ == "__main__":
    raise SystemExit(main())
