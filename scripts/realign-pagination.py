#!/usr/bin/env python3
"""
페이지네이션 재정렬 (재번역 비용 0)

기존 한국어 번역 문단들을 순서대로 펼친 뒤, 앱의 600단어 분할(diagnose-pagination.py
와 동일 로직)이 만드는 영어 페이지 구조에 맞춰 한국어 문단을 재분배한다.

전제: 기존 한국어 파일의 문단이 영어 블록과 1:1 순서 대응 (진단에서 ±1% 확인된 책에만 적용).

기본은 DRY-RUN: pg{id}_preview/ 폴더에 결과를 쓰고 라이브 pg{id}/ 는 건드리지 않는다.
--apply 플래그를 줘야 실제 pg{id}/ 에 덮어쓴다 (백업 자동 생성).
"""
import os, re, json, glob, sys, shutil
import importlib.util

HERE = os.path.dirname(__file__)
spec = importlib.util.spec_from_file_location("diag", os.path.join(HERE, "diagnose-pagination.py"))
diag = importlib.util.module_from_spec(spec); spec.loader.exec_module(diag)

BASE = os.path.join(HERE, '..', 'public')
BOOKS = os.path.join(BASE, 'books')
TRANS = os.path.join(BASE, 'translations')


def flatten_korean(pgid):
    """기존 한국어 파일들을 파일번호 순으로 펼쳐 평탄한 문단 리스트 반환."""
    files = sorted(glob.glob(os.path.join(TRANS, pgid, 'p*.json')),
                   key=lambda x: int(re.sub(r'\D', '', os.path.basename(x))))
    paras = []
    for f in files:
        try:
            j = json.load(open(f, encoding='utf-8'))
        except Exception:
            continue
        if isinstance(j, list):
            for s in j:
                if isinstance(s, str) and s.strip():
                    paras.append(s)
        elif isinstance(j, dict):
            ko = j.get('ko')
            if isinstance(ko, str) and ko.strip():
                paras.append(ko)
    return paras


def realign(pgid, apply=False):
    book_path = os.path.join(BOOKS, pgid + '.txt')
    text = open(book_path, encoding='utf-8', errors='replace').read()
    pages = diag.split_into_chapter_pages(text)
    eng_counts = [len(p['paragraphs']) for p in pages]
    total_eng = sum(eng_counts)

    ko = flatten_korean(pgid)
    total_ko = len(ko)

    drift = total_eng - total_ko
    print(f"[{pgid}] 앱 페이지 {len(pages)} | 영어블록 {total_eng} | 한국어문단 {total_ko} | 차이 {drift}")
    if total_eng == 0:
        print("  ⚠ 영어 블록 0 — 중단"); return False
    pct = abs(drift) / total_eng * 100
    if pct > 3:
        print(f"  ⚠ 문단 차이 {pct:.1f}% > 3% — 순차 매칭 부정확 위험. 책별 수동 검토 필요. 중단.")
        return False

    # 순차 분배: 영어 페이지 i가 k블록이면 한국어 다음 k문단 할당.
    out_dir = os.path.join(TRANS, pgid if apply else pgid + '_preview')
    cursor = 0
    new_pages = []
    for k in eng_counts:
        chunk = ko[cursor:cursor + k]
        cursor += k
        new_pages.append(chunk)
    leftover = ko[cursor:]
    if leftover:
        # 남은 문단은 마지막 페이지에 흡수
        new_pages[-1] = new_pages[-1] + leftover

    if apply:
        # 백업
        backup = os.path.join(TRANS, f"{pgid}.backup")
        if os.path.isdir(os.path.join(TRANS, pgid)) and not os.path.exists(backup):
            shutil.copytree(os.path.join(TRANS, pgid), backup)
            print(f"  백업: {backup}")
        # 기존 파일 제거 후 재작성
        for old in glob.glob(os.path.join(out_dir, 'p*.json')):
            os.remove(old)
    else:
        if os.path.isdir(out_dir):
            shutil.rmtree(out_dir)
        os.makedirs(out_dir, exist_ok=True)

    for i, chunk in enumerate(new_pages, start=1):
        with open(os.path.join(out_dir, f'p{i}.json'), 'w', encoding='utf-8') as fh:
            json.dump(chunk, fh, ensure_ascii=False, indent=0)

    print(f"  ✅ {'적용' if apply else '미리보기 생성'}: {out_dir} ({len(new_pages)} 페이지)")
    # 샘플 비교 출력 (페이지 2)
    if len(pages) >= 2 and len(new_pages) >= 2:
        eng2 = pages[1]['paragraphs'][0][:80] if pages[1]['paragraphs'] else '(빈)'
        ko2 = new_pages[1][0][:80] if new_pages[1] else '(빈)'
        print(f"  [샘플 p2] 영어: {eng2}")
        print(f"  [샘플 p2] 한글: {ko2}")
    return True


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    apply = '--apply' in sys.argv
    if not args:
        print("사용법: python3 realign-pagination.py pg1728 [pg98 ...] [--apply]")
        sys.exit(1)
    for pgid in args:
        realign(pgid, apply=apply)
        print()
