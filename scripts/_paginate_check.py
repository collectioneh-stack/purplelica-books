import re, json, sys, os

MAX_WORDS = 600
CHAPTER_RE = re.compile(r"^(CHAPTER|Chapter|PART|Part|BOOK|Book|ACT|Act|SECTION|Section|PROLOGUE|Prologue|EPILOGUE|Epilogue|PREFACE|Preface|INTRODUCTION|Introduction|VOLUME|Volume)\b")
ALL_CAPS_RE = re.compile(r"^[A-Z][A-Z\s’'`,.:;!?\-—]+$")


def strip_wrapper(text):
    m = re.search(r"\*{3}\s*START OF [^\n]+\n", text, re.I)
    c = text
    if m:
        c = text[m.start() + len(m.group(0)):]
    m2 = re.search(r"\*{3}\s*END OF [^\n]+", c, re.I)
    if m2:
        c = c[:m2.start()]
    return c


def wcsplit(blocks, title):
    pages = []
    cur = []
    wc = 0
    first = True
    for b in blocks:
        w = len(b.split())
        if wc + w > MAX_WORDS and len(cur) > 0:
            pages.append({'paragraphs': cur, 'chapterTitle': title if first else None, 'isChapterStart': first})
            cur = [b]
            wc = w
            first = False
        else:
            cur.append(b)
            wc += w
    if cur:
        pages.append({'paragraphs': cur, 'chapterTitle': title if first else None, 'isChapterStart': first})
    return pages


def split_pages(text):
    norm = text.replace('\r\n', '\n').replace('\r', '\n')
    st = strip_wrapper(norm)
    allblocks = [re.sub(r'\n', ' ', p).strip() for p in re.split(r'\n{2,}', st)]
    allblocks = [p for p in allblocks if len(p) > 0]

    def build(use_caps):
        chs = []
        cur = {'title': None, 'blocks': []}
        for block in allblocks:
            t = block.strip()
            isch = bool(CHAPTER_RE.match(t)) and len(block) < 200
            iscaps = use_caps and bool(ALL_CAPS_RE.match(t)) and 3 <= len(t) < 80
            if isch or iscaps:
                if cur['blocks'] or cur['title'] is not None:
                    chs.append(cur)
                cur = {'title': t, 'blocks': []}
            elif len(block) > 20:
                cur['blocks'].append(block)
        if cur['blocks'] or cur['title'] is not None:
            chs.append(cur)
        return chs

    chapters = build(False)
    cre = sum(1 for c in chapters if c['title'] is not None)
    if cre < 5:
        c2 = build(True)
        if sum(1 for c in c2 if c['title'] is not None) > cre:
            chapters = c2
    if len(chapters) == 0 or (len(chapters) == 1 and chapters[0]['title'] is None):
        return wcsplit([b for b in allblocks if len(b) > 20], None)
    valid = [c for c in chapters if c['title'] is not None and c['blocks']]
    tw = sum(sum(len(b.split()) for b in c['blocks']) for c in valid)
    avg = tw / len(valid) if valid else float('inf')
    poetry = avg < 300 and len(valid) > 5
    pages = []
    for c in chapters:
        if c['title'] is None:
            continue
        if not c['blocks']:
            continue
        if poetry:
            pages.append({'paragraphs': [], 'chapterTitle': c['title'], 'isChapterStart': True})
            pages += wcsplit(c['blocks'], None)
        else:
            pages += wcsplit(c['blocks'], c['title'])
    return pages


if __name__ == '__main__':
    pgid = sys.argv[1]
    text = open(f'/home/purple/ai-ceo-os/projects/bookmap/public/books/{pgid}.txt', encoding='utf-8').read()
    pages = split_pages(text)
    counts = [len(p['paragraphs']) for p in pages]
    print('계산된 총 페이지:', len(pages))
    print('문단수(처음25):', counts[:25])

    # 기존 번역 파일과 비교
    d = f'/home/purple/ai-ceo-os/projects/bookmap/public/translations/{pgid}'
    if os.path.isdir(d):
        existing = sorted(int(f[1:-5]) for f in os.listdir(d) if f.startswith('p') and f.endswith('.json'))
        print('기존 번역파일 수:', len(existing), '범위:', existing[0] if existing else '-', '~', existing[-1] if existing else '-')
        mismatch = 0
        for i, pg in enumerate(pages, 1):
            fp = os.path.join(d, f'p{i}.json')
            if os.path.exists(fp):
                arr = json.load(open(fp))
                if len(arr) != len(pg['paragraphs']):
                    mismatch += 1
                    if mismatch <= 10:
                        print(f'  불일치 p{i}: 기존칸={len(arr)} 계산문단={len(pg["paragraphs"])}')
            else:
                print(f'  파일없음 p{i} (계산문단={len(pg["paragraphs"])})')
        print('문단수 불일치 페이지:', mismatch)
