#!/usr/bin/env python3
"""
페이지네이션 정합성 진단 (읽기 전용, 비파괴적)

app/book/[id]/page.tsx 의 splitIntoChapterPages() 를 Python으로 충실히 포팅하여,
각 책 원본 텍스트를 앱과 동일하게 600단어로 분할한 '예상 페이지 수'를 계산하고,
public/translations/pg{id}/ 의 실제 번역 파일 수와 비교한다.

용도: 어느 책이 실제로 어긋났는지(앱 분할 수 ≠ 번역 파일 수) 확정.
재정렬/추가번역 어느 방향이든 선행 진단으로 사용.
"""
import os, re, json, glob, sys

BASE = os.path.join(os.path.dirname(__file__), '..', 'public')
BOOKS = os.path.join(BASE, 'books')
TRANS = os.path.join(BASE, 'translations')

MAX_WORDS_PER_PAGE = 600
CHAPTER_RE = re.compile(r"^(CHAPTER|Chapter|PART|Part|BOOK|Book|ACT|Act|SECTION|Section|PROLOGUE|Prologue|EPILOGUE|Epilogue|PREFACE|Preface|INTRODUCTION|Introduction|VOLUME|Volume)\b")
ALL_CAPS_TITLE_RE = re.compile(r"^[A-Z][A-Z\s'',.:;!?\-—]+$")


def word_count(s):
    return len(s.split())


def strip_gutenberg(text):
    m = re.search(r"\*{3}\s*START OF [^\n]+\n", text, re.I)
    content = text
    if m:
        content = text[m.end():]
    m2 = re.search(r"\*{3}\s*END OF [^\n]+", content, re.I)
    if m2:
        content = content[:m2.start()]
    return content


def word_count_split(blocks, chapter_title):
    pages = []
    current = []
    wc = 0
    is_first = True
    for block in blocks:
        w = word_count(block)
        if wc + w > MAX_WORDS_PER_PAGE and len(current) > 0:
            pages.append({'paragraphs': current, 'chapterTitle': chapter_title if is_first else None, 'isChapterStart': is_first})
            current = [block]
            wc = w
            is_first = False
        else:
            current.append(block)
            wc += w
    if len(current) > 0:
        pages.append({'paragraphs': current, 'chapterTitle': chapter_title if is_first else None, 'isChapterStart': is_first})
    return pages


def split_into_chapter_pages(text):
    normalized = text.replace('\r\n', '\n').replace('\r', '\n')
    stripped = strip_gutenberg(normalized)
    all_blocks = [re.sub(r'\n', ' ', p).strip() for p in re.split(r'\n{2,}', stripped)]
    all_blocks = [p for p in all_blocks if len(p) > 0]

    def build_chapters(use_allcaps):
        chapters = []
        current = {'title': None, 'blocks': []}
        for block in all_blocks:
            trimmed = block.strip()
            is_chap = CHAPTER_RE.search(trimmed) and len(block) < 200
            is_caps = use_allcaps and ALL_CAPS_TITLE_RE.match(trimmed) and 3 <= len(trimmed) < 80
            if is_chap or is_caps:
                if len(current['blocks']) > 0 or current['title'] is not None:
                    chapters.append(current)
                current = {'title': trimmed, 'blocks': []}
            elif len(block) > 20:
                current['blocks'].append(block)
        if len(current['blocks']) > 0 or current['title'] is not None:
            chapters.append(current)
        return chapters

    chapters = build_chapters(False)
    chap_re_count = sum(1 for c in chapters if c['title'] is not None)
    if chap_re_count < 5:
        chapters2 = build_chapters(True)
        if sum(1 for c in chapters2 if c['title'] is not None) > chap_re_count:
            chapters = chapters2

    if len(chapters) == 0 or (len(chapters) == 1 and chapters[0]['title'] is None):
        return word_count_split([b for b in all_blocks if len(b) > 20], None)

    valid = [c for c in chapters if c['title'] is not None and len(c['blocks']) > 0]
    total_words = sum(sum(word_count(b) for b in c['blocks']) for c in valid)
    avg = (total_words / len(valid)) if valid else float('inf')
    is_poetry = avg < 300 and len(valid) > 5

    pages = []
    for ch in chapters:
        if ch['title'] is None or len(ch['blocks']) == 0:
            continue
        if is_poetry:
            pages.append({'paragraphs': [], 'chapterTitle': ch['title'], 'isChapterStart': True})
            pages.extend(word_count_split(ch['blocks'], None))
        else:
            pages.extend(word_count_split(ch['blocks'], ch['title']))
    return pages


def count_translation_files(pgid):
    files = glob.glob(os.path.join(TRANS, pgid, 'p*.json'))
    nonempty = 0
    for f in files:
        try:
            j = json.load(open(f, encoding='utf-8'))
        except Exception:
            continue
        if isinstance(j, list):
            txt = ''.join(s for s in j if isinstance(s, str)).strip()
        elif isinstance(j, dict):
            txt = str(j.get('ko', '')).strip()
        else:
            txt = ''
        if txt:
            nonempty += 1
    return len(files), nonempty


def main():
    # 진단 대상: translations 폴더가 존재하는 모든 pg
    targets = sorted([d for d in os.listdir(TRANS)
                      if os.path.isdir(os.path.join(TRANS, d)) and re.fullmatch(r'pg\d+', d)],
                     key=lambda x: int(x[2:]))
    rows = []
    for pgid in targets:
        book_path = os.path.join(BOOKS, pgid + '.txt')
        if not os.path.exists(book_path):
            rows.append((pgid, None, None, None, 'NO_SOURCE'))
            continue
        text = open(book_path, encoding='utf-8', errors='replace').read()
        expected = len(split_into_chapter_pages(text))
        total_files, nonempty = count_translation_files(pgid)
        if total_files == 0:
            status = 'NO_FILES'
        elif expected == total_files:
            status = 'ALIGNED' if nonempty == total_files else 'ALIGNED_PARTIAL'
        else:
            status = 'MISALIGNED'
        rows.append((pgid, expected, total_files, nonempty, status))

    # 출력
    print(f"{'PG':<8}{'앱분할':>7}{'번역파일':>8}{'내용有':>7}  상태")
    print('-' * 50)
    counts = {}
    for pgid, exp, tot, ne, st in rows:
        counts[st] = counts.get(st, 0) + 1
        e = '' if exp is None else exp
        t = '' if tot is None else tot
        n = '' if ne is None else ne
        print(f"{pgid:<8}{str(e):>7}{str(t):>8}{str(n):>7}  {st}")
    print('-' * 50)
    print('요약:', ', '.join(f"{k}={v}" for k, v in sorted(counts.items())))


if __name__ == '__main__':
    main()
