"""Pure model of the intended single-group traversal contract."""


def locate(chain):
    if not chain or chain[0] != "Root":
        return "invalid"
    groups = [name for name in chain if name == "Vector Group"]
    if len(groups) == 0:
        return "root_noop"
    if len(groups) > 1:
        return "nested_unsupported"
    if chain[-1] != "Rectangle":
        return "wrong_final_token"
    return "single_group"


def main():
    cases = {
        "A": (["Root", "Rectangle"], "root_noop"),
        "B": (["Root", "Vector Group", "Vectors Group", "Rectangle"], "single_group"),
        "C": (["Root", "Vector Group", "Vectors Group", "Vector Group", "Vectors Group", "Rectangle"], "nested_unsupported"),
        "D": (["Root", "Vector Group", "Vectors Group"], "wrong_final_token"),
        "E": (["Wrong", "Rectangle"], "invalid"),
    }
    for name, (chain, expected) in cases.items():
        actual = locate(chain)
        print(name, actual, "PASS" if actual == expected else "FAIL")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
