"""Analyze the Phase 5.13C runtime probe report without changing project files."""

from pathlib import Path


def main():
    report = Path(__file__).parent / "output" / "Phase513CValidationReport.txt"
    if not report.exists():
        print("REPORT_MISSING")
        return 1
    text = report.read_text(encoding="utf-8", errors="replace")
    expected = [
        "ADBE Vector Group",
        "ADBE Vector Transform Group",
        "ADBE Vector Anchor",
        "ADBE Vector Position",
        "ADBE Vector Scale",
        "ADBE Vector Rotation",
        "ADBE Vector Skew",
        "ADBE Vector Skew Axis",
    ]
    missing = [name for name in expected if name not in text]
    passed = "MATCH_NAME_RESULT=PASS" in text and not missing
    print("MATCH_NAMES=" + ("PASS" if passed else "FAIL"))
    if missing:
        print("MISSING=" + ", ".join(missing))
    print("PIXEL_MATRIX=REQUIRES_TEMPORARY_AEX_AND_MANUAL_RENDER")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
