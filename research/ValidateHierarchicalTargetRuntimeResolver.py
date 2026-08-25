"""Pure contract checks for the Phase 5.13C.16 hierarchical resolver."""

ROOT = "ADBE Root Vectors Group"
GROUP = "ADBE Vector Group"
CONTENTS = "ADBE Vectors Group"
RECT = "ADBE Vector Shape - Rect"


def resolve_path(streams, segments):
    """Resolve by exact index and match token; IDs are never consulted."""
    current = streams
    for index, expected_name in segments:
        if index < 0 or index >= len(current):
            return None
        node = current[index]
        if node["match"] != expected_name:
            return None
        current = node.get("children", [])
    return segments[-1][1] if segments else None


def parent_chain_for_single_group(path):
    if path is None:
        return "fallback"
    if path == RECT:
        return "group"  # runtime parent checks are performed by the AEX.
    return "fallback"


def main():
    single_group = [{"match": ROOT, "children": [
        {"match": GROUP, "children": [
            {"match": CONTENTS, "children": [
                {"match": RECT, "unique_id": 0}
            ]}
        ]}
    ]}]
    assert resolve_path(single_group, [(0, ROOT), (0, GROUP), (0, CONTENTS), (0, RECT)]) == RECT
    assert parent_chain_for_single_group(RECT) == "group"

    # An unrelated stream with ID 0 cannot satisfy a hierarchical path.
    wrong_sibling = [{"match": ROOT, "children": [{"match": "ADBE Marker", "unique_id": 0}]}]
    assert resolve_path(wrong_sibling, [(0, ROOT), (0, GROUP)]) is None

    # Root Contents rectangle is valid but has no group transform.
    root_rectangle = [{"match": ROOT, "children": [{"match": CONTENTS, "children": [{"match": RECT}]}]}]
    assert resolve_path(root_rectangle, [(0, ROOT), (0, CONTENTS), (0, RECT)]) == RECT

    nested = [{"match": ROOT, "children": [{"match": GROUP, "children": [{"match": GROUP}]}]}]
    assert resolve_path(nested, [(0, ROOT), (0, GROUP), (0, GROUP)]) == GROUP
    assert parent_chain_for_single_group(GROUP) == "fallback"

    assert resolve_path(single_group, [(1, ROOT), (0, GROUP)]) is None
    assert resolve_path(single_group, [(0, ROOT), (0, "wrong")]) is None
    assert resolve_path(single_group, [(0, ROOT), (0, GROUP), (1, CONTENTS)]) is None
    assert resolve_path(single_group, []) is None
    print("PASS: hierarchical path resolver contract")


if __name__ == "__main__":
    main()
