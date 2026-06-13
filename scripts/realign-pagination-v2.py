#!/usr/bin/env python3
"""
페이지네이션 재정렬 v2 — source 정답지 앵커 기반 (재번역 비용 0)

v1(realign-pagination.py)의 실패 교훈(L007): 한국어 문단을 앱 영어 카운트에
'순차 추측'으로 재분배 → 서문·목차 구간 국소 병합/분할로 누적 오프셋 발생.

v2 핵심: _source_pg{id}.json 이 옛 분할의 영어 블록 순서(정답지)를 보관.
번역 파이프라인이 영어 블록당 한국어를 1:1 생성했으므로
  flat_eng[i]  (source 평탄화)  ==  flat_ko[i]  (p*.json 평탄화)
가 위치별로 성립한다(진단에서 100% 확인된 책 = Tier A).

앱은 같은 원문을 600단어로 재분할한다. 앱 블록은 flat_eng 와 동일 텍스트·동일
순서이므로, 앱 블록을 flat_eng 에 텍스트 매칭(추측 아님)으로 정렬한 뒤
대응하는 flat_ko 를 앱 페이지 경계에 그대로 재배치한다.

게이트(L007): 앱 블록이 flat_eng 와 100% 매칭되지 않거나
flat_eng 길이 != flat_ko 길이면 → 중단. 추측 금지.

기본 DRY-RUN: pg{id}_preview/ 에 쓰고 라이브는 안 건드림.
--apply 로 라이브 덮어쓰기(백업 자동 pg{id}.backup).
"""
import os, re, json, glob, sys, shutil
import importlib.util

HERE = os.path.dirname(__file__)
spec = importlib.util.spec_from_file_location("diag", os.path.join(HERE, "diagnose-pagination.py"))
diag = importlib.util.module_from_spec(spec); spec.loader.exec_module(diag)

BASE = os.path.join(HERE, '..', 'public')
BOOKS = os.path.join(BASE, 'books')
TRANS = os.path.join(BASE, 'translations')


def norm(s):
    return ' '.join(s.split()).strip()


def flatten_source(pgid):
    """_source_pg{id}.json (옛 페이지별 영어 블록 리스트) → 평탄 영어 블록."""
    sp = os.path.join(TRANS, f'_source_{pgid}.json')
    if not os.path.exists(sp):
        return None
    src = json.load(open(sp, encoding='utf-8'))
    out = []
    for page in src:
        if isinstance(page, list):
            out += [b for b in page if isinstance(b, str)]
    return out


def flatten_korean(pgid):
    """p*.json 파일번호 순 평탄화."""
    files = sorted(glob.glob(os.path.join(TRANS, pgid, 'p*.json')),
                   key=lambda x: int(re.sub(r'\D', '', os.path.basename(x))))
    paras = []
    for f in files:
        try:
            j = json.load(open(f, encoding='utf-8'))
        except Exception:
            continue
        if isinstance(j, list):
            paras += [s for s in j if isinstance(s, str)]
    return paras


def realign(pgid, apply=False):
    book_path = os.path.join(BOOKS, pgid + '.txt')
    if not os.path.exists(book_path):
        print(f"[{pgid}] ⚠ 원본 텍스트 없음 — 중단"); return False

    flat_eng = flatten_source(pgid)
    if flat_eng is None:
        print(f"[{pgid}] ⚠ _source 정답지 없음 — v2 적용 불가(수동건). 중단"); return False
    flat_ko = flatten_korean(pgid)

    if len(flat_eng) != len(flat_ko):
        print(f"[{pgid}] ⚠ 영어블록 {len(flat_eng)} != 한국어문단 {len(flat_ko)} "
              f"→ 1:1 정합 깨짐(번역 미완/병합). v2 게이트 차단. 중단")
        return False
    if len(flat_eng) == 0:
        print(f"[{pgid}] ⚠ 영어 블록 0 — 중단"); return False

    text = open(book_path, encoding='utf-8', errors='replace').read()
    pages = diag.split_into_chapter_pages(text)
    app_blocks = [b for p in pages for b in p['paragraphs']]

    # 게이트: 앱 블록을 flat_eng 에 텍스트 매칭(순차 커서, 추측 아님)
    norm_eng = [norm(e) for e in flat_eng]
    ko_for_app = []          # 앱 블록 i 에 대응하는 한국어
    cursor = 0
    miss = 0
    for b in app_blocks:
        nb = norm(b)
        if cursor < len(norm_eng) and norm_eng[cursor] == nb:
            ko_for_app.append(flat_ko[cursor]); cursor += 1
        else:
            # 작은 창에서 재동기(드물게 분할 차이) — 없으면 미스
            found = -1
            for j in range(cursor, min(cursor + 5, len(norm_eng))):
                if norm_eng[j] == nb:
                    found = j; break
            if found >= 0:
                ko_for_app.append(flat_ko[found]); cursor = found + 1
            else:
                ko_for_app.append(''); miss += 1

    match_rate = (len(app_blocks) - miss) / len(app_blocks) * 100 if app_blocks else 0
    print(f"[{pgid}] 앱페이지 {len(pages)} | 앱블록 {len(app_blocks)} | "
          f"src/ko {len(flat_eng)} | 블록매칭 {match_rate:.1f}%")
    if match_rate < 99.5:
        print(f"  ⚠ 블록 매칭 {match_rate:.1f}% < 99.5% — 정렬 불확실. 게이트 차단. 중단")
        return False

    # 앱 페이지 경계로 한국어 재그룹
    new_pages = []
    bi = 0
    for p in pages:
        k = len(p['paragraphs'])
        new_pages.append(ko_for_app[bi:bi + k])
        bi += k

    # 검증 샘플: 첫/중/말 3페이지 영↔한 선두 비교
    sample_idx = sorted(set([0, len(pages) // 2, len(pages) - 1]))
    print("  [검증 샘플]")
    for si in sample_idx:
        eng0 = norm(pages[si]['paragraphs'][0])[:60] if pages[si]['paragraphs'] else '(빈)'
        ko0 = norm(new_pages[si][0])[:50] if new_pages[si] and new_pages[si][0] else '(빈)'
        print(f"   p{si+1}: EN {eng0}")
        print(f"        KO {ko0}")

    # 출력
    out_dir = os.path.join(TRANS, pgid if apply else pgid + '_preview')
    if apply:
        backup = os.path.join(TRANS, f"{pgid}.backup")
        if os.path.isdir(os.path.join(TRANS, pgid)) and not os.path.exists(backup):
            shutil.copytree(os.path.join(TRANS, pgid), backup)
            print(f"  백업: {backup}")
        for old in glob.glob(os.path.join(out_dir, 'p*.json')):
            os.remove(old)
    else:
        if os.path.isdir(out_dir):
            shutil.rmtree(out_dir)
        os.makedirs(out_dir, exist_ok=True)

    for i, chunk in enumerate(new_pages, start=1):
        with open(os.path.join(out_dir, f'p{i}.json'), 'w', encoding='utf-8') as fh:
            json.dump(chunk, fh, ensure_ascii=False, indent=0)

    print(f"  ✅ {'적용' if apply else '미리보기'}: {out_dir} ({len(new_pages)} 페이지)")
    return True


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    apply = '--apply' in sys.argv
    do_all = '--all' in sys.argv or args == ['all']
    if do_all:
        srcs = sorted(glob.glob(os.path.join(TRANS, '_source_pg*.json')),
                      key=lambda x: int(re.sub(r'\D', '', os.path.basename(x))))
        args = ['pg' + re.sub(r'\D', '', os.path.basename(s)) for s in srcs]
    if not args:
        print("사용법: python3 realign-pagination-v2.py pg2554 [pg120 ...] [--apply]")
        print("       python3 realign-pagination-v2.py --all [--apply]   # _source 있는 책 전부")
        sys.exit(1)
    ok = 0
    for pgid in args:
        if realign(pgid, apply=apply):
            ok += 1
        print()
    print(f"=== 완료: {ok}/{len(args)} 성공 ===")
