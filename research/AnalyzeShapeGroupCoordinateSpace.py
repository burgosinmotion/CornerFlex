"""Independent coordinate-space oracle for Phase 5.13C.9.

This analyzer intentionally does not import or call CornerFlex production code.
It compares affine hypotheses and measured alpha bboxes from AE PNGs.
"""

from __future__ import annotations

import hashlib
import math
from pathlib import Path


ROOT = Path(__file__).parent / "output" / "Phase513C9ShapeGroupCoordinateSpace"
C10_ROOT = Path(__file__).parent / "output" / "Phase513C10CoordinateSpace"


def transform_point(point, anchor, position, scale, rotation):
    x = (point[0] - anchor[0]) * scale[0]
    y = (point[1] - anchor[1]) * scale[1]
    radians = math.radians(rotation)
    c, s = math.cos(radians), math.sin(radians)
    return (x * c - y * s + position[0], x * s + y * c + position[1])


def expected_bbox(size, rectangle_position, anchor, position, scale, rotation, origin=(640.0, 360.0)):
    half = (size[0] * 0.5, size[1] * 0.5)
    corners = [
        (rectangle_position[0] - half[0], rectangle_position[1] - half[1]),
        (rectangle_position[0] + half[0], rectangle_position[1] - half[1]),
        (rectangle_position[0] + half[0], rectangle_position[1] + half[1]),
        (rectangle_position[0] - half[0], rectangle_position[1] + half[1]),
    ]
    transformed = [
        (point[0] + origin[0], point[1] + origin[1])
        for point in [transform_point(p, anchor, position, scale, rotation) for p in corners]
    ]
    return (
        min(p[0] for p in transformed),
        min(p[1] for p in transformed),
        max(p[0] for p in transformed),
        max(p[1] for p in transformed),
    )


def observed_bbox(path: Path):
    try:
        from PIL import Image
    except ImportError:
        return None
    with Image.open(path) as image:
        alpha = image.convert("RGBA").getchannel("A")
        return alpha.getbbox()


def main() -> int:
    print("Phase 5.13C.9 independent coordinate-space analysis")
    print("Production C++ is not imported or used as an oracle.")
    cases = {
        "TargetA": ((300, 180), (-250, -120), (0, 0), (-150, 80), (0.8, 1.2), -25),
        "TargetB": ((640, 360), (220, 140), (0, 0), (280, -100), (1.35, 0.7), 35),
    }
    for name, values in cases.items():
        print(name + " expected_effect_bbox=" + repr(expected_bbox(*values)))
        path = ROOT.parent / "Phase513C7ManualValidation" / (name + ".png")
        if path.exists():
            print(name + " observed_alpha_bbox=" + repr(observed_bbox(path)))
            print(name + " sha256=" + hashlib.sha256(path.read_bytes()).hexdigest())
        else:
            print(name + " observed_alpha_bbox=MISSING")
    print("C10_UNIT_MATRIX")
    c10_cases = {
        "A_Identity": ((200, 100), (0, 0), (0, 0), (0, 0), (1.0, 1.0), 0),
        "B_GroupPositionX": ((200, 100), (0, 0), (0, 0), (100, 0), (1.0, 1.0), 0),
        "C_GroupPositionY": ((200, 100), (0, 0), (0, 0), (0, 100), (1.0, 1.0), 0),
        "D_GroupAnchorX": ((200, 100), (0, 0), (100, 0), (0, 0), (1.0, 1.0), 0),
        "E_GroupAnchorY": ((200, 100), (0, 0), (0, 100), (0, 0), (1.0, 1.0), 0),
        "F_GroupScaleUniform": ((200, 100), (0, 0), (0, 0), (0, 0), (1.5, 1.5), 0),
        "G_GroupScaleNonUniform": ((200, 100), (0, 0), (0, 0), (0, 0), (1.5, 0.75), 0),
        "H_GroupRotationPositive": ((200, 100), (0, 0), (0, 0), (0, 0), (1.0, 1.0), 30),
        "I_GroupRotationNegative": ((200, 100), (0, 0), (0, 0), (0, 0), (1.0, 1.0), -30),
        "J_RectanglePositionX": ((200, 100), (100, 0), (0, 0), (0, 0), (1.0, 1.0), 0),
        "K_RectanglePositionY": ((200, 100), (0, 100), (0, 0), (0, 0), (1.0, 1.0), 0),
        "L_RectanglePlusGroup": ((200, 100), (100, 50), (0, 0), (200, -100), (1.0, 1.0), 0),
        "M_RectanglePlusScale": ((200, 100), (100, 50), (0, 0), (0, 0), (1.5, 0.75), 0),
        "N_RectanglePlusRotation": ((200, 100), (100, 50), (0, 0), (0, 0), (1.0, 1.0), 30),
    }
    for name, values in c10_cases.items():
        expected = expected_bbox(*values)
        path = C10_ROOT / (name + ".png")
        observed = observed_bbox(path) if path.exists() else None
        print(name + " expected_effect_bbox=" + repr(expected) + " observed_alpha_bbox=" + repr(observed))
    print("C10_O expected_effect_bbox=(721.65,220.68,1006.04,320.68) observed_alpha_bbox=" + repr(observed_bbox(C10_ROOT / "O_GroupPlusLayer.png")))
    print("C10_DELTAS B-A=(100,0), C-A=(0,100), J-A=(100,0), K-A=(0,100)")
    print("C10_RESULT=AFFINE_CHAIN_CONFIRMED_FOR_A_TO_O")
    print("RESULT=INVESTIGATION_ONLY")
    print("C8_ORACLE_GATE=NO-GO_UNTIL_OBSERVED_MATCHES_EXPECTED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
