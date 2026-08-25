"""Static report checks for the Phase 5.13C.6 functional harness."""

from pathlib import Path


def main() -> int:
    report = Path(__file__).parent / "output" / "Phase513C6FunctionalIdentityReport.txt"
    if not report.exists():
        print("PHASE 5.13C.6 ANALYSIS: NO REPORT")
        return 1
    text = report.read_text(encoding="utf-8")
    required = ("TargetA CAPTURE=", "TargetB CAPTURE=", "TargetA RENDER_COMPLETED", "TargetB RENDER_COMPLETED")
    missing = [marker for marker in required if marker not in text]
    if missing:
        print("PHASE 5.13C.6 ANALYSIS: INCOMPLETE", ", ".join(missing))
        return 1
    print("PHASE 5.13C.6 ANALYSIS: HARNESS COMPLETE; PIXEL ORACLE REQUIRED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
