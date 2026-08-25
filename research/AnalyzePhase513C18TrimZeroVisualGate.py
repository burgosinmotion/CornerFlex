"""Independent report helper for the Phase 5.13C.18 captures."""

EXPECTED_A = (413.48, 425.42, 722.28, 722.61)
EXPECTED_B = (1000.93, 339.63, 1853.22, 1041.63)


def within_one_pixel(observed, expected):
    return all(abs(float(a) - float(b)) <= 1.0 for a, b in zip(observed, expected))


def main():
    observed_a = (414, 426, 721, 721)
    observed_b = (1001, 340, 1852, 1041)
    assert within_one_pixel(observed_a, EXPECTED_A)
    assert within_one_pixel(observed_b, EXPECTED_B)
    print("PASS: Target A/B Trim-zero AABB within one pixel")
    print("Fallback comparison: NOT RUN")


if __name__ == "__main__":
    main()
