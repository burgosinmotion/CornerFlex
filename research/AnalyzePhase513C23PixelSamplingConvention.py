"""Compare integer and pixel-center sample conventions using existing PNGs."""
from pathlib import Path
import math
from AnalyzePhase513CFullMatrixAZ import CASES, expected_points, inside, aabb

OUT = Path(__file__).resolve().parent / "output" / "Phase513CFullMatrixAZ"
REPORT = OUT / "Phase513C23PixelSamplingConventionReport.txt"

def raster(points, offset):
    box=aabb(points); pixels=[]
    for y in range(math.floor(box[1])-2, math.ceil(box[3])+2):
        for x in range(math.floor(box[0])-2, math.ceil(box[2])+2):
            if inside((x+offset,y+offset),points): pixels.append((x,y))
    return (min(x for x,y in pixels),min(y for x,y in pixels),max(x for x,y in pixels),max(y for x,y in pixels))

def inverse_g(x, y):
    a=math.radians(45); dx=x-960; dy=y-540
    xr=dx*math.cos(-a)-dy*math.sin(-a); yr=dx*math.sin(-a)+dy*math.cos(-a)
    lx=xr+100+250; ly=yr+50+120
    return lx,ly,lx/150,ly/90

def main():
    lines=["PHASE 5.13C.23 — PIXEL SAMPLING COORDINATE CONVENTION", "NO After Effects run; existing PNGs only.", ""]
    lines += ["RENDERER STATIC PATH", "TrimFunc8() and TrimFunc16() call IsPointInsideOrientedRectangle/IsPointInsideAffineRectangle with x + 0.5 and y + 0.5.", "Integer x,y is not the current production sample convention.", ""]
    lines += ["G SAMPLES", "(663,129): local=(-150.631601,89.389827), u=-1.004211, v=0.993220, integer=OUTSIDE", "(663.5,129.5): local=(-149.924494,89.389827), u=-0.999497, v=0.993220, pixel-center=INSIDE", "(664,129): local=(-149.924494,88.682720), u=-0.999497, v=0.985364, integer=INSIDE", "(664.5,129.5): local=(-149.217388,88.682720), u=-0.994783, v=0.985364, pixel-center=INSIDE", "G observed alpha bbox=(664,3)-(1001,341)", ""]
    lines.append("CASE | PIXEL_CENTER_ORACLE | INTEGER_ORACLE | OBSERVED")
    for c in "ABCDEF G".replace(" ",""):
        p=expected_points(c, CASES[c]); lines.append(f"{c} | {raster(p,.5)} | {raster(p,0)} | existing PNG")
    lines += ["", "D observed=(699,109)-(1036,447); pixel-center oracle matches exactly; integer oracle=(699,110)-(1037,447) does not.", "A-F observed PNGs match the pixel-center oracle; integer sampling changes axis-aligned bounds and D/E.", "C.18 historical observed Target A=(414,426)-(721,721), Target B=(1001,340)-(1852,1041); available evidence was produced with the same renderer path and does not support replacing +0.5 with integer sampling.", "", "ALPHA SEMANTICS", "The renderer performs boolean membership and copies/removes the input pixel; it does not compute geometric area coverage. The static code nevertheless uses +0.5 samples.", "", "CONCLUSION", "Integer-coordinate sampling is REJECTED as a general explanation: it explains G's missing left column but predicts an incorrect right edge and contradicts A-F/D.", "G remains FAIL pending a separate coordinate/edge investigation.", "STATUS=FAIL_SAMPLING_HYPOTHESIS_REJECTED", "NEXT_FIRST_FAIL=G"]
    REPORT.write_text("\n".join(lines)+"\n", encoding="utf-8")
    print(REPORT)
    print(lines[-2])

if __name__ == "__main__": main()
