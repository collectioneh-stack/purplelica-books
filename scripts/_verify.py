import json, sys, importlib.util
from pathlib import Path
SCRIPT_DIR = Path(__file__).parent
spec = importlib.util.spec_from_file_location("pt", SCRIPT_DIR / "pre-translate-by-claude.py")
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

bid = int(sys.argv[1])
pages = mod.split_into_pages((mod.BOOKS_DIR / f"pg{bid}.txt").read_text(encoding="utf-8", errors="replace"))
print(f"pg{bid}: {len(pages)} pages\n")
for n in [2, 10, 40, len(pages)-1]:
    if n < 1 or n > len(pages): continue
    eng = pages[n-1]
    e0 = next((b for b in eng if b.strip()), "(empty/title page)")
    try:
        ko = json.load(open(mod.TRANS_DIR / f"pg{bid}" / f"p{n}.json", encoding="utf-8"))
        k0 = next((x for x in ko if str(x).strip()), "(empty)")
    except Exception as ex:
        k0 = f"(no file: {ex})"
    print(f"── p{n} ──")
    print(f"  EN: {e0[:95]}")
    print(f"  KO: {str(k0)[:95]}\n")
