"""
북맵 원문 페이지 분할 결과를 JSON으로 덤프 (번역 없이).
직접 번역할 때 원본 문단을 확인하기 위함.

사용법: python scripts/dump-source-pages.py --book {gutenberg_id}
"""
import json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from importlib import import_module

# pre-translate-by-claude.py에서 split 함수만 import
import importlib.util
spec = importlib.util.spec_from_file_location(
    "pre_translate", Path(__file__).parent / "pre-translate-by-claude.py"
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def main():
    args = sys.argv[1:]
    book_id = None
    if '--book' in args:
        book_id = int(args[args.index('--book') + 1])
    if not book_id:
        print('Usage: python scripts/dump-source-pages.py --book {id}')
        sys.exit(1)

    txt_path = mod.BOOKS_DIR / f'pg{book_id}.txt'
    text = txt_path.read_text(encoding='utf-8', errors='replace')
    pages = mod.split_into_pages(text)

    out_path = mod.TRANS_DIR / f'_source_pg{book_id}.json'
    out_path.write_text(
        json.dumps(pages, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print(f'pg{book_id}: {len(pages)} pages dumped → {out_path}')
    for i, p in enumerate(pages, 1):
        wc = sum(len(b.split()) for b in p)
        print(f'  p{i}: {len(p)} paragraphs, {wc} words')

if __name__ == '__main__':
    main()
