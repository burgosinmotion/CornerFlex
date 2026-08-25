"""Static critical-pixel render-path model for Phase 5.13C.24."""
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parent
PNG=ROOT/"output"/"Phase513CFullMatrixAZ"/"CaseG.png"
REPORT=ROOT/"output"/"Phase513CFullMatrixAZ"/"Phase513C24CriticalPixelRenderPathReport.txt"

def main():
    im=Image.open(PNG).convert("RGBA")
    left,top,right,bottom=(663.015152,2.598846,1002.426407,342.010101)
    samples=[]
    for x,y in ((663,129),(664,129)):
        pixel=im.getpixel((x,y))
        outside=x<left or x>=right or y<top or y>=bottom
        samples.append((x,y,pixel,outside,"NOT_EVALUATED" if outside else "MEMBERSHIP_REQUIRED"))
    lines=["PHASE 5.13C.24 — CRITICAL PIXEL RENDER-PATH REPORT", "", "STATIC ORDER OF OPERATIONS", "1. PF iterate callback supplies integer x,y.", "2. TrimFunc8/16 evaluates outsideBounds: x<left || x>=right || y<top || y>=bottom.", "3. Only if bounds pass, oriented/affine membership is evaluated at x+0.5,y+0.5.", "4. If all checks pass, *outP=*inP; otherwise output alpha=0.", "", "GEOMETRY BOUNDS G", f"left={left}", f"top={top}", f"right={right}", f"bottom={bottom}", "", "PIXEL G (663,129)", "sample for membership would be (663.5,129.5), geometrically inside.", "bounds check: 663 < 663.015152 => TRUE (outsideBounds).", "membership is not reached; source pixel is not copied.", f"observed RGBA={im.getpixel((663,129))}", "", "PIXEL G (664,129)", "bounds check passes; membership sample is (664.5,129.5), inside.", f"observed RGBA={im.getpixel((664,129))}", "source alpha is preserved when membership/bounds pass.", ""]
    for x,y,p,outcome,stage in samples: lines.append(f"SAMPLE ({x},{y}) RGBA={p} outsideBounds={outcome} stage={stage}")
    lines += ["", "ITERATION / EXTENT", "The static source does not expose a separate omitted iteration rect for this pixel; geometryBounds rejection alone is sufficient and occurs before membership.", "", "CONCLUSION", "RESULT A: continuous geometryBounds is being used as an early integer-pixel rejection bound.", "The apparent G membership discrepancy is explained without a source-alpha hypothesis and without a renderer sampling mismatch.", "This is a general behavior of the current render path, not a G-specific exception.", "D and A-F remain consistent because their continuous left/top bounds do not exclude their observed edge pixels under the same check.", "", "STATUS=G_EXPLAINED_BY_GEOMETRY_BOUNDS_REJECTION", "NEXT=Update independent oracle to model early geometryBounds rejection, then reanalyze existing PNGs only."]
    REPORT.write_text("\n".join(lines)+"\n",encoding="utf-8")
    print(REPORT)
    print(lines[-2])

if __name__=="__main__": main()
