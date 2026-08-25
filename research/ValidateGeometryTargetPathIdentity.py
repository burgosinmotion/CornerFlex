"""Pure validation of the Phase 5.13C.1 hierarchical target-path contract."""

import json

MAX_DEPTH = 8
TOKENS = {1: "ADBE Root Vectors Group", 2: "ADBE Vector Group", 3: "ADBE Vectors Group", 4: "ADBE Vector Shape - Rect"}


def validate(path):
    if path.get("version") != 1 or not path.get("valid"):
        return False
    segments = path.get("segments", [])
    if not 2 <= len(segments) <= MAX_DEPTH:
        return False
    if path.get("layerId", 0) <= 0:
        return False
    if segments[0] != {"propertyIndex": 0, "token": 1}:
        return False
    if segments[-1]["token"] != 4:
        return False
    for i, segment in enumerate(segments):
        if segment.get("token") not in TOKENS:
            return False
        if i and (segment.get("propertyIndex", 0) < 1):
            return False
    for previous, current in zip(segments[1:], segments[2:]):
        if previous["token"] == 2 and current["token"] != 3:
            return False
        if previous["token"] == 3 and current["token"] not in (2, 4):
            return False
    return True


def main():
    good = {
        "version": 1,
        "valid": True,
        "layerId": 42,
        "segments": [
            {"propertyIndex": 0, "token": 1},
            {"propertyIndex": 2, "token": 2},
            {"propertyIndex": 1, "token": 3},
            {"propertyIndex": 1, "token": 4},
        ],
    }
    cases = {
        "correct path": good,
        "version mismatch": dict(good, version=2),
        "count overflow": dict(good, segments=good["segments"] * 3),
        "index invalid": dict(good, segments=[good["segments"][0], {"propertyIndex": 0, "token": 2}]),
        "token invalid": dict(good, segments=[good["segments"][0], {"propertyIndex": 2, "token": 99}]),
        "hierarchy mismatch": dict(good, segments=[good["segments"][0], {"propertyIndex": 2, "token": 2}, {"propertyIndex": 1, "token": 4}]),
        "missing group": dict(good, segments=[good["segments"][0], {"propertyIndex": 1, "token": 2}, {"propertyIndex": 1, "token": 4}]),
        "reordered group": dict(good, segments=[good["segments"][0], {"propertyIndex": 1, "token": 3}, {"propertyIndex": 3, "token": 2}, {"propertyIndex": 1, "token": 4}]),
    }
    for name, path in cases.items():
        expected = name == "correct path"
        actual = validate(json.loads(json.dumps(path)))
        print(f"{name}: {'PASS' if actual == expected else 'FAIL'}")
    result = all(validate(path) == (name == "correct path") for name, path in cases.items())
    print(f"PHASE 5.13C.1 PURE RESULT: {'PASS' if result else 'FAIL'}")
    return 0 if result else 1


if __name__ == "__main__":
    raise SystemExit(main())
