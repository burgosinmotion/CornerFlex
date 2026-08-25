"""Independent visual analysis for existing Phase 5.13C A-Z captures."""
from __future__ import annotations
import hashlib, math
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output" / "Phase513CFullMatrixAZ"
REPORT = OUT / "Phase513CFullMatrixAZIndependentAnalysis.txt"
EXEC_REPORT = OUT / "Phase513CFullMatrixAZReport.txt"
COMP = (1920, 1080)

CASES = {
"A":((300,180),(0,0),(100,100),0,(0,0,0,0),"Rectangle Source"),
"B":((300,180),(-250,-120),(100,100),0,(0,0,0,0),"Rectangle Source"),
"C":((300,180),(-250,-120),(150,150),0,(0,0,0,0),"Rectangle Source"),
"D":((300,180),(-250,-120),(100,100),45,(0,0,0,0),"Rectangle Source"),
"E":((300,180),(-250,-120),(100,100),-45,(0,0,0,0),"Rectangle Source"),
"F":((300,180),(-250,-120),(150,75),45,(0,0,0,0),"Rectangle Source"),
"G":((300,180),(-250,-120),(100,100),45,(0,0,0,0),"Rectangle Source"),
"H":((300,180),(-250,-120),(100,100),45,(0,0,0,0),"Rectangle Source"),
"I":((300,180),(220,140),(100,100),45,(0,0,0,0),"Rectangle Source"),
"J":((300,180),(-250,-120),(100,100),0,(0,0,0,0),"Rectangle Source"),
"K":((300,180),(-250,-120),(100,100),0,(0,0,0,0),"Rectangle Source"),
"L":((300,180),(-250,-120),(100,100),0,(0,0,0,0),"Rectangle Source"),
"M":((300,180),(-250,-120),(100,100),0,(0,0,0,0),"Rectangle Source"),
"N":((300,180),(-250,-120),(100,100),0,(10,10,10,10),"Rectangle Source"),
"O":((300,180),(-250,-120),(100,100),0,(10,20,30,40),"Rectangle Source"),
"P":((300,180),(-250,-120),(100,100),0,(0,0,0,0),"Layer Bounds"),
"Q":((300,180),(-250,-120),(100,100),0,(0,0,0,0),"Layer Bounds"),
"R":((300,180),(-250,-120),(100,100),0,(0,0,0,0),"Layer Bounds"),
"S":((300,180),(-250,-120),(100,100),0,(0,0,0,0),"Layer Bounds"),
"T":((300,180),(-250,-120),(0,0),0,(0,0,0,0),"Layer Bounds"),
"U":((300,180),(-250,-120),(-100,100),0,(0,0,0,0),"Layer Bounds"),
"V":((300,180),(-250,-120),(100,100),0,(0,0,0,0),"Rectangle Source"),
"W":((640,360),(220,140),(100,100),0,(0,0,0,0),"Rectangle Source"),
"X":((300,180),(-250,-120),(100,100),45,(0,0,0,0),"Rectangle Source"),
"Y":((300,180),(-250,-120),(100,100),45,(0,0,0,0),"Rectangle Source"),
"Z":((300,180),(-250,-120),(100,100),0,(0,0,0,0),"Layer Bounds"),
}
EXTRAS = {"G": {"anchor": (100,50)}, "H": {"layer_pos": (1200,700)}}
C25_REPORT = OUT / "Phase513C25MissingReferencesAnalysis.txt"

def digest(path):
    h=hashlib.sha256(); h.update(path.read_bytes()); return h.hexdigest()

def expected_points(case_id, spec, time=0):
    (w,h), (cx,cy), (sx,sy), rot, trim, _ = spec
    l,t,r,b=trim; w*=1-(l+r)/100; h*=1-(t+b)/100
    cx+=(l-r)*spec[0][0]/200; cy+=(t-b)*spec[0][1]/200
    if time and case_id == "J": sx=sy=100+50*time
    if time and case_id == "K": rot=45*time
    if time and case_id == "L": sx=sy=100+50*time
    extra=EXTRAS.get(case_id, {})
    ax,ay=extra.get("anchor", (0,0)); layer_x,layer_y=extra.get("layer_pos", (COMP[0]/2,COMP[1]/2))
    a=math.radians(rot); out=[]
    for x,y in ((-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2)):
        x=(x+cx-ax)*sx/100; y=(y+cy-ay)*sy/100
        out.append((x*math.cos(a)-y*math.sin(a)+layer_x,
                    x*math.sin(a)+y*math.cos(a)+layer_y))
    return out

def aabb(points):
    return tuple(round(v,2) for v in (min(p[0] for p in points),min(p[1] for p in points),max(p[0] for p in points),max(p[1] for p in points)))

def inside(point, points):
    signs=[]
    for i,p in enumerate(points):
        q=points[(i+1)%len(points)]
        cross=(q[0]-p[0])*(point[1]-p[1])-(q[1]-p[1])*(point[0]-p[0])
        if abs(cross)>1e-9: signs.append(cross>0)
    return not signs or all(v==signs[0] for v in signs)

def raster_bbox(points):
    """Model TrimFunc bounds rejection, then center-sample membership."""
    lo=aabb(points); covered=[]
    for y in range(math.floor(lo[1])-1, math.ceil(lo[3])+1):
        for x in range(math.floor(lo[0])-1, math.ceil(lo[2])+1):
            if x < lo[0] or x >= lo[2] or y < lo[1] or y >= lo[3]: continue
            if inside((x+0.5,y+0.5),points): covered.append((x,y))
    return None if not covered else (min(x for x,y in covered),min(y for x,y in covered),max(x for x,y in covered),max(y for x,y in covered))

def metrics(path):
    im=Image.open(path).convert("RGBA"); visible=[]; opaque=0
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a=im.getpixel((x,y))
            if a and max(r,g,b)>8: visible.append((x,y))
            if a>=250 and max(r,g,b)>8: opaque+=1
    box=None if not visible else (min(x for x,y in visible),min(y for x,y in visible),max(x for x,y in visible),max(y for x,y in visible))
    center=None if box is None else ((box[0]+box[2])/2,(box[1]+box[3])/2)
    return im.size,box,opaque,center,digest(path)

def c25_reference_status(case):
    """Return exact RGBA comparison status produced by the C.25 harness."""
    if not C25_REPORT.exists():
        return "UNVERIFIED"
    text=C25_REPORT.read_text(encoding="utf-8")
    marker=f"CASE={case}"
    start=text.find(marker)
    if start < 0:
        return "UNVERIFIED"
    end=text.find("CASE=", start+len(marker))
    block=text[start:] if end < 0 else text[start:end]
    return "PASS" if "RGBA_DIFF_PIXELS=0" in block and "MAX_CHANNEL_DIFF=0" in block and "RESULT=PASS" in block else "FAIL"

def xy_membership_status():
    """Check center/inside/outside/AABB-only samples against the C.24 oracle."""
    path=OUT/"CaseX.png"
    if not path.exists():
        return "UNVERIFIED", []
    im=Image.open(path).convert("RGBA")
    points=expected_points("D", CASES["D"])
    lo=aabb(points)
    samples=[("center",868,278,True),("inside",850,280,True),("outside",600,100,False),("aabb-only",699,109,False)]
    details=[]; ok=True
    for name,x,y,expected in samples:
        actual=im.getpixel((x,y))[3] > 0
        early=not (x < lo[0] or x >= lo[2] or y < lo[1] or y >= lo[3])
        membership=inside((x+0.5,y+0.5),points) if early else False
        sample_ok=(membership == expected and actual == membership)
        ok &= sample_ok
        details.append((name,x,y,expected,early,membership,im.getpixel((x,y)),sample_ok))
    return ("PASS" if ok else "FAIL"), details

def main():
    lines=["PHASE 5.13C.20 — FULL MATRIX INDEPENDENT VISUAL ANALYSIS","STOP_ON_FIRST_ANALYSIS_FAIL=True",""]
    summary=["CASE | CATEGORY | EXPECTED | OBSERVED | AABB | RGBA | MEMBERSHIP | RESULT"]
    first=None
    fallback_status={case:c25_reference_status(case) for case in "PQRSTUZ"}
    xy_status,xy_details=xy_membership_status()
    for case,spec in CASES.items():
        files=[OUT/f"Case{case}.png"]+[OUT/f"Case{case}_T{x}.png" for x in ("0.5","1") if (OUT/f"Case{case}_T{x}.png").exists()]
        result="PASS" if spec[-1]=="Rectangle Source" else fallback_status.get(case,"UNVERIFIED")
        for path in files:
            if not path.exists(): result="FAIL"; lines.append(f"CASE={case} FRAME={path.name} RESULT=FAIL MISSING_PNG"); first=first or case; break
            frame=path.stem.replace(f"Case{case}","") or "T0"; time=0.5 if frame=="_T0.5" else 1 if frame=="_T1" else 0
            dims,obs,opaque,center,h=metrics(path); points=expected_points(case,spec,time); continuous=aabb(points); expRaster=raster_bbox(points); delta=None if obs is None else tuple(round(obs[i]-expRaster[i],2) for i in range(4))
            geometry=(obs is not None and obs==expRaster)
            if spec[-1]=="Rectangle Source" and not geometry: result="FAIL"; first=first or case
            rgba=fallback_status.get(case,"UNVERIFIED") if spec[-1]=="Layer Bounds" else "N/A"
            membership=xy_status if case in ("X","Y") else "N/A"
            case_result="FAIL" if result=="FAIL" else result
            lines += [f"CASE={case}",f"FRAME={frame}",f"EXPECTED_SOURCE={spec[-1]}",f"GEOMETRIC_AABB={continuous}",f"EXPECTED_RASTER_AABB={expRaster}",f"OBSERVED_AABB={obs}",f"EDGE_DELTA={delta}",f"IMAGE_DIMENSIONS={dims}",f"OPAQUE_PIXELS={opaque}",f"ALPHA_CENTER={center}",f"SHA256={h}",f"RGBA_DIFF_PIXELS={rgba}",f"MEMBERSHIP={membership}",f"RESULT={case_result}",""]
        if result=="FAIL": first=first or case
        summary.append(f"{case} | {'fallback' if spec[-1]=='Layer Bounds' else 'source'} | {spec[-1]} | {spec[-1]} | {result} | {fallback_status.get(case,'N/A') if spec[-1]=='Layer Bounds' else 'N/A'} | {xy_status if case in ('X','Y') else 'N/A'} | {result}")
        if first: break
    lines += ["","C.25 EXACT FALLBACK REFERENCE RESULTS"]
    for case in "PQRSTUZ": lines.append(f"CASE={case} RGBA_REFERENCE_RESULT={fallback_status[case]}")
    lines += ["","X/Y INDEPENDENT MEMBERSHIP SAMPLES"]
    for name,x,y,expected,early,membership,pixel,sample_ok in xy_details:
        lines.append(f"{name}=({x},{y}) expected={expected} earlyBounds={early} membership={membership} RGBA={pixel} result={'PASS' if sample_ok else 'FAIL'}")
    lines += [f"X_Y_MEMBERSHIP_RESULT={xy_status}","",*summary,""]
    if first: lines.append(f"STATUS=FAIL FIRST_ANALYSIS_FAILURE={first}")
    elif any("RESULT=FAIL" in x or "result=FAIL" in x for x in lines): lines.append("STATUS=FAIL")
    elif any("UNVERIFIED" in x for x in lines): lines.append("STATUS=INCOMPLETE_UNVERIFIED_REFERENCES")
    else: lines.append("STATUS=PASS")
    REPORT.write_text("\n".join(lines)+"\n",encoding="utf-8")
    print(f"REPORT={REPORT}"); print(lines[-1])

if __name__=="__main__": main()
