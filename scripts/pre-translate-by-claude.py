"""
셜록 홈즈 한국어 번역 스크립트 (Claude haiku 사용)
사용법: python scripts/pre-translate-by-claude.py --book 1661
"""
import os, sys, json, re, time
from pathlib import Path

# anthropic SDK
try:
    import anthropic
except ImportError:
    os.system("pip install anthropic -q")
    import anthropic

# ── 경로 설정 ─────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
BOOKMAP_DIR  = SCRIPT_DIR.parent
BOOKS_DIR    = BOOKMAP_DIR / "public" / "books"
TRANS_DIR    = BOOKMAP_DIR / "public" / "translations"

WORDS_PER_PAGE = 1200
DELAY_MS       = 1.0  # seconds between API calls

# ── API 키 ────────────────────────────────────────────────────────────
api_key = os.environ.get("ANTHROPIC_API_KEY")
if not api_key:
    # .env.local 폴백
    env_path = BOOKMAP_DIR / ".env.local"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "=" in line:
                k, v = line.split("=", 1)
                if k.strip() == "ANTHROPIC_API_KEY":
                    api_key = v.strip()
if not api_key:
    print("❌ ANTHROPIC_API_KEY 없음. 환경변수로 설정하거나 .env.local에 추가하세요.")
    sys.exit(1)

client = anthropic.Anthropic(api_key=api_key)

# ── 페이지 분할 (translate-batch 와 동일한 알고리즘) ──────────────────
def split_into_pages(text: str) -> list[list[str]]:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    paragraphs = [
        re.sub(r"\n", " ", p).strip()
        for p in re.split(r"\n{2,}", normalized)
        if len(re.sub(r"\n", " ", p).strip()) > 30
    ]
    pages, current, word_count = [], [], 0
    for para in paragraphs:
        words = len(para.split())
        if word_count + words > WORDS_PER_PAGE and current:
            pages.append(current)
            current, word_count = [para], words
        else:
            current.append(para)
            word_count += words
    if current:
        pages.append(current)
    return pages

# ── 1 페이지 번역 ──────────────────────────────────────────────────────
def translate_page(paragraphs: list[str]) -> list[str]:
    numbered = "\n\n".join(f"[{i}] {p}" for i, p in enumerate(paragraphs))
    prompt = f"""Translate each English paragraph below into natural, fluent Korean.
Reply ONLY with a JSON array of strings. No explanation, no markdown, no extra text.
The array must have exactly {len(paragraphs)} elements in the same order.

Example: ["번역1", "번역2"]

English paragraphs:
{numbered}"""

    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = msg.content[0].text.strip()
    match = re.search(r"\[[\s\S]*?\]", raw)
    if match:
        try:
            parsed = json.loads(match.group())
            if isinstance(parsed, list):
                result = list(parsed) + [""] * len(paragraphs)
                return [str(x) for x in result[:len(paragraphs)]]
        except json.JSONDecodeError:
            pass
    return [""] * len(paragraphs)

# ── 메인 ──────────────────────────────────────────────────────────────
def main():
    args = sys.argv[1:]
    book_id = None
    if "--book" in args:
        idx = args.index("--book")
        book_id = int(args[idx + 1])

    if not book_id:
        print("사용법: python scripts/pre-translate-by-claude.py --book {id}")
        sys.exit(1)

    txt_path = BOOKS_DIR / f"pg{book_id}.txt"
    if not txt_path.exists():
        print(f"❌ {txt_path} 없음")
        sys.exit(1)

    text  = txt_path.read_text(encoding="utf-8")
    pages = split_into_pages(text)
    out_dir = TRANS_DIR / f"pg{book_id}"
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n📖 pg{book_id} — {len(pages)} 페이지")
    print(f"   모델: claude-haiku-4-5-20251001\n")

    done = skip = fail = 0
    for i, paras in enumerate(pages, 1):
        out_path = out_dir / f"p{i}.json"
        if out_path.exists():
            skip += 1
            print(f"  p{i}/{len(pages)} ⏭ 스킵")
            continue

        sys.stdout.write(f"  p{i}/{len(pages)} 번역 중...")
        sys.stdout.flush()

        retries = 2
        success = False
        while retries >= 0:
            try:
                translated = translate_page(paras)
                out_path.write_text(json.dumps(translated, ensure_ascii=False), encoding="utf-8")
                print(f" ✓ ({len(paras)}단락)")
                done += 1
                success = True
                break
            except Exception as e:
                err = str(e)
                if "429" in err and retries > 0:
                    print(f" ⏳ rate limit, 10초 대기...")
                    time.sleep(10)
                elif retries > 0:
                    print(f" ↺ 재시도...")
                    time.sleep(2)
                else:
                    print(f" ✗ {err[:40]}")
                    fail += 1
                retries -= 1

        if success:
            time.sleep(DELAY_MS)

    print(f"\n✅ 완료: 번역 {done} / 스킵 {skip} / 실패 {fail} (전체 {len(pages)}페이지)")
    print(f"   저장 위치: {out_dir}")

if __name__ == "__main__":
    main()
