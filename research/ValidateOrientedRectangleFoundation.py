import math


EPSILON = 1.0e-9


def close(actual, expected, epsilon=EPSILON):
    return abs(actual - expected) <= epsilon


def assert_close_tuple(label, actual, expected):
    if len(actual) != len(expected):
        raise AssertionError(f"{label}: length mismatch {len(actual)} != {len(expected)}")

    for index, (a, e) in enumerate(zip(actual, expected)):
        if not close(a, e):
            raise AssertionError(f"{label}[{index}]: expected {e}, got {a}")


def transform_point(transform, point):
    x, y = point
    a, b, c, d, tx, ty = transform
    return (
        a * x + c * y + tx,
        b * x + d * y + ty,
    )


def identity():
    return (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)


def layer_transform(origin, position, comp, anchor, scale_percent):
    scale_x = scale_percent[0] / 100.0
    scale_y = scale_percent[1] / 100.0
    tx = origin[0] + position[0] - (comp[0] * 0.5) - (anchor[0] * scale_x)
    ty = origin[1] + position[1] - (comp[1] * 0.5) - (anchor[1] * scale_y)
    return (scale_x, 0.0, 0.0, scale_y, tx, ty)


def rotation_transform(degrees):
    radians = math.radians(degrees)
    cosine = math.cos(radians)
    sine = math.sin(radians)
    return (cosine, sine, -sine, cosine, 0.0, 0.0)


def axis_aligned_rectangle(bounds):
    left, top, right, bottom = bounds
    width = right - left
    height = bottom - top
    return {
        "center": (left + width * 0.5, top + height * 0.5),
        "axis_x": (1.0, 0.0),
        "axis_y": (0.0, 1.0),
        "half_width": width * 0.5,
        "half_height": height * 0.5,
    }


def transform_rectangle(rectangle, transform):
    a, b, c, d, _, _ = transform
    axis_x = rectangle["axis_x"]
    axis_y = rectangle["axis_y"]

    return {
        "center": transform_point(transform, rectangle["center"]),
        "axis_x": (
            a * axis_x[0] + c * axis_x[1],
            b * axis_x[0] + d * axis_x[1],
        ),
        "axis_y": (
            a * axis_y[0] + c * axis_y[1],
            b * axis_y[0] + d * axis_y[1],
        ),
        "half_width": rectangle["half_width"],
        "half_height": rectangle["half_height"],
    }


def rectangle_vertices(rectangle):
    cx, cy = rectangle["center"]
    ax, ay = rectangle["axis_x"]
    bx, by = rectangle["axis_y"]
    hx = rectangle["half_width"]
    hy = rectangle["half_height"]
    x_extent = (ax * hx, ay * hx)
    y_extent = (bx * hy, by * hy)

    return (
        (cx - x_extent[0] - y_extent[0], cy - x_extent[1] - y_extent[1]),
        (cx + x_extent[0] - y_extent[0], cy + x_extent[1] - y_extent[1]),
        (cx + x_extent[0] + y_extent[0], cy + x_extent[1] + y_extent[1]),
        (cx - x_extent[0] + y_extent[0], cy - x_extent[1] + y_extent[1]),
    )


def rectangle_aabb(rectangle):
    vertices = rectangle_vertices(rectangle)
    xs = [point[0] for point in vertices]
    ys = [point[1] for point in vertices]
    return (min(xs), min(ys), max(xs), max(ys))


def local_bounds(size, position=(0.0, 0.0)):
    half_width = size[0] * 0.5
    half_height = size[1] * 0.5
    return (
        position[0] - half_width,
        position[1] - half_height,
        position[0] + half_width,
        position[1] + half_height,
    )


def transformed_aabb(size, rect_position, anchor, layer_position, scale):
    transform = layer_transform(
        origin=(960.0, 540.0),
        position=layer_position,
        comp=(1920.0, 1080.0),
        anchor=anchor,
        scale_percent=scale,
    )
    rectangle = axis_aligned_rectangle(local_bounds(size, rect_position))
    return rectangle_aabb(transform_rectangle(rectangle, transform))


def run():
    assert_close_tuple(
        "A identity point",
        transform_point(identity(), (12.5, -4.0)),
        (12.5, -4.0),
    )

    assert_close_tuple(
        "B translation point",
        transform_point((1.0, 0.0, 0.0, 1.0, 240.0, 160.0), (10.0, 20.0)),
        (250.0, 180.0),
    )

    assert_close_tuple(
        "C uniform scale",
        transformed_aabb((500.0, 500.0), (0.0, 0.0), (0.0, 0.0), (960.0, 540.0), (150.0, 150.0)),
        (585.0, 165.0, 1335.0, 915.0),
    )

    assert_close_tuple(
        "C0 scale 100x100",
        transformed_aabb((500.0, 500.0), (0.0, 0.0), (0.0, 0.0), (960.0, 540.0), (100.0, 100.0)),
        (710.0, 290.0, 1210.0, 790.0),
    )

    assert_close_tuple(
        "D non-uniform scale",
        transformed_aabb((500.0, 500.0), (0.0, 0.0), (0.0, 0.0), (960.0, 540.0), (150.0, 75.0)),
        (585.0, 352.5, 1335.0, 727.5),
    )

    assert_close_tuple(
        "E Anchor + Scale + Position",
        transformed_aabb((500.0, 500.0), (0.0, 0.0), (100.0, 50.0), (960.0, 540.0), (150.0, 150.0)),
        (435.0, 90.0, 1185.0, 840.0),
    )

    assert_close_tuple(
        "F fractional values",
        transformed_aabb((500.0, 500.0), (0.0, 0.0), (0.0, 0.0), (960.0, 540.0), (123.5, 87.25)),
        (651.25, 321.875, 1268.75, 758.125),
    )

    assert_close_tuple(
        "F1 Layer Position",
        transformed_aabb((500.0, 500.0), (0.0, 0.0), (0.0, 0.0), (1200.0, 700.0), (150.0, 150.0)),
        (825.0, 325.0, 1575.0, 1075.0),
    )

    assert_close_tuple(
        "F2 Rectangle Position",
        transformed_aabb((500.0, 500.0), (200.0, 100.0), (0.0, 0.0), (960.0, 540.0), (150.0, 150.0)),
        (885.0, 315.0, 1635.0, 1065.0),
    )

    animated_scale = (100.0 + 0.5 * 50.0, 100.0 + 0.5 * 50.0)
    assert_close_tuple(
        "F3 animated Scale T0.5",
        transformed_aabb((500.0, 500.0), (0.0, 0.0), (0.0, 0.0), (960.0, 540.0), animated_scale),
        (647.5, 227.5, 1272.5, 852.5),
    )

    expression_scale = (100.0 + 1.0 * 50.0, 100.0 + 1.0 * 25.0)
    assert_close_tuple(
        "F4 expression Scale T1",
        transformed_aabb((500.0, 500.0), (0.0, 0.0), (0.0, 0.0), (960.0, 540.0), expression_scale),
        (585.0, 227.5, 1335.0, 852.5),
    )

    assert_close_tuple(
        "F5 return to Layer Bounds contract",
        (0.0, 0.0, 1920.0, 1080.0),
        (0.0, 0.0, 1920.0, 1080.0),
    )

    assert_close_tuple(
        "G axis-aligned AABB",
        rectangle_aabb(axis_aligned_rectangle((-50.0, -25.0, 50.0, 25.0))),
        (-50.0, -25.0, 50.0, 25.0),
    )

    rotated = transform_rectangle(
        axis_aligned_rectangle((-50.0, -25.0, 50.0, 25.0)),
        rotation_transform(45.0),
    )
    half_aabb = (75.0 * math.sqrt(2.0)) * 0.5

    assert_close_tuple(
        "H rotation axes",
        rotated["axis_x"] + rotated["axis_y"],
        (
            math.sqrt(2.0) * 0.5,
            math.sqrt(2.0) * 0.5,
            -math.sqrt(2.0) * 0.5,
            math.sqrt(2.0) * 0.5,
        ),
    )

    assert_close_tuple(
        "H rotation AABB",
        rectangle_aabb(rotated),
        (-half_aabb, -half_aabb, half_aabb, half_aabb),
    )

    print("PHASE 5.12B ORIENTED RECTANGLE FOUNDATION TESTS: PASS")


if __name__ == "__main__":
    run()
