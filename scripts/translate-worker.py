"""
북맵 10병행 번역 워커.
주어진 page index 리스트만 claude CLI로 번역해 p{N}.json에 저장.
이미 채워진 페이지는 skip. 빈 placeholder는 덮어씀.

사용법:
  python3 scripts/translate-worker.py --book {ID} --pages "1,2,3" [--log LOGFILE]
"""
import json, os, re, subprocess, sys, time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
BOOKMAP_DIR = SCRIPT_DIR.parent
TRANS_DIR = BOOKMAP_DIR / "public" / "translations"


def translate_page(paragraphs):
    numbered = '\n\n'.join(f'[{i}] {p}' for i, p in enumerate(paragraphs))
    prompt = (
        f'Translate each English paragraph below into natural, fluent literary Korean.\n'
        f'Reply ONLY with a JSON array of strings. No explanation, no markdown.\n'
        f'The array must have exactly {len(paragraphs)} elements in the same order.\n'
        f'Use 평서형 종결 ("~다", "~였다") for narration, natural 구어체 for dialogue.\n'
        f'Preserve [page N] markers, footnotes (*), measurement units.\n\n'
        f'English paragraphs:\n{numbered}'
    )
    result = subprocess.run(
        ['claude', '-p', '--output-format', 'text', prompt],
        capture_output=True, text=True, timeout=240, encoding='utf-8'
    )
    raw = result.stdout.strip()
    m = re.search(r'\[[\s\S]*\]', raw)
    if not m:
        raise ValueError(f'no JSON array in response: {raw[:200]}')
    parsed = json.loads(m.group())
    if not isinstance(parsed, list):
        raise ValueError(f'not a list: {raw[:200]}')
    arr = list(parsed) + [''] * len(paragraphs)
    return [str(x) for x in arr[:len(paragraphs)]]


def page_is_done(path):
    if not path.exists():
        return False
    try:
        arr = json.loads(path.read_text(encoding='utf-8'))
        return any(re.search(r'[가-힣]', s) for s in arr)
    except Exception:
        return False


def main():
    args = sys.argv[1:]
    book_id = None
    pages = []
    log_path = None
    if '--book' in args:
        book_id = int(args[args.index('--book') + 1])
    if '--pages' in args:
        raw = args[args.index('--pages') + 1]
        pages = [int(p) for p in raw.split(',') if p.strip()]
    if '--log' in args:
        log_path = Path(args[args.index('--log') + 1])
    if not book_id or not pages:
        print('Usage: python3 translate-worker.py --book ID --pages "1,2,3" [--log LOGFILE]')
        sys.exit(1)

    src_path = TRANS_DIR / f'_source_pg{book_id}.json'
    if not src_path.exists():
        print(f'[ERROR] {src_path} not found. Run dump-source-pages.py first.')
        sys.exit(1)
    source = json.loads(src_path.read_text(encoding='utf-8'))
    out_dir = TRANS_DIR / f'pg{book_id}'
    out_dir.mkdir(parents=True, exist_ok=True)

    def log(msg):
        line = f'[{time.strftime("%H:%M:%S")}] pg{book_id} worker pid={os.getpid()}: {msg}'
        print(line)
        if log_path:
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(line + '\n')

    done = 0
    skip = 0
    fail = 0
    for i in pages:
        if i < 1 or i > len(source):
            log(f'p{i} out of range (1..{len(source)})')
            fail += 1
            continue
        paras = source[i - 1]
        out_path = out_dir / f'p{i}.json'
        if page_is_done(out_path):
            skip += 1
            continue
        log(f'p{i} translating ({len(paras)} paragraphs)')
        ok = False
        for attempt in range(3):
            try:
                translated = translate_page(paras)
                if len(translated) != len(paras):
                    raise ValueError(f'count mismatch: src={len(paras)} trans={len(translated)}')
                out_path.write_text(json.dumps(translated, ensure_ascii=False), encoding='utf-8')
                log(f'p{i} OK')
                done += 1
                ok = True
                break
            except subprocess.TimeoutExpired:
                log(f'p{i} TIMEOUT attempt={attempt + 1}')
                time.sleep(8)
            except Exception as e:
                log(f'p{i} ERROR attempt={attempt + 1}: {str(e)[:120]}')
                time.sleep(5)
        if not ok:
            fail += 1
        time.sleep(0.5)

    log(f'DONE: done={done} skip={skip} fail={fail}')


if __name__ == '__main__':
    main()
