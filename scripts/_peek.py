import json, sys
from pathlib import Path
TR = Path(__file__).parent.parent / "public" / "translations"

bid, page = sys.argv[1], int(sys.argv[2])
src = json.load(open(TR / f"_source_pg{bid}.json", encoding="utf-8"))
sp = src[page - 1]
p = TR / f"pg{bid}" / f"p{page}.json"
print(f"pg{bid} p{page}: source paragraphs={len(sp)}")
print("  SRC[0]:", (sp[0] if sp else "")[:90])
if p.exists():
    arr = json.load(open(p, encoding="utf-8"))
    print(f"  trans paragraphs={len(arr)}")
    print("  KO[0]:", (str(arr[0]) if arr else "")[:90])
else:
    print("  (no translation file)")
