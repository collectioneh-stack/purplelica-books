"""
Claude CLI를 이용한 pg1661 셜록 홈즈 한국어 번역
사용법: python scripts/translate-with-claude-cli.py
"""
import json, re, subprocess, sys, time
from pathlib import Path

BOOKMAP_DIR = Path(__file__).parent.parent
PAGES_JSON  = BOOKMAP_DIR / "public" / "translations" / "_pages_raw.json"
OUT_DIR     = BOOKMAP_DIR / "public" / "translations" / "pg1661"
OUT_DIR.mkdir(parents=True, exist_ok=True)

pages = json.loads(PAGES_JSON.read_text(encoding="utf-8"))
total = len(pages)
print(f"\n📖 셜록 홈즈의 모험 (pg1661) — {total} 페이지\n")

done = skip = fail = 0

for i, page in enumerate(pages, 1):
    out_path = OUT_DIR / f"p{i}.json"
    if out_path.exists():
        skip += 1
        print(f"  p{i}/{total} ⏭")
        continue

    numbered = "\n\n".join(f"[{j}] {p}" for j, p in enumerate(page))
    prompt = (
        f"Translate each English paragraph below into natural, fluent Korean.\n"
        f"Reply ONLY with a JSON array of strings. No explanation, no markdown, no extra text.\n"
        f"The array must have exactly {len(page)} elements in the same order.\n"
        f"Example: [\"번역1\", \"번역2\"]\n\n"
        f"English paragraphs:\n{numbered}"
    )

    sys.stdout.write(f"  p{i}/{total} ({len(page)}단락) 번역 중...")
    sys.stdout.flush()

    retries = 2
    success = False
    while retries >= 0:
        try:
            result = subprocess.run(
                ["claude", "-p", "--output-format", "text", prompt],
                capture_output=True, text=True, timeout=120, encoding="utf-8"
            )
            raw = result.stdout.strip()
            m = re.search(r"\[[\s\S]*\]", raw)
            if m:
                parsed = json.loads(m.group())
                if isinstance(parsed, list) and len(parsed) > 0:
                    # 길이 보정
                    while len(parsed) < len(page):
                        parsed.append("")
                    parsed = parsed[:len(page)]
                    out_path.write_text(
                        json.dumps([str(x) for x in parsed], ensure_ascii=False),
                        encoding="utf-8"
                    )
                    print(f" ✓")
                    done += 1
                    success = True
                    break
            if not success:
                raise ValueError(f"파싱 실패: {raw[:60]}")
        except subprocess.TimeoutExpired:
            print(f" ⏳ 타임아웃, 재시도...")
        except Exception as e:
            if retries > 0:
                print(f" ↺ 재시도 ({str(e)[:30]})")
                time.sleep(2)
            else:
                print(f" ✗ {str(e)[:40]}")
                fail += 1
        retries -= 1
        if not success and retries >= 0:
            time.sleep(1)

    if success:
        time.sleep(0.3)

print(f"\n✅ 완료: 번역 {done} / 스킵 {skip} / 실패 {fail} (전체 {total}페이지)")
print(f"   저장 위치: {OUT_DIR}")
