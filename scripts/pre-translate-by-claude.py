"""
북맵 한국어 번역 스크립트 (Claude CLI 사용 — API 키 불필요)
사용법: python scripts/pre-translate-by-claude.py --book {gutenberg_id}
"""
import json, os, re, subprocess, sys, time
from pathlib import Path

SCRIPT_DIR     = Path(__file__).parent
BOOKMAP_DIR    = SCRIPT_DIR.parent
BOOKS_DIR      = BOOKMAP_DIR / "public" / "books"
TRANS_DIR      = BOOKMAP_DIR / "public" / "translations"

WORDS_PER_PAGE = 600   # app/book/[id]/page.tsx의 MAX_WORDS_PER_PAGE와 일치 (페이지 번호 정합 필수)
DELAY_SEC      = 0.5   # API 호출 사이 대기

CHAPTER_RE = re.compile(
    r'^(CHAPTER|Chapter|PART|Part|BOOK|Book|ACT|Act|SECTION|Section'
    r'|PROLOGUE|Prologue|EPILOGUE|Epilogue|PREFACE|Preface'
    r'|INTRODUCTION|Introduction|VOLUME|Volume)\b'
)
ALL_CAPS_TITLE_RE = re.compile(r"^[A-Z][A-Z\s''',.:;!?\-—]+$")

# ── 구텐베르크 헤더/푸터 제거 ────────────────────────────────────────────
def strip_gutenberg(text: str) -> str:
    m = re.search(r'\*{3}\s*START OF [^\n]+\n', text, re.IGNORECASE)
    content = text[m.end():] if m else text
    end = re.search(r'\*{3}\s*END OF [^\n]+', content, re.IGNORECASE)
    return content[:end.start()] if end else content

# ── 챕터 기반 페이지 분할 (page.tsx와 동일 알고리즘) ───────────────────
def split_into_pages(text: str) -> list[list[str]]:
    normalized = text.replace('\r\n', '\n').replace('\r', '\n')
    stripped   = strip_gutenberg(normalized)

    all_blocks = [
        re.sub(r'\n', ' ', p).strip()
        for p in re.split(r'\n{2,}', stripped)
        if len(re.sub(r'\n', ' ', p).strip()) > 0
    ]

    # 1차: CHAPTER_RE로만 챕터 감지
    chapters: list[dict] = []
    current: dict = {'title': None, 'blocks': []}
    for block in all_blocks:
        trimmed = block.strip()
        if CHAPTER_RE.match(trimmed) and len(block) < 200:
            if current['blocks'] or current['title']:
                chapters.append(current)
            current = {'title': trimmed, 'blocks': []}
        elif len(block) > 20:
            current['blocks'].append(block)
    if current['blocks'] or current['title']:
        chapters.append(current)

    # 2차: CHAPTER_RE 부족하면 (< 5개) ALL_CAPS 제목도 감지 (시집 등)
    chapter_re_count = sum(1 for c in chapters if c['title'])
    if chapter_re_count < 5:
        chapters2: list[dict] = []
        current = {'title': None, 'blocks': []}
        for block in all_blocks:
            trimmed = block.strip()
            is_chapter = bool(CHAPTER_RE.match(trimmed)) and len(block) < 200
            is_allcaps = bool(ALL_CAPS_TITLE_RE.match(trimmed)) and 3 <= len(trimmed) < 80
            if is_chapter or is_allcaps:
                if current['blocks'] or current['title']:
                    chapters2.append(current)
                current = {'title': trimmed, 'blocks': []}
            elif len(block) > 20:
                current['blocks'].append(block)
        if current['blocks'] or current['title']:
            chapters2.append(current)
        if sum(1 for c in chapters2 if c['title']) > chapter_re_count:
            chapters = chapters2

    # 챕터 없으면 단어 수 기준 폴백
    if not chapters or (len(chapters) == 1 and chapters[0]['title'] is None):
        return _word_split([b for b in all_blocks if len(b) > 20])

    # 시집 모드 감지: 챕터 평균 단어 수 300 이하 + 5개 이상
    valid_chapters = [ch for ch in chapters if ch['title'] and ch['blocks']]
    total_words = sum(sum(len(b.split()) for b in ch['blocks']) for ch in valid_chapters)
    avg_words = total_words / len(valid_chapters) if valid_chapters else float('inf')
    is_poetry = avg_words < 300 and len(valid_chapters) > 5

    pages: list[list[str]] = []
    for ch in chapters:
        if ch['title'] is None:
            continue
        if not ch['blocks']:
            continue
        if is_poetry:
            pages.append([])  # 제목 전용 페이지 (빈 배열)
            pages.extend(_word_split(ch['blocks']))
        else:
            pages.extend(_word_split(ch['blocks']))
    return pages

def _word_split(blocks: list[str]) -> list[list[str]]:
    pages, current, wc = [], [], 0
    for block in blocks:
        w = len(block.split())
        if wc + w > WORDS_PER_PAGE and current:
            pages.append(current)
            current, wc = [block], w
        else:
            current.append(block)
            wc += w
    if current:
        pages.append(current)
    return pages

# ── 1 페이지 번역 (claude CLI) ───────────────────────────────────────────
def translate_page(paragraphs: list[str]) -> list[str]:
    numbered = '\n\n'.join(f'[{i}] {p}' for i, p in enumerate(paragraphs))
    prompt = (
        f'Translate each English paragraph below into natural, fluent Korean.\n'
        f'Reply ONLY with a JSON array of strings. No explanation, no markdown, no extra text.\n'
        f'The array must have exactly {len(paragraphs)} elements in the same order.\n'
        f'Example: ["번역1", "번역2"]\n\n'
        f'English paragraphs:\n{numbered}'
    )

    result = subprocess.run(
        ['claude', '-p', '--output-format', 'text', prompt],
        capture_output=True, text=True, timeout=180, encoding='utf-8'
    )
    raw = result.stdout.strip()
    m = re.search(r'\[[\s\S]*?\]', raw)
    if m:
        try:
            parsed = json.loads(m.group())
            if isinstance(parsed, list):
                result_list = list(parsed) + [''] * len(paragraphs)
                return [str(x) for x in result_list[:len(paragraphs)]]
        except json.JSONDecodeError:
            pass
    return [''] * len(paragraphs)

# ── 메인 ────────────────────────────────────────────────────────────────
def main():
    args = sys.argv[1:]
    book_id = None
    if '--book' in args:
        idx = args.index('--book')
        book_id = int(args[idx + 1])
    if not book_id:
        print('Usage: python scripts/pre-translate-by-claude.py --book {id}')
        sys.exit(1)

    txt_path = BOOKS_DIR / f'pg{book_id}.txt'
    if not txt_path.exists():
        print(f'[ERROR] {txt_path} not found')
        sys.exit(1)

    text  = txt_path.read_text(encoding='utf-8', errors='replace')
    pages = split_into_pages(text)
    out_dir = TRANS_DIR / f'pg{book_id}'
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f'pg{book_id} -- {len(pages)} pages')

    done = skip = fail = 0
    for i, paras in enumerate(pages, 1):
        out_path = out_dir / f'p{i}.json'
        if out_path.exists():
            skip += 1
            continue

        sys.stdout.write(f'  p{i}/{len(pages)} translating...')
        sys.stdout.flush()

        retries = 2
        success = False
        while retries >= 0:
            try:
                translated = translate_page(paras)
                out_path.write_text(
                    json.dumps(translated, ensure_ascii=False), encoding='utf-8'
                )
                print(f' OK ({len(paras)} paras)')
                done += 1
                success = True
                break
            except subprocess.TimeoutExpired:
                print(' TIMEOUT, retrying...')
                time.sleep(5)
            except Exception as e:
                if retries > 0:
                    print(f' RETRY ({str(e)[:30]})')
                    time.sleep(2)
                else:
                    print(f' FAIL {str(e)[:40]}')
                    fail += 1
            retries -= 1

        if success:
            time.sleep(DELAY_SEC)

    print(f'done={done} skip={skip} fail={fail} total={len(pages)}')

if __name__ == '__main__':
    main()
