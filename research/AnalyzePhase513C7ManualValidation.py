"""Analyze C7 report and, when Pillow is available, compare rendered frames."""

from pathlib import Path
import hashlib


ROOT = Path(__file__).parent / "output" / "Phase513C7ManualValidation"


def image_summary(path: Path):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    try:
        from PIL import Image
    except ImportError:
        return f"{path.name}: bytes={path.stat().st_size} sha256={digest} PIL=unavailable"
    with Image.open(path) as image:
        rgba = image.convert("RGBA")
        alpha = rgba.getchannel("A")
        bbox = alpha.getbbox()
        return f"{path.name}: size={rgba.size} alpha_bbox={bbox} sha256={digest}"


def main() -> int:
    report = ROOT / "Phase513C7ManualValidationReport.txt"
    if not report.exists():
        print("PHASE 5.13C.7: REPORT_NOT_FOUND")
        return 1
    print(report.read_text(encoding="utf-8"))
    for name in ("LayerBoundsReference.png", "TargetA.png", "TargetB.png", "Fallback.png"):
        path = ROOT / name
        if path.exists():
            print(image_summary(path))
        else:
            print(f"{name}: MISSING")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
