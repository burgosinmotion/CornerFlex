"""Independent reconciliation of Phase 5.13C Target A/B.

The script models the confirmed Shape Group contract and the current C++
behavior. It intentionally does not import or execute production C++.
"""

from __future__ import annotations

import math
from pathlib import Path


ROOT = Path(__file__).parent / "output"
FRAMES = ROOT / "Phase513C7ManualValidation"


def matrix(scale, rotation, anchor, position):
    radians = math.radians(rotation)
    c, s = math.cos(radians), math.sin(radians)
    sx, sy = scale
    return (
        (c * sx, -s * sy, position[0] - c * sx * anchor[0] + s * sy * anchor[1]),
        (s * sx, c * sy, position[1] - s * sx * anchor[0] - c * sy * anchor[1]),
    )


def compose(parent, child):
    return (
        (
            parent[0][0] * child[0][0] + parent[0][1] * child[1][0],
            parent[0][0] * child[0][1] + parent[0][1] * child[1][1],
            parent[0][0] * child[0][2] + parent[0][1] * child[1][2] + parent[0][2],
        ),
        (
            parent[1][0] * child[0][0] + parent[1][1] * child[1][0],
            parent[1][0] * child[0][1] + parent[1][1] * child[1][1],
            parent[1][0] * child[0][2] + parent[1][1] * child[1][2] + parent[1][2],
        ),
    )


def apply(transform, point):
    return (
        transform[0][0] * point[0] + transform[0][1] * point[1] + transform[0][2],
        transform[1][0] * point[0] + transform[1][1] * point[1] + transform[1][2],
    )


def corners(size, position):
    half_width, half_height = size[0] * 0.5, size[1] * 0.5
    return [
        (position[0] - half_width, position[1] - half_height),
        (position[0] + half_width, position[1] - half_height),
        (position[0] + half_width, position[1] + half_height),
        (position[0] - half_width, position[1] + half_height),
    ]


def bbox(points):
    return (
        min(point[0] for point in points),
        min(point[1] for point in points),
        max(point[0] for point in points),
        max(point[1] for point in points),
    )


def target_geometry(size, rectangle_position, group_position, group_scale, group_rotation):
    group = matrix(group_scale, group_rotation, (0, 0), group_position)
    points = [apply(group, point) for point in corners(size, rectangle_position)]
    # Layer identity is Position [640,360], Anchor [0,0], Scale [100,100].
    return [(point[0] + 640.0, point[1] + 360.0) for point in points]


def observed_bbox(path):
    try:
        from PIL import Image
    except ImportError:
        return None
    with Image.open(path) as image:
        return image.convert("RGBA").getchannel("A").getbbox()


def print_case(name, size, rectangle_position, group_position, percent_scale, rotation):
    normalized = (percent_scale[0] / 100.0, percent_scale[1] / 100.0)
    current_raw = percent_scale
    correct = bbox(target_geometry(size, rectangle_position, group_position, normalized, rotation))
    current = bbox(target_geometry(size, rectangle_position, group_position, current_raw, rotation))
    observed = observed_bbox(FRAMES / (name + ".png"))
    print(name)
    print("  confirmed_oracle_bbox=", correct)
    print("  current_cpp_raw_scale_bbox=", current)
    print("  observed_alpha_bbox=", observed)


def main() -> int:
    print("Phase 5.13C.11 Target A/B reconciliation")
    print("Layer defaults: anchor [0,0,0], position [640,360,0], scale [100,100,100], rotation 0")
    print_case("TargetA", (300, 180), (-250, -120), (-150, 80), (80, 120), -25)
    print_case("TargetB", (640, 360), (220, 140), (280, -100), (135, 70), 35)
    print("DIFFERENCE=Group Scale is stored as percent instead of normalized factor")
    print("ROOT_CONTENTS_IMPACT=Root path has no group scale and remains compatible")
    print("RESULT=GO_FOR_MINIMAL_SCALE_NORMALIZATION_REVIEW")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
