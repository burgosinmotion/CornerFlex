"""Pure source-selection contract test for Phase 5.14D-II.

This models only the activation gate. It does not call After Effects or the AEX.
"""


def rectangle_source_allowed(
    snapshot_enabled: bool,
    target_found: bool,
    target_is_rectangle: bool,
    chain_valid: bool,
    chain_unsupported: bool,
    depth: int,
    converted_source_available: bool,
) -> bool:
    enabled = snapshot_enabled
    if enabled and (
        not target_found
        or not target_is_rectangle
        or not chain_valid
        or chain_unsupported
        or depth > 2
        or not converted_source_available
    ):
        enabled = False
    return enabled


def main() -> None:
    cases = {
        "A_root": (True, True, True, True, False, 0, True, True),
        "B_single_group": (True, True, True, True, False, 1, True, True),
        "C_double_group_valid": (True, True, True, True, False, 2, True, True),
        "D_triple_group": (True, True, True, False, True, 3, True, False),
        "E_double_group_skew": (True, True, True, False, True, 2, True, False),
        "F_scale_zero": (True, True, True, False, True, 1, True, False),
        "G_scale_negative": (True, True, True, False, True, 1, True, False),
        "H_invalid_path": (True, False, False, False, False, 0, True, False),
    }

    for name, values in cases.items():
        *arguments, expected = values
        actual = rectangle_source_allowed(*arguments)
        if actual != expected:
            raise AssertionError(
                f"{name}: expected {expected}, received {actual}"
            )

    print("PHASE 5.14D-II SOURCE SELECTION: PASS")
    print("CASES=8")


if __name__ == "__main__":
    main()
