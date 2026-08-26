"""Pure contract test for Phase 5.14C hierarchical target resolution."""

MAX_DEPTH = 2
ROOT = 1
GROUP = 2
CONTENTS = 3
RECTANGLE = 4


def resolve(tokens, indices):
    if len(tokens) != len(indices) or not tokens:
        return {"count": 0, "supported": False, "reason": "path_incomplete"}
    if tokens[0] != ROOT or tokens[-1] != RECTANGLE:
        return {"count": 0, "supported": False, "reason": "terminal_token"}
    if any(index < 0 for index in indices) or any(
        index == 0 for index in indices[1:]):
        return {"count": 0, "supported": False, "reason": "index_invalid"}
    group_count = sum(token == GROUP for token in tokens)
    if group_count > MAX_DEPTH:
        return {"count": group_count, "supported": False, "reason": "depth_unsupported"}
    expected = {
        0: [ROOT, CONTENTS, RECTANGLE],
        1: [ROOT, GROUP, CONTENTS, RECTANGLE],
        2: [ROOT, GROUP, CONTENTS, GROUP, CONTENTS, RECTANGLE],
    }
    if tokens != expected[group_count]:
        return {"count": group_count, "supported": False, "reason": "match_name_mismatch"}
    return {
        "count": group_count,
        "supported": True,
        "inner": 0 if group_count == 0 else 1,
        "outer": 1 if group_count == 2 else None,
        "order": "Inner,Outer" if group_count == 2 else "single/root",
        "reason": "ok",
    }


def assert_case(name, result, count, supported, reason="ok"):
    assert result["count"] == count, (name, result)
    assert result["supported"] is supported, (name, result)
    assert result["reason"] == reason, (name, result)
    print(f"{name}: PASS {result}")


def main():
    assert_case("Root", resolve([ROOT, CONTENTS, RECTANGLE], [0, 1, 1]), 0, True)
    assert_case("Single", resolve([ROOT, GROUP, CONTENTS, RECTANGLE], [0, 1, 1, 1]), 1, True)
    assert_case("Double", resolve([ROOT, GROUP, CONTENTS, GROUP, CONTENTS, RECTANGLE], [0, 1, 1, 2, 1, 1]), 2, True)
    assert_case("Triple", resolve([ROOT, GROUP, CONTENTS, GROUP, CONTENTS, GROUP, CONTENTS, RECTANGLE], [0, 1, 1, 2, 1, 3, 1, 1]), 3, False, "depth_unsupported")
    assert_case("Index invalid", resolve([ROOT, GROUP, CONTENTS, RECTANGLE], [0, 0, 1, 1]), 0, False, "index_invalid")
    assert_case("Match invalid", resolve([ROOT, GROUP, CONTENTS, 99], [0, 1, 1, 1]), 0, False, "terminal_token")
    assert_case("Path truncated", resolve([ROOT, GROUP, CONTENTS], [0, 1, 1]), 0, False, "terminal_token")
    assert_case("Rectangle terminal invalid", resolve([ROOT, GROUP, CONTENTS, GROUP], [0, 1, 1, 1]), 0, False, "terminal_token")
    assert_case("Group token invalid", resolve([ROOT, 99, CONTENTS, RECTANGLE], [0, 1, 1, 1]), 0, False, "match_name_mismatch")
    print("Deterministic resolution contract: PASS")
    print("Nested runtime activation: DISABLED")


if __name__ == "__main__":
    main()
