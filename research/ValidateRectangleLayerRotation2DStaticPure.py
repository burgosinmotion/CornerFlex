"""Pure geometry checks for Phase 5.12C static Layer Rotation 2D."""

from __future__ import annotations

from dataclasses import dataclass
from math import cos, isclose, radians, sin, sqrt


EPSILON = 1.0e-6


@dataclass(frozen=True)
class Vector2:
    x: float
    y: float


@dataclass(frozen=True)
class AffineTransform2D:
    a: float
    b: float
    c: float
    d: float
    tx: float
    ty: float


@dataclass(frozen=True)
class OrientedRectangle:
    center: Vector2
    axis_x: Vector2
    axis_y: Vector2
    half_width: float
    half_height: float


def dot(a: Vector2, b: Vector2) -> float:
    return (a.x * b.x) + (a.y * b.y)


def length(vector: Vector2) -> float:
    return sqrt(dot(vector, vector))


def normalize(vector: Vector2) -> Vector2:
    vector_length = length(vector)
    assert vector_length > 0
    return Vector2(vector.x / vector_length, vector.y / vector_length)


def transform_point(transform: AffineTransform2D, point: Vector2) -> Vector2:
    return Vector2(
        transform.a * point.x + transform.c * point.y + transform.tx,
        transform.b * point.x + transform.d * point.y + transform.ty,
    )


def build_transform(rotation_degrees: float, scale_x: float = 1.0, scale_y: float = 1.0) -> AffineTransform2D:
    angle = radians(rotation_degrees)
    c = cos(angle)
    s = sin(angle)
    return AffineTransform2D(
        a=c * scale_x,
        b=s * scale_x,
        c=-s * scale_y,
        d=c * scale_y,
        tx=0.0,
        ty=0.0,
    )


def build_rectangle(width: float, height: float) -> OrientedRectangle:
    return OrientedRectangle(
        center=Vector2(0.0, 0.0),
        axis_x=Vector2(1.0, 0.0),
        axis_y=Vector2(0.0, 1.0),
        half_width=width / 2.0,
        half_height=height / 2.0,
    )


def transform_rectangle(rectangle: OrientedRectangle, transform: AffineTransform2D) -> OrientedRectangle:
    axis_x = Vector2(
        transform.a * rectangle.axis_x.x + transform.c * rectangle.axis_x.y,
        transform.b * rectangle.axis_x.x + transform.d * rectangle.axis_x.y,
    )
    axis_y = Vector2(
        transform.a * rectangle.axis_y.x + transform.c * rectangle.axis_y.y,
        transform.b * rectangle.axis_y.x + transform.d * rectangle.axis_y.y,
    )
    axis_x_length = length(axis_x)
    axis_y_length = length(axis_y)
    return OrientedRectangle(
        center=transform_point(transform, rectangle.center),
        axis_x=normalize(axis_x),
        axis_y=normalize(axis_y),
        half_width=rectangle.half_width * axis_x_length,
        half_height=rectangle.half_height * axis_y_length,
    )


def aabb(rectangle: OrientedRectangle) -> tuple[float, float, float, float]:
    x_extent = Vector2(rectangle.axis_x.x * rectangle.half_width, rectangle.axis_x.y * rectangle.half_width)
    y_extent = Vector2(rectangle.axis_y.x * rectangle.half_height, rectangle.axis_y.y * rectangle.half_height)
    points = (
        Vector2(rectangle.center.x - x_extent.x - y_extent.x, rectangle.center.y - x_extent.y - y_extent.y),
        Vector2(rectangle.center.x + x_extent.x - y_extent.x, rectangle.center.y + x_extent.y - y_extent.y),
        Vector2(rectangle.center.x + x_extent.x + y_extent.x, rectangle.center.y + x_extent.y + y_extent.y),
        Vector2(rectangle.center.x - x_extent.x + y_extent.x, rectangle.center.y - x_extent.y + y_extent.y),
    )
    return (
        min(point.x for point in points),
        min(point.y for point in points),
        max(point.x for point in points),
        max(point.y for point in points),
    )


def contains(rectangle: OrientedRectangle, point: Vector2) -> bool:
    delta = Vector2(point.x - rectangle.center.x, point.y - rectangle.center.y)
    local_x = dot(delta, rectangle.axis_x)
    local_y = dot(delta, rectangle.axis_y)
    return abs(local_x) <= rectangle.half_width + EPSILON and abs(local_y) <= rectangle.half_height + EPSILON


def assert_close_tuple(actual: tuple[float, ...], expected: tuple[float, ...], label: str) -> None:
    assert len(actual) == len(expected)
    for index, (a, e) in enumerate(zip(actual, expected)):
        assert isclose(a, e, abs_tol=EPSILON), f"{label}[{index}] actual={a} expected={e}"


def main() -> None:
    base = build_rectangle(400.0, 200.0)

    rotation0 = transform_rectangle(base, build_transform(0.0))
    assert_close_tuple(aabb(rotation0), (-200.0, -100.0, 200.0, 100.0), "rotation0-aabb")
    assert contains(rotation0, Vector2(199.0, 99.0))
    assert not contains(rotation0, Vector2(201.0, 99.0))

    rotation90 = transform_rectangle(base, build_transform(90.0))
    assert_close_tuple(aabb(rotation90), (-100.0, -200.0, 100.0, 200.0), "rotation90-aabb")
    assert isclose(length(rotation90.axis_x), 1.0, abs_tol=EPSILON)
    assert isclose(length(rotation90.axis_y), 1.0, abs_tol=EPSILON)
    assert contains(rotation90, Vector2(-99.0, 199.0))
    assert not contains(rotation90, Vector2(101.0, 199.0))

    rotation45 = transform_rectangle(base, build_transform(45.0))
    expected_half_extent = (400.0 / 2.0 + 200.0 / 2.0) * sqrt(0.5)
    assert_close_tuple(
        aabb(rotation45),
        (-expected_half_extent, -expected_half_extent, expected_half_extent, expected_half_extent),
        "rotation45-aabb",
    )
    assert contains(rotation45, transform_point(build_transform(45.0), Vector2(190.0, 0.0)))
    assert not contains(rotation45, Vector2(0.0, expected_half_extent - 1.0))

    rotation_minus45 = transform_rectangle(base, build_transform(-45.0))
    assert_close_tuple(
        aabb(rotation_minus45),
        (-expected_half_extent, -expected_half_extent, expected_half_extent, expected_half_extent),
        "rotation-45-aabb",
    )
    assert contains(rotation_minus45, transform_point(build_transform(-45.0), Vector2(190.0, 0.0)))
    assert not contains(rotation_minus45, Vector2(0.0, expected_half_extent - 1.0))

    scaled_rotation = transform_rectangle(base, build_transform(30.0, 1.5, 0.75))
    assert isclose(length(scaled_rotation.axis_x), 1.0, abs_tol=EPSILON)
    assert isclose(length(scaled_rotation.axis_y), 1.0, abs_tol=EPSILON)
    assert isclose(scaled_rotation.half_width, 300.0, abs_tol=EPSILON)
    assert isclose(scaled_rotation.half_height, 75.0, abs_tol=EPSILON)

    print("PHASE 5.12C STATIC ROTATION PURE GEOMETRY TESTS: PASS")


if __name__ == "__main__":
    main()
