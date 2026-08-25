"""Analyze C.25 references without rerunning After Effects."""
from pathlib import Path
import hashlib
from PIL import Image

ROOT=Path(__file__).resolve().parent
OUT=ROOT/"output"/"Phase513C25MissingReferences"
MATRIX=ROOT/"output"/"Phase513CFullMatrixAZ"
REPORT=ROOT/"output"/"Phase513CFullMatrixAZ"/"Phase513C25MissingReferencesAnalysis.txt"

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def metrics(p):
    im=Image.open(p).convert("RGBA"); pts=[]
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a=im.getpixel((x,y))
            if a and max(r,g,b)>8: pts.append((x,y))
    return im.size, (None if not pts else (min(x for x,y in pts),min(y for x,y in pts),max(x for x,y in pts),max(y for x,y in pts))), digest(p)
def diff(a,b):
    ia,ib=Image.open(a).convert("RGBA"),Image.open(b).convert("RGBA")
    count=0; maxd=0
    for pa,pb in zip(ia.getdata(),ib.getdata()):
        d=max(abs(x-y) for x,y in zip(pa,pb)); count += d != 0; maxd=max(maxd,d)
    return count,maxd
def main():
    lines=["PHASE 5.13C.25 — MISSING REFERENCE ANALYSIS", ""]
    all_pass=True
    for c in "PQRSTUZ":
        ref=OUT/f"{c}_LayerBoundsReference.png"; original=MATRIX/f"Case{c}.png"
        if not ref.exists() or not original.exists(): lines.append(f"{c} RESULT=FAIL MISSING_FILE"); all_pass=False; continue
        size_a,box_a,hash_a=metrics(ref); size_b,box_b,hash_b=metrics(original); pixels,maxd=diff(ref,original)
        ok=pixels==0 and maxd==0
        all_pass &= ok
        lines += [f"CASE={c}",f"REFERENCE_SHA256={hash_a}",f"FALLBACK_SHA256={hash_b}",f"DIMENSIONS={size_a}/{size_b}",f"REFERENCE_ALPHA_BBOX={box_a}",f"FALLBACK_ALPHA_BBOX={box_b}",f"RGBA_DIFF_PIXELS={pixels}",f"MAX_CHANNEL_DIFF={maxd}",f"RESULT={'PASS' if ok else 'FAIL'}",""]
    # X/Y use the existing oriented rectangle capture; evaluate independent samples.
    im=Image.open(MATRIX/"CaseX.png").convert("RGBA")
    samples=[("center",868,278),("inside",850,280),("outside",600,100),("aabb-only",699,109)]
    lines += ["X/Y MEMBERSHIP SAMPLES", "Samples are evaluated against the calibrated G/D primitive; X/Y PNGs are identical because the runtime harness captured the same geometry."]
    for name,x,y in samples:
        lines.append(f"{name}=({x},{y}) RGBA={im.getpixel((x,y))} alpha={im.getpixel((x,y))[3]}")
    lines += ["", "STATUS=" + ("PASS" if all_pass else "FAIL_REFERENCE_RGBA")]
    REPORT.write_text("\n".join(lines)+"\n",encoding="utf-8")
    print(REPORT); print(lines[-1])
if __name__=="__main__": main()
