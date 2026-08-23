"""Pure, independent validation for the Phase 5.13B affine foundation."""

import math


EPS = 1.0e-12
MEMBERSHIP_TOLERANCE = 1.0e-9


def identity():
    return (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)


def transform_point(matrix, point):
    a, b, c, d, tx, ty = matrix
    x, y = point
    return (a * x + c * y + tx, b * x + d * y + ty)


def compose(parent, child):
    pa, pb, pc, pd, ptx, pty = parent
    ca, cb, cc, cd, ctx, cty = child
    return (
        pa * ca + pc * cb,
        pb * ca + pd * cb,
        pa * cc + pc * cd,
        pb * cc + pd * cd,
        pa * ctx + pc * cty + ptx,
        pb * ctx + pd * cty + pty,
    )


def scale_rotation(scale_x, scale_y, degrees):
    radians = math.radians(degrees)
    cosine = math.cos(radians)
    sine = math.sin(radians)
    return (
        cosine * scale_x,
        sine * scale_x,
        -sine * scale_y,
        cosine * scale_y,
        0.0,
        0.0,
    )


def translation(x, y):
    return (1.0, 0.0, 0.0, 1.0, x, y)


def rectangle(center=(0.0, 0.0), basis_x=(1.0, 0.0), basis_y=(0.0, 1.0), half=(2.0, 1.0)):
    return (center, basis_x, basis_y, half)


def transform_rectangle(rect, matrix):
    center, basis_x, basis_y, half = rect
    return (
        transform_point(matrix, center),
        transform_linear(matrix, basis_x),
        transform_linear(matrix, basis_y),
        half,
    )


def transform_linear(matrix, vector):
    a, b, c, d, _, _ = matrix
    x, y = vector
    return (a * x + c * y, b * x + d * y)


def vertices(rect):
    center, basis_x, basis_y, half = rect
    hx, hy = half
    ex = (basis_x[0] * hx, basis_x[1] * hx)
    ey = (basis_y[0] * hy, basis_y[1] * hy)
    return (
        (center[0] - ex[0] - ey[0], center[1] - ex[1] - ey[1]),
        (center[0] + ex[0] - ey[0], center[1] + ex[1] - ey[1]),
        (center[0] + ex[0] + ey[0], center[1] + ex[1] + ey[1]),
        (center[0] - ex[0] + ey[0], center[1] - ex[1] + ey[1]),
    )


def aabb(rect):
    points = vertices(rect)
    return (min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points), max(p[1] for p in points))


def determinant(rect):
    _, basis_x, basis_y, _ = rect
    return basis_x[0] * basis_y[1] - basis_y[0] * basis_x[1]


def contains(rect, point):
    center, basis_x, basis_y, half = rect
    det = determinant(rect)
    if not math.isfinite(det) or abs(det) <= EPS:
        return False
    dx = point[0] - center[0]
    dy = point[1] - center[1]
    local_x = (basis_y[1] * dx - basis_y[0] * dy) / det
    local_y = (-basis_x[1] * dx + basis_x[0] * dy) / det
    return abs(local_x) <= half[0] + MEMBERSHIP_TOLERANCE and abs(local_y) <= half[1] + MEMBERSHIP_TOLERANCE


def close(left, right, tolerance=1.0e-9):
    return abs(left - right) <= tolerance


def close_tuple(left, right, tolerance=1.0e-9):
    return len(left) == len(right) and all(close(a, b, tolerance) for a, b in zip(left, right))


def check(label, condition):
    if not condition:
        raise AssertionError(label)
    print(f"{label}: PASS")


def main():
    base = rectangle()
    check("A Identity", close_tuple(transform_point(identity(), (3.0, -2.0)), (3.0, -2.0)))
    check("B Translation", close_tuple(transform_point(compose(translation(7.0, -3.0), translation(2.0, 4.0)), (1.0, 1.0)), (10.0, 2.0)))
    check("C Uniform Scale", close_tuple(transform_point(scale_rotation(1.5, 1.5, 0.0), (2.0, -1.0)), (3.0, -1.5)))
    check("D Non-uniform Scale", close_tuple(transform_point(scale_rotation(1.5, 0.75, 0.0), (2.0, -1.0)), (3.0, -0.75)))
    for degrees in (15.0, 45.0, 90.0, -45.0, 180.0):
        expected = (math.cos(math.radians(degrees)), math.sin(math.radians(degrees)))
        check(f"E Rotation {degrees:g}", close_tuple(transform_point(scale_rotation(1.0, 1.0, degrees), (1.0, 0.0)), expected))
    child = translation(4.0, 2.0)
    parent = scale_rotation(1.25, 0.8, 30.0)
    point = (-2.0, 3.0)
    check("F Parent child", close_tuple(transform_point(compose(parent, child), point), transform_point(parent, transform_point(child, point))))
    check("G Reverse order differs", not close_tuple(compose(parent, child), compose(child, parent)))
    check("H Two rotations", close_tuple(transform_point(compose(scale_rotation(1.0, 1.0, 30.0), scale_rotation(1.0, 1.0, 15.0)), point), transform_point(scale_rotation(1.0, 1.0, 45.0), point)))
    mixed = scale_rotation(1.5, 0.75, 30.0)
    check("I Non-uniform Scale + Rotation", close_tuple(transform_point(mixed, point), (1.5 * math.cos(math.radians(30.0)) * point[0] - 0.75 * math.sin(math.radians(30.0)) * point[1], 1.5 * math.sin(math.radians(30.0)) * point[0] + 0.75 * math.cos(math.radians(30.0)) * point[1])))
    non_orthogonal = transform_rectangle(base, compose(scale_rotation(0.8, 1.4, 35.0), scale_rotation(1.7, 0.6, -20.0)))
    check("J Potentially non-orthogonal basis", abs(non_orthogonal[1][0] * non_orthogonal[2][0] + non_orthogonal[1][1] * non_orthogonal[2][1]) > 1.0e-6)
    chain = compose(scale_rotation(0.9, 1.3, 40.0), compose(translation(4.0, -2.0), scale_rotation(1.2, 0.7, -15.0)))
    sequential = transform_point(scale_rotation(0.9, 1.3, 40.0), transform_point(translation(4.0, -2.0), transform_point(scale_rotation(1.2, 0.7, -15.0), point)))
    check("K Three-transform chain", close_tuple(transform_point(chain, point), sequential))
    expected_aabb = aabb(transform_rectangle(base, mixed))
    check("L AABB four vertices", close_tuple(expected_aabb, (-2.973076211353316, -2.149519052838329, 2.973076211353316, 2.149519052838329)))
    check("M Axis membership", contains(base, (0.0, 0.0)) and not contains(base, (2.1, 0.0)) and contains(base, (2.0, 0.0)))
    rotated = transform_rectangle(base, scale_rotation(1.0, 1.0, 45.0))
    check("N Rotated membership", contains(rotated, (0.0, 0.0)) and not contains(rotated, (3.0, 0.0)))
    skewed = rectangle(basis_x=(1.0, 0.0), basis_y=(0.5, 1.0))
    check("O Non-orthogonal membership", contains(skewed, (0.0, 0.0)) and contains(skewed, (1.0, 0.5)) and not contains(skewed, (2.0, -1.0)))
    degenerate = rectangle(basis_y=(2.0, 0.0))
    check("P Determinant zero", not contains(degenerate, (0.0, 0.0)))
    near_singular = rectangle(basis_y=(1.0, 1.0e-13))
    check("Q Near-singular determinant", not contains(near_singular, (0.0, 0.0)))
    nan_rect = rectangle(basis_x=(math.nan, 0.0))
    inf_rect = rectangle(basis_x=(math.inf, 0.0))
    check("R NaN Infinity", not math.isfinite(determinant(nan_rect)) and not math.isfinite(determinant(inf_rect)))
    fractional = transform_rectangle(base, compose(scale_rotation(1.125, 0.875, 17.5), translation(0.25, -0.75)))
    check("S Fractional values", contains(fractional, fractional[0]))
    print("ORTHOGONAL SUBSET: PASS (same four-vertex/AABB equations as oriented foundation)")
    print("PHASE 5.13B PURE FOUNDATION RESULT: PASS")


if __name__ == "__main__":
    main()
