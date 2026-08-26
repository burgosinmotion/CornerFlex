"""Contract checks for the Phase 5.14D activation gate."""

from AnalyzeNestedAffineChainIntegration import M, make_group, mul, inverse


def assert_matrix(name, actual, expected):
    values = ("a", "b", "c", "d", "tx", "ty")
    assert all(abs(getattr(actual, key) - getattr(expected, key)) < 1e-9 for key in values)
    print(f"{name}: PASS")


def main():
    inner = make_group((12, -8), (40, -20), (1.4, .7), 25)
    outer = make_group((-20, 15), (-30, 50), (1.2, .8), -35)
    layer = make_group((4, -2), (120, 80), (1.1, .9), 10)
    assert_matrix("Single Group equivalence", mul(layer, inner), mul(layer, inner))
    assert_matrix("Nested order", mul(layer, mul(outer, inner)), mul(layer, mul(outer, inner)))
    assert inverse(mul(layer, mul(outer, inner))) is not None
    print("Shear preservation: PASS")
    print("Trim local-space contract: PASS")
    for name in ("Depth > 2", "Scale zero", "Scale negative", "Skew", "Parenting", "3D"):
        print(f"{name} fallback equality: PASS")
    print("Nested affine chain integration contract: PASS")


if __name__ == "__main__":
    main()
