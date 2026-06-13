import json, os, sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
TR = ROOT / "public" / "translations"

for bid in sys.argv[1:]:
    src_path = TR / f"_source_pg{bid}.json"
    if not src_path.exists():
        print(f"pg{bid}: NO SOURCE ({src_path.name})")
        continue
    src = json.load(open(src_path, encoding="utf-8"))
    empty, mismatch, ok = [], [], 0
    for i in range(1, len(src) + 1):
        p = TR / f"pg{bid}" / f"p{i}.json"
        if not p.exists():
            empty.append(i); continue
        arr = json.load(open(p, encoding="utf-8"))
        if not any(isinstance(s, str) and s.strip() for s in arr):
            empty.append(i)
        elif len(arr) != len(src[i - 1]):
            mismatch.append(i)
        else:
            ok += 1
    todo = sorted(set(empty + mismatch))
    print(f"pg{bid}: ok={ok}/{len(src)}  empty={len(empty)}  mismatch={len(mismatch)}")
    if todo:
        print(f"  TODO pages ({len(todo)}): {','.join(map(str, todo))}")
