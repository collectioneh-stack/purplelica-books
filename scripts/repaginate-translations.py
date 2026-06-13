"""
북맵 번역 재분배 (re-pagination) — 재번역 0원.

배경: 앱(app/book/[id]/page.tsx)은 600단어/페이지로 분할하는데, 과거 번역 파이프라인은
1200단어/페이지로 JSON을 만들어 페이지 번호가 어긋났다. 기존 한국어 번역의 '문단 순서'는
영어 블록 순서와 1:1로 살아있으므로, 동일 분할 알고리즘으로 600w 페이지에 다시 나눠 담으면
재번역 없이 정렬을 복구할 수 있다.

전제조건(안전장치): 기존 번역 한국어 문단 총수 == 600w 분할의 영어 블록 총수.
불일치하면 ABORT(해당 책은 재번역/수동 처리 대상). 빈 문단이 섞여 있어도 총수가 맞으면 진행.

사용법:
  python scripts/repaginate-translations.py --book 2554 --dry-run
  python scripts/repaginate-translations.py --book 2554 --apply
"""
import json, glob, os, re, sys, importlib.util
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
spec = importlib.util.spec_from_file_location("pt", SCRIPT_DIR / "pre-translate-by-claude.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

TRANS_DIR = mod.TRANS_DIR
BOOKS_DIR = mod.BOOKS_DIR


def pnum(p):
    return int(re.findall(r"\d+", os.path.basename(p))[0])


def repaginate(book_id: int, apply: bool):
    txt_path = BOOKS_DIR / f"pg{book_id}.txt"
    if not txt_path.exists():
        print(f"pg{book_id}: txt 없음 — SKIP")
        return "no_txt"

    txt = txt_path.read_text(encoding="utf-8", errors="replace")
    pages600 = mod.split_into_pages(txt)            # 목표: 600w 페이지(블록 리스트)
    eng_total = sum(len(p) for p in pages600)

    book_dir = TRANS_DIR / f"pg{book_id}"
    files = sorted(glob.glob(str(book_dir / "p*.json")), key=pnum)
    ko_all = []
    for f in files:
        try:
            ko_all += json.load(open(f, encoding="utf-8"))
        except Exception:
            pass

    diff = len(ko_all) - eng_total
    print(f"pg{book_id}: 600w_pages={len(pages600)} eng_blocks={eng_total} "
          f"old_files={len(files)} ko_paras={len(ko_all)} diff={diff}")

    if diff != 0:
        print(f"  ✗ ABORT — 문단 총수 불일치(diff={diff}). 재번역/수동 처리 대상.")
        return "abort_diff"

    # 600w 페이지 경계로 한국어 재분배
    new_pages = []
    off = 0
    for page in pages600:
        n = len(page)
        new_pages.append(ko_all[off:off + n])
        off += n

    # 검증: 새 페이지 수만큼 분배됐는지
    assert sum(len(p) for p in new_pages) == eng_total

    if not apply:
        # dry-run: 첫 페이지 정렬 샘플만 보여줌
        sample_eng = pages600[1][0][:70] if len(pages600) > 1 and pages600[1] else ""
        sample_ko = new_pages[1][0][:70] if len(new_pages) > 1 and new_pages[1] else ""
        print(f"  [dry-run] new p2 영어: {sample_eng}")
        print(f"  [dry-run] new p2 한글: {sample_ko}")
        print(f"  [dry-run] 적용 시: {len(files)}개 → {len(new_pages)}개 파일")
        return "dry_ok"

    # 기존 파일 전부 삭제 후 재작성 (페이지 수가 늘어나므로 stale 제거 필수)
    for f in files:
        os.remove(f)
    for i, paras in enumerate(new_pages, 1):
        (book_dir / f"p{i}.json").write_text(
            json.dumps(paras, ensure_ascii=False), encoding="utf-8")
    print(f"  ✓ APPLIED — {len(new_pages)}개 파일 재작성")
    return "applied"


def main():
    args = sys.argv[1:]
    apply = "--apply" in args
    if "--book" in args:
        book_id = int(args[args.index("--book") + 1])
        repaginate(book_id, apply)
    else:
        print("Usage: python scripts/repaginate-translations.py --book {id} [--apply]")
        sys.exit(1)


if __name__ == "__main__":
    main()
