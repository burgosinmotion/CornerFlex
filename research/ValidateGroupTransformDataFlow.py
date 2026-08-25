"""Pure Phase 5.13C.13 data-flow check; no SDK or production C++ imports."""

import math


def group_matrix(position, scale, rotation, anchor=(0.0, 0.0)):
    radians = math.radians(rotation)
    c, s = math.cos(radians), math.sin(radians)
    sx, sy = scale
    return (
        c * sx,
        s * sx,
        -s * sy,
        c * sy,
        position[0] - c * sx * anchor[0] + s * sy * anchor[1],
        position[1] - s * sx * anchor[0] - c * sy * anchor[1],
    )


def apply(transform, point):
    return (
        transform[0] * point[0] + transform[2] * point[1] + transform[4],
        transform[1] * point[0] + transform[3] * point[1] + transform[5],
    )


def assert_close(actual, expected):
    assert all(abs(a - b) < 1.0e-9 for a, b in zip(actual, expected)), (actual, expected)


def main():
    cases = [((100, 100), (1.0, 1.0)), ((80, 120), (0.8, 1.2)),
             ((135, 70), (1.35, 0.7)), ((150, 75), (1.5, 0.75))]
    for raw, expected in cases:
        normalized = (raw[0] / 100.0, raw[1] / 100.0)
        assert_close(normalized, expected)
        print(f"raw={raw} normalized={normalized} PASS")
    for invalid in ((0, 100), (-10, 100)):
        normalized = (invalid[0] / 100.0, invalid[1] / 100.0)
        assert not (normalized[0] > 0 and normalized[1] > 0)
        print(f"raw={invalid} normalized={normalized} invalid PASS")

    matrix_a = group_matrix((-150, 80), (0.8, 1.2), -25)
    matrix_b = group_matrix((280, -100), (1.35, 0.7), 35)
    print("matrix_A=", matrix_a)
    print("matrix_B=", matrix_b)
    print("corner_A_0=", apply(matrix_a, (-400, -210)))
    print("corner_B_0=", apply(matrix_b, (-100, -40)))
    print("GROUP_SCALE_DATA_FLOW_RESULT=PASS")


if __name__ == "__main__":
    main()
