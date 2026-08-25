"""Pure reconstruction of the C.17 affine extent data flow."""
from math import cos, radians, sin


def aabb(width, height, scale_x, scale_y, rotation):
    c = abs(cos(radians(rotation)))
    s = abs(sin(radians(rotation)))
    return c * width * scale_x + s * height * scale_y, s * width * scale_x + c * height * scale_y


def main():
    assert aabb(300, 180, 1, 1, 0) == (300, 180)
    assert aabb(300, 180, 0.8, 1.2, 0) == (240, 216)
    full = aabb(300, 180, 0.8, 1.2, -25)
    trimmed = aabb(240, 144, 0.8, 1.2, -25)
    assert 308.7 < full[0] < 308.9 and 297.1 < full[1] < 297.3
    assert 247.0 < trimmed[0] < 247.1 and 237.7 < trimmed[1] < 237.8
    print("PASS: affine extent reconstruction")
    print("full=%.6f,%.6f" % full)
    print("trimmed=%.6f,%.6f" % trimmed)


if __name__ == "__main__":
    main()
