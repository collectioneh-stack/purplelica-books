"""
번역 리그룹핑 스크립트
- 영어 원문 기준으로 잘린 문단을 한국어 가독성 기준으로 재구성
- 한 페이지 = 스크롤 없이 읽을 수 있는 분량 (~800자)
- 뭉친 긴 문단(400자+)은 kss로 문장 분리 후 재그룹
- 빈 항목 제거
- 대사는 개별 항목으로 보존 (화자 전환 구분)
- 지문+대사가 뭉친 경우 대사 앞에서 분리

사용법:
  python scripts/regroup-translations.py pg16          # 특정 책
  python scripts/regroup-translations.py pg16 --dry-run # 변경 내용만 미리보기
  python scripts/regroup-translations.py --all          # 번역 완료된 전체 책
"""

import json
import os
import sys
import glob
import shutil
import argparse

# kss import (문장 분리용)
try:
    import kss
    HAS_KSS = True
except ImportError:
    HAS_KSS = False
    print("[WARN] kss 미설치 — 문장 분리 없이 글자수 기반으로만 리그룹")

# ─── 설정 ─────────────────────────────────────────────────────
MAX_CHARS_PER_PAGE = 800      # 한 페이지 목표 최대 글자수
MIN_CHARS_FOR_NEW_PAGE = 200  # 이 이상 남으면 새 페이지로 넘기지 않고 현재 페이지에서 끊기
LONG_THRESHOLD = 400          # 이 이상이면 "뭉친 문단"으로 판정 → 문장 분리
SHORT_THRESHOLD = 15          # 이 이하면 "짧은 항목" → 앞뒤와 묶기 시도

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'translations')

# 번역 완료된 책 목록 (STATUS.md 기준)
COMPLETED_BOOKS = [
    'pg11', 'pg16', 'pg41', 'pg43', 'pg46', 'pg84',
    'pg721', 'pg1064', 'pg1080', 'pg1342', 'pg1661',
    'pg1934', 'pg1952', 'pg2500', 'pg2542', 'pg2701', 'pg5200',
]


def load_all_paragraphs(pg_dir):
    """한 책의 모든 페이지를 읽어서 전체 문단 리스트로 합침"""
    files = sorted(glob.glob(os.path.join(pg_dir, 'p*.json')),
                   key=lambda f: int(os.path.basename(f).replace('p', '').replace('.json', '')))

    all_paragraphs = []
    for f in files:
        with open(f, 'r', encoding='utf-8') as fh:
            data = json.load(fh)
        if isinstance(data, list):
            for item in data:
                if isinstance(item, str) and item.strip():
                    all_paragraphs.append(item.strip())

    return all_paragraphs


import re

# 대사 시작 패턴: 한/영 따옴표로 시작
DIALOGUE_RE = re.compile(r'^[\"\"\u201C\u300C「『]')
# 지문 속 대사 전환 패턴: 서술 후 "대사" 시작
EMBEDDED_DIALOGUE_RE = re.compile(r'([^\"\"]+)([\"\"\u201C][^\"\"]+[\"\"\u201D])')


def is_dialogue(text):
    """대사로 시작하는 문단인지 판별"""
    return bool(DIALOGUE_RE.match(text.strip()))


def split_long_paragraph(text):
    """긴 문단을 kss로 문장 분리 후 의미 단위로 재그룹.
    대사가 포함된 경우 대사 앞에서 분리하여 화자 전환을 시각적으로 구분."""
    if not HAS_KSS:
        return [text]

    try:
        sentences = kss.split_sentences(text, backend='pecab')
    except Exception:
        return [text]

    if len(sentences) <= 1:
        return [text]

    # 문장들을 의미 단위로 묶되, 대사 시작 시 새 블록
    blocks = []
    current = []
    current_len = 0

    for sent in sentences:
        sent_len = len(sent)
        starts_with_dialogue = is_dialogue(sent)

        # 대사가 새로 시작되면 → 이전 지문 블록 끊고 새 블록
        if starts_with_dialogue and current and not is_dialogue(current[-1]):
            blocks.append(' '.join(current))
            current = [sent]
            current_len = sent_len
        # 현재 블록이 300자 넘으면 새 블록
        elif current_len + sent_len > 300 and current:
            blocks.append(' '.join(current))
            current = [sent]
            current_len = sent_len
        else:
            current.append(sent)
            current_len += sent_len

    if current:
        blocks.append(' '.join(current))

    return blocks


def merge_short_items(paragraphs):
    """짧은 지문 항목을 인접 지문과 묶기.
    대사 항목은 절대 합치지 않음 (화자 전환 보존)."""
    if len(paragraphs) <= 1:
        return paragraphs

    merged = []
    i = 0
    while i < len(paragraphs):
        p = paragraphs[i]

        # 짧은 항목이고 대사가 아닌 지문인 경우에만 → 다음 지문과 묶기
        if (len(p) < SHORT_THRESHOLD
                and not is_dialogue(p)
                and i + 1 < len(paragraphs)
                and not is_dialogue(paragraphs[i + 1])):
            merged.append(p + ' ' + paragraphs[i + 1])
            i += 2
            continue

        merged.append(p)
        i += 1

    return merged


def normalize_paragraphs(paragraphs):
    """
    1단계: 긴 문단 분리 + 짧은 지문 병합
    → 한국어로 읽기 좋은 문단 단위로 정규화
    - 대사는 개별 항목 보존 (화자 구분)
    - 지문만 병합 대상
    """
    normalized = []

    for p in paragraphs:
        if len(p) > LONG_THRESHOLD:
            splits = split_long_paragraph(p)
            normalized.extend(splits)
        else:
            normalized.append(p)

    normalized = merge_short_items(normalized)

    return normalized


def paginate(paragraphs):
    """
    2단계: 정규화된 문단들을 페이지 단위로 분할

    핵심 규칙:
    - 한 페이지 목표: ~800자
    - 다음 문단을 추가하면 넘칠 때:
      - 현재 페이지가 이미 600자+ → 여기서 끊기 (남은 200자는 OK)
      - 현재 페이지가 아직 적으면 → 추가하고 넘기기
    """
    pages = []
    current_page = []
    current_chars = 0

    for p in paragraphs:
        p_len = len(p)

        if current_chars + p_len > MAX_CHARS_PER_PAGE and current_page:
            # 현재 페이지에 이미 내용이 있고 넘칠 것 같으면
            remaining_space = MAX_CHARS_PER_PAGE - current_chars

            if remaining_space < MIN_CHARS_FOR_NEW_PAGE:
                # 남은 공간이 200자 미만 → 현재 페이지에서 끊기
                pages.append(current_page)
                current_page = [p]
                current_chars = p_len
            else:
                # 남은 공간이 200자 이상인데 문단이 너무 길면 → 그래도 끊기
                pages.append(current_page)
                current_page = [p]
                current_chars = p_len
        else:
            current_page.append(p)
            current_chars += p_len

    if current_page:
        pages.append(current_page)

    return pages


def process_book(pg_id, dry_run=False):
    """한 책 전체를 리그룹핑"""
    pg_dir = os.path.join(BASE_DIR, pg_id)

    if not os.path.isdir(pg_dir):
        print(f"  [SKIP] {pg_id}: 디렉토리 없음")
        return False

    # 1. 전체 문단 로드
    all_paragraphs = load_all_paragraphs(pg_dir)
    if not all_paragraphs:
        print(f"  [SKIP] {pg_id}: 문단 없음")
        return False

    original_files = sorted(glob.glob(os.path.join(pg_dir, 'p*.json')),
                           key=lambda f: int(os.path.basename(f).replace('p', '').replace('.json', '')))
    original_count = len(original_files)

    # 2. 정규화 (긴 문단 분리 + 짧은 항목 병합)
    normalized = normalize_paragraphs(all_paragraphs)

    # 3. 페이지 분할
    new_pages = paginate(normalized)

    # 통계
    orig_total_chars = sum(len(p) for p in all_paragraphs)
    new_total_chars = sum(len(p) for page in new_pages for p in page)
    avg_chars_per_page = new_total_chars // len(new_pages) if new_pages else 0

    print(f"  {pg_id}: {original_count}p -> {len(new_pages)}p | "
          f"문단 {len(all_paragraphs)} -> {len(normalized)} | "
          f"평균 {avg_chars_per_page}자/p")

    if dry_run:
        # 변경 미리보기: 처음 3페이지
        for i, page in enumerate(new_pages[:3]):
            total = sum(len(p) for p in page)
            print(f"    p{i+1}: {len(page)}문단, {total}자")
            for j, p in enumerate(page[:2]):
                preview = p[:60] + '...' if len(p) > 60 else p
                print(f"      [{j}] {preview}")
        return True

    # 4. 백업
    backup_dir = os.path.join(pg_dir, '_backup_regroup')
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    for f in original_files:
        shutil.copy2(f, os.path.join(backup_dir, os.path.basename(f)))

    # 5. 기존 파일 삭제
    for f in original_files:
        os.remove(f)

    # 6. 새 페이지 파일 쓰기
    for i, page in enumerate(new_pages, 1):
        out_path = os.path.join(pg_dir, f'p{i}.json')
        with open(out_path, 'w', encoding='utf-8') as fh:
            json.dump(page, fh, ensure_ascii=False, indent=2)

    return True


def main():
    parser = argparse.ArgumentParser(description='번역 리그룹핑')
    parser.add_argument('pg_id', nargs='?', help='책 ID (예: pg16)')
    parser.add_argument('--all', action='store_true', help='번역 완료된 전체 책')
    parser.add_argument('--dry-run', action='store_true', help='변경 없이 미리보기만')
    args = parser.parse_args()

    if not args.pg_id and not args.all:
        parser.print_help()
        sys.exit(1)

    books = COMPLETED_BOOKS if args.all else [args.pg_id]
    mode = "DRY-RUN" if args.dry_run else "APPLY"

    print(f"\n=== Translation Regroup ({mode}) ===\n")

    success = 0
    for pg_id in books:
        try:
            if process_book(pg_id, dry_run=args.dry_run):
                success += 1
        except Exception as e:
            print(f"  [ERROR] {pg_id}: {e}")

    print(f"\n완료: {success}/{len(books)} 처리됨")


if __name__ == '__main__':
    main()
