#!/usr/bin/env python3
"""
ollama로 자동 영한 번역 (예약 실행용)

사용:
    python3 scripts/translate-with-ollama.py --book 1251
    python3 scripts/translate-with-ollama.py --book 1232 --model exaone-deep:32b

- _source_pg{id}.json (이미 있어야 함, 없으면 dump-source-pages.py 자동 실행)
- 페이지별로 ollama 호출 → public/translations/pg{id}/p{N}.json 저장
- 실패한 페이지는 빈 배열 유지 (다음 실행에서 재시도 가능)
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("[ERROR] pip install --user --break-system-packages requests")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
TRANS_DIR = ROOT / "public" / "translations"
BOOKS_DIR = ROOT / "public" / "books"

# 책별 고유명사 사전
GLOSSARIES = {
    1251: {
        "King Arthur": "아서 왕", "Arthur": "아서",
        "Merlin": "멀린", "Lancelot": "란슬롯", "Guinevere": "귀네비어",
        "Excalibur": "엑스칼리버", "Round Table": "원탁",
        "Sir Gawain": "가웨인 경", "Sir Tristram": "트리스트람 경",
        "Sir Galahad": "갈라하드 경", "Sir Percival": "퍼시벌 경",
        "Camelot": "카멜롯", "Britain": "브리튼",
    },
    1232: {
        "Machiavelli": "마키아벨리", "Prince": "군주",
        "Cesare Borgia": "체사레 보르자", "Borgia": "보르자",
        "Italy": "이탈리아", "Florence": "피렌체",
        "Rome": "로마", "Pope": "교황",
        "Lorenzo de' Medici": "로렌초 데 메디치", "Medici": "메디치",
    },
    1399: {
        "Anna Karenina": "안나 카레리나",
        "Karenin": "카레닌", "Levin": "레빈", "Kitty": "키티",
        "Stiva": "스티바", "Dolly": "돌리", "Vronsky": "브론스키",
        "Moscow": "모스크바", "St. Petersburg": "페테르부르크",
    },
}


def ensure_source(book_id: int) -> Path:
    """소스 파일 확인 — 없으면 dump-source-pages.py 실행"""
    src = TRANS_DIR / f"_source_pg{book_id}.json"
    if not src.exists():
        print(f"[INFO] 소스 없음 → dump-source-pages.py 실행")
        result = subprocess.run(
            ["python3", str(ROOT / "scripts" / "dump-source-pages.py"), "--book", str(book_id)],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"[ERROR] dump 실패: {result.stderr}")
            sys.exit(1)
        print(result.stdout.split("\n")[0])
    return src


def apply_glossary(text: str, gloss: dict) -> str:
    """LLM에게 힌트로 넣는 용 — 사실은 후처리 안 함, 프롬프트에서 처리"""
    return text


def build_prompt(paragraphs: list, gloss: dict, book_title: str) -> str:
    gloss_lines = "\n".join(f"- {k} = {v}" for k, v in gloss.items())
    paragraphs_json = json.dumps(paragraphs, ensure_ascii=False, indent=2)

    return f"""당신은 영한 번역 전문가입니다. 다음 영어 문단 배열을 자연스러운 현대 한국어로 번역하세요.

책 제목: {book_title}

고유명사 표기 통일:
{gloss_lines}

번역 규칙:
1. 입력 배열의 길이 = 출력 배열의 길이 (문단 합치기/분리 금지)
2. 빈 문단(\"\")은 빈 문단으로 유지
3. 영어 그대로 두지 말 것
4. 자연스러운 한국어 (직역 아닌 의역 우선)
5. 큰 따옴표는 "" 그대로, 단락 내 인용은 '' 사용

입력 (영어 문단 배열):
{paragraphs_json}

출력 형식: JSON 배열만 (다른 설명 절대 금지). 마크다운 ```json``` 블록 사용 OK.
"""


def call_ollama(prompt: str, model: str, timeout: int = 300) -> str:
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": 4096,
            "num_thread": 4,   # CPU 스레드 제한 (시스템 부하 방지)
        },
    }
    try:
        r = requests.post("http://localhost:11434/api/generate", json=payload, timeout=timeout)
        r.raise_for_status()
        return r.json().get("response", "")
    except Exception as e:
        print(f"  [ERROR] ollama 호출 실패: {e}")
        return ""


def parse_json_array(text: str, expected_len: int):
    """LLM 응답에서 JSON 배열 추출"""
    if not text:
        return None
    # <thought>...</thought> 제거 (exaone-deep 등)
    text = re.sub(r"<thought>.*?</thought>", "", text, flags=re.DOTALL)
    # ```json ... ``` 또는 ``` ... ``` 추출
    m = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    else:
        s = text.find("[")
        e = text.rfind("]")
        if s == -1 or e == -1 or e < s:
            return None
        text = text[s:e+1]
    try:
        arr = json.loads(text)
        if isinstance(arr, list) and len(arr) == expected_len:
            return arr
        # 길이 안 맞으면 폴백: 길이만 맞춰서 자르기/패딩
        if isinstance(arr, list):
            if len(arr) > expected_len:
                return arr[:expected_len]
            else:
                return arr + [""] * (expected_len - len(arr))
        return None
    except Exception:
        return None


def has_real_content(data) -> bool:
    if isinstance(data, list):
        return any(isinstance(x, str) and x.strip() for x in data)
    return False


def translate_book(book_id: int, model: str, skip_existing: bool = True) -> None:
    book_titles = {1251: "Le Morte d'Arthur (아서왕의 죽음)",
                   1232: "The Prince (군주론)",
                   1399: "Anna Karenina (안나 카레리나)"}
    book_title = book_titles.get(book_id, f"pg{book_id}")

    print(f"\n{'='*60}")
    print(f"📚 pg{book_id}: {book_title}")
    print(f"   모델: {model}")
    print(f"{'='*60}")

    src_path = ensure_source(book_id)
    pages = json.load(open(src_path, encoding="utf-8"))
    total = len(pages)
    print(f"[INFO] 소스: {total} 페이지")

    target_dir = TRANS_DIR / f"pg{book_id}"
    target_dir.mkdir(parents=True, exist_ok=True)

    gloss = GLOSSARIES.get(book_id, {})
    done, failed, skipped = 0, 0, 0
    start = time.time()

    for i, paragraphs in enumerate(pages, 1):
        out_path = target_dir / f"p{i}.json"

        # 기존 파일 체크
        if skip_existing and out_path.exists():
            try:
                existing = json.load(open(out_path, encoding="utf-8"))
                if has_real_content(existing):
                    skipped += 1
                    continue
            except Exception:
                pass

        # 빈 페이지 (소스에 문단 없음)
        if not paragraphs or all(not p.strip() for p in paragraphs):
            json.dump([""] * len(paragraphs), open(out_path, "w", encoding="utf-8"),
                      ensure_ascii=False)
            done += 1
            continue

        prompt = build_prompt(paragraphs, gloss, book_title)
        resp = call_ollama(prompt, model)
        translated = parse_json_array(resp, len(paragraphs))

        if translated is None:
            print(f"  [WARN] p{i} 번역/파싱 실패 → 빈 배열 유지")
            failed += 1
            continue

        json.dump(translated, open(out_path, "w", encoding="utf-8"), ensure_ascii=False)
        done += 1
        if i % 10 == 0 or i == total:
            elapsed = time.time() - start
            rate = (done + failed) / elapsed if elapsed else 0
            remaining = (total - i) / rate if rate else 0
            print(f"  [{i}/{total}] 완료 {done}, 실패 {failed}, 스킵 {skipped} "
                  f"(평균 {1/rate:.1f}s/p, 남은 ~{remaining/60:.0f}분)")

    elapsed = time.time() - start
    print(f"\n✓ 완료: {done}/{total} (실패 {failed}, 스킵 {skipped}) — 총 {elapsed/60:.1f}분")


def commit_and_push(book_ids: list) -> None:
    """번역 완료 후 git commit + subtree push"""
    os.chdir(ROOT.parent.parent)  # /home/purple/ai-ceo-os
    book_names = {1251: "아서왕의 죽음", 1232: "군주론", 1399: "안나 카레리나"}
    titles = ", ".join(f"{book_names.get(b, f'pg{b}')}(pg{b})" for b in book_ids)

    paths = [f"projects/bookmap/public/translations/pg{b}/" for b in book_ids]
    subprocess.run(["git", "add"] + paths, check=False)
    msg = f"feat: ollama 자동 번역 - {titles}"
    r = subprocess.run(["git", "commit", "-m", msg], capture_output=True, text=True)
    if r.returncode == 0:
        print(f"[GIT] commit: {msg}")
        push = subprocess.run(
            ["git", "subtree", "push", "--prefix=projects/bookmap", "purplelica-books", "master"],
            capture_output=True, text=True,
        )
        if push.returncode == 0:
            print("[GIT] subtree push 성공")
        else:
            print(f"[GIT] push 실패: {push.stderr[:500]}")
    else:
        print(f"[GIT] commit 스킵: {r.stdout[:200]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", type=int, action="append", required=True,
                    help="Project Gutenberg ID (반복 가능: --book 1251 --book 1232)")
    ap.add_argument("--model", default="qwen2.5:32b",
                    help="ollama 모델 (기본: qwen2.5:32b)")
    ap.add_argument("--no-skip", action="store_true",
                    help="기존 번역 완료 페이지도 다시 번역")
    ap.add_argument("--no-push", action="store_true",
                    help="git commit/push 안 함")
    args = ap.parse_args()

    for book_id in args.book:
        translate_book(book_id, args.model, skip_existing=not args.no_skip)

    if not args.no_push:
        commit_and_push(args.book)


if __name__ == "__main__":
    main()
