import json, glob, os, re, importlib.util
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
spec = importlib.util.spec_from_file_location("pt", SCRIPT_DIR / "pre-translate-by-claude.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
TRANS_DIR, BOOKS_DIR = mod.TRANS_DIR, mod.BOOKS_DIR

def pnum(p): return int(re.findall(r"\d+", os.path.basename(p))[0])

ABORT = [103,105,1064,1080,11,1260,1317,132,1322,1342,135,139,1399,1404,141,1497,158,16,1661,1728,1934,1952,219,23,2500,2542,2701,2852,345,36,3825,4085,41,43,4300,4363,45,46,5200,526,55,5765,61,6130,721,76,84,98]

neg=pos=0; empties=0
rows=[]
for bid in ABORT:
    txt = BOOKS_DIR / f"pg{bid}.txt"
    pages600 = mod.split_into_pages(txt.read_text(encoding="utf-8", errors="replace"))
    eng_total = sum(len(p) for p in pages600)
    files = sorted(glob.glob(str(TRANS_DIR / f"pg{bid}" / "p*.json")), key=pnum)
    nums = [pnum(f) for f in files]
    # contiguity: are page numbers 1..max contiguous?
    maxn = max(nums) if nums else 0
    gaps = sorted(set(range(1,maxn+1)) - set(nums))
    ko=[]; empty_files=0
    for f in files:
        try:
            d=json.load(open(f,encoding="utf-8"))
            ko+=d
            if not d or all((not str(x).strip()) for x in d): empty_files+=1
        except Exception: pass
    diff = len(ko)-eng_total
    if diff<0: neg+=1
    else: pos+=1
    rows.append((bid,len(files),maxn,len(gaps),empty_files,eng_total,len(ko),diff))

print(f"{'book':>6} {'files':>5} {'maxp':>5} {'gaps':>4} {'empty':>5} {'engBlk':>6} {'koPara':>6} {'diff':>6}")
for r in sorted(rows, key=lambda x:x[7]):
    print(f"{r[0]:>6} {r[1]:>5} {r[2]:>5} {r[3]:>4} {r[4]:>5} {r[5]:>6} {r[6]:>6} {r[7]:>6}")
print(f"\nneg(koba<eng,missing) = {neg}   pos(ko>eng) = {pos}")
