#!/usr/bin/env python3
"""
Claude CLI(`claude -p`)를 직접 호출해 페이지별 번역.
서브에이전트가 API 과부하로 실패할 때 폴백.

사용:
    python3 scripts/translate-with-cli.py --book 1251
"""
import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRANS_DIR = ROOT / "public" / "translations"

GLOSSARIES = {
    1251: """- King Arthur=아서 왕, Sir Lancelot=란슬롯 경, Sir Gawain=가웨인 경, Sir Tristram=트리스트람 경, Sir Galahad=갈라하드 경, Sir Percival=퍼시벌 경, Sir Kay=케이 경, Sir Bedivere=베디비어 경
- Merlin=멀린, Guinevere=귀네비어, Morgan le Fay=모건 르 페이, Lady of the Lake=호수의 여인
- Excalibur=엑스칼리버, Round Table=원탁, Camelot=카멜롯, Britain=브리튼, Uther Pendragon=우서 펜드래건
- "Sir"=~경, 고어 → 자연스러운 한국어""",
    1232: """- Machiavelli=마키아벨리, Prince=군주, Cesare Borgia=체사레 보르자, Italy=이탈리아, Florence=피렌체, Lorenzo de' Medici=로렌초 데 메디치""",
    1399: """- Anna Karenina=안나 카레리나, Karenin=카레닌, Levin=레빈, Kitty=키티, Stiva=스티바, Dolly=돌리, Vronsky=브론스키, Moscow=모스크바, St. Petersburg=페테르부르크""",
}

BOOK_TITLES = {
    1251: "Le Morte d'Arthur (아서왕의 죽음, Sir Thomas Malory 중세 기사도 로맨스)",
    1232: "The Prince (군주론, 마키아벨리)",
    1399: "Anna Karenina (안나 카레리나, 톨스토이)",
}


def has_content(d):
    return isinstance(d, list) and any(isinstance(x, str) and x.strip() for x in d)


def build_prompt(paragraphs, book_id):
    title = BOOK_TITLES.get(book_id, f"pg{book_id}")
    gloss = GLOSSARIES.get(book_id, "")
    paragraphs_json = json.dumps(paragraphs, ensure_ascii=False, indent=2)

    return f"""아래 영어 문단 배열을 자연스러운 현대 한국어로 번역하라.

책: {title}

고유명사 표기 통일:
{gloss}

규칙:
1. 입력 배열 길이 = 출력 배열 길이
2. 빈 문단(\"\")은 빈 문단 유지
3. 영어 그대로 두지 말 것
4. 자연스러운 의역 우선

입력:
{paragraphs_json}

출력: JSON 배열만. 다른 텍스트 절대 금지. ```json ``` 코드블록 사용 OK."""


def parse_array(text, expected_len):
    if not text:
        return None
    # Markdown 코드블록 제거
    m = re.search(r"```(?:json)?\s*(\[[\s\S]*?\])\s*```", text)
    if m:
        text = m.group(1)
    else:
        s, e = text.find("["), text.rfind("]")
        if s == -1 or e == -1 or e < s:
            return None
        text = text[s:e+1]
    try:
        arr = json.loads(text)
        if isinstance(arr, list):
            if len(arr) == expected_len:
                return arr
            # 길이 보정
            if len(arr) > expected_len:
                return arr[:expected_len]
            return arr + [""] * (expected_len - len(arr))
    except Exception:
        return None
    return None


def call_claude_cli(prompt, timeout=300, max_retries=3):
    for attempt in range(max_retries):
        try:
            result = subprocess.run(
                ["claude", "--print", "--output-format", "text", prompt],
                capture_output=True, text=True, timeout=timeout, encoding="utf-8"
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
            print(f"    [retry {attempt+1}] claude -p 반환 코드 {result.returncode}, stderr: {result.stderr[:200]}")
        except subprocess.TimeoutExpired:
            print(f"    [retry {attempt+1}] 타임아웃")
        except Exception as e:
            print(f"    [retry {attempt+1}] {e}")
        time.sleep(5)
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", type=int, required=True)
    ap.add_argument("--start", type=int, default=None, help="시작 페이지 (기본: 1)")
    ap.add_argument("--end", type=int, default=None, help="끝 페이지 (기본: 마지막)")
    args = ap.parse_args()

    book_id = args.book
    src_path = TRANS_DIR / f"_source_pg{book_id}.json"
    if not src_path.exists():
        print(f"[ERROR] 소스 없음: {src_path}")
        sys.exit(1)

    pages = json.load(open(src_path, encoding="utf-8"))
    total = len(pages)
    start = args.start or 1
    end = args.end or total

    target_dir = TRANS_DIR / f"pg{book_id}"
    done_now = 0
    skipped = 0
    failed = []
    t0 = time.time()

    for i in range(start, end + 1):
        out_path = target_dir / f"p{i}.json"
        # 기존 번역 있으면 스킵
        if out_path.exists():
            try:
                if has_content(json.load(open(out_path, encoding="utf-8"))):
                    skipped += 1
                    continue
            except Exception:
                pass

        paragraphs = pages[i - 1]
        if not paragraphs or all(not p.strip() for p in paragraphs):
            json.dump([""] * len(paragraphs), open(out_path, "w", encoding="utf-8"),
                      ensure_ascii=False)
            done_now += 1
            continue

        prompt = build_prompt(paragraphs, book_id)
        resp = call_claude_cli(prompt)
        arr = parse_array(resp, len(paragraphs))

        if arr is None:
            failed.append(i)
            print(f"  ✗ p{i} 번역 실패")
            continue

        json.dump(arr, open(out_path, "w", encoding="utf-8"), ensure_ascii=False)
        done_now += 1
        elapsed = time.time() - t0
        rate = done_now / elapsed if elapsed > 0 else 0
        eta = (end - i) / rate if rate > 0 else 0
        print(f"  ✓ p{i} ({len(paragraphs)} 문단) — 진행 {done_now}, 평균 {1/rate:.0f}s/p, 남은 ~{eta/60:.0f}분")

    print(f"\n✓ 완료: {done_now}p 신규 번역, {skipped}p 스킵, {len(failed)}p 실패")
    if failed:
        print(f"  실패 페이지: {failed}")

    # 텔레그램 알림 (환경변수 설정 시만)
    try:
        sys.path.insert(0, str(ROOT.parent.parent / "scripts"))
        from telegram_notifier import send, is_configured
        if is_configured():
            book_titles = {1251: "아서왕의 죽음", 1232: "군주론", 1399: "안나 카레리나"}
            title = book_titles.get(book_id, f"pg{book_id}")
            msg = (f"📚 *{title} 번역 진행*\n\n"
                   f"신규: {done_now}p\n스킵: {skipped}p\n실패: {len(failed)}p")
            if failed:
                msg += f"\n실패 페이지: {failed}"
            send(msg)
    except Exception:
        pass


if __name__ == "__main__":
    main()
