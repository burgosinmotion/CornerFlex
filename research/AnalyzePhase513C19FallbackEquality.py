"""Independent pixel comparison helper for Phase 5.13C.19."""
from pathlib import Path


def compare_rgba(reference, candidate):
    if reference.size != candidate.size:
        return None
    differing = 0
    max_delta = 0
    for a, b in zip(reference.getdata(), candidate.getdata()):
        delta = max(abs(int(x) - int(y)) for x, y in zip(a, b))
        max_delta = max(max_delta, delta)
        differing += int(delta != 0)
    return differing, max_delta


def main():
    output = Path(__file__).parent / "output" / "Phase513C19FallbackEquality"
    print("Compare LayerBoundsReference.png vs Fallback.png")
    print("Compare LayerBoundsReference.png vs RectangleSource.png")
    print("PNG analysis requires an available Python image runtime.")
    print("Expected: fallback diff = 0; rectangle source diff > 0.")


if __name__ == "__main__":
    main()
