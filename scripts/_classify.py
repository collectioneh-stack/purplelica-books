import json, glob, os, re, importlib.util
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
spec = importlib.util.spec_from_file_location("pt", SCRIPT_DIR / "pre-translate-by-claude.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
TRANS_DIR, BOOKS_DIR = mod.TRANS_DIR, mod.BOOKS_DIR

def pnum(p): return int(re.findall(r"\d+", os.path.basename(p))[0])

aligned, needfix, abort, notxt = [], [], [], []
for d in sorted(glob.glob(str(TRANS_DIR / "pg*"))):
    bid = int(re.findall(r"\d+", os.path.basename(d))[0])
    txt = BOOKS_DIR / f"pg{bid}.txt"
    if not txt.exists():
        notxt.append(bid); continue
    pages600 = mod.split_into_pages(txt.read_text(encoding="utf-8", errors="replace"))
    eng_total = sum(len(p) for p in pages600)
    files = sorted(glob.glob(os.path.join(d, "p*.json")), key=pnum)
    ko = []
    for f in files:
        try: ko += json.load(open(f, encoding="utf-8"))
        except Exception: pass
    diff = len(ko) - eng_total
    if diff != 0:
        abort.append((bid, len(files), len(pages600), diff))
    elif len(files) == len(pages600):
        aligned.append((bid, len(files)))
    else:
        needfix.append((bid, len(files), len(pages600)))

print(f"ALIGNED ({len(aligned)}): " + " ".join(f"{b}" for b,_ in aligned))
print(f"NEEDS_FIX ({len(needfix)}): " + " ".join(f"{b}({o}->{n})" for b,o,n in needfix))
print(f"ABORT ({len(abort)}): " + " ".join(f"{b}(f{o}/p{n}/d{d})" for b,o,n,d in abort))
print(f"NO_TXT ({len(notxt)}): " + " ".join(str(b) for b in notxt))
