#!/usr/bin/env python3
import json
import os
import re
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("[ERROR] pip install requests")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
TRANS_DIR = ROOT / "public" / "translations"
SRC_PATH = TRANS_DIR / "_source_pg46.json"
OUT_DIR = TRANS_DIR / "pg46_gemini"
OUT_DIR.mkdir(parents=True, exist_ok=True)

GLOSSARY = {
    "Scrooge": "스크루지", "Marley": "말리", "Jacob Marley": "제이콥 말리",
    "Bob Cratchit": "밥 크래칫", "Cratchit": "크래칫",
    "Tiny Tim": "꼬마 팀", "Tim": "팀",
    "Fezziwig": "페지위그", "Fred": "프레드", "Belle": "벨",
    "Ghost of Christmas Past": "과거의 크리스마스 유령",
    "Ghost of Christmas Present": "현재의 크리스마스 유령",
    "Ghost of Christmas Yet to Come": "미래의 크리스마스 유령",
}

def build_prompt(paragraphs: list, gloss: dict, book_title: str) -> str:
    gloss_lines = "\n".join(f"- {k} = {v}" for k, v in gloss.items())
    paragraphs_json = json.dumps(paragraphs, ensure_ascii=False, indent=2)

    return f"""당신은 영한 번역 전문가입니다. 다음 영어 문단 배열을 자연스러운 현대 한국어로 번역하세요.

책 제목: {book_title}

고유명사 표기 통일:
{gloss_lines}

번역 규칙:
1. 입력 배열의 길이 = 출력 배열의 길이 (문단 합치기/분리 금지)
2. 빈 문단("")은 빈 문단으로 유지
3. 영어 그대로 두지 말 것
4. 자연스러운 한국어 (직역 아닌 의역 우선)
5. 큰 따옴표는 "" 그대로, 단락 내 인용은 '' 사용

입력 (영어 문단 배열):
{paragraphs_json}

출력 형식: JSON 배열만 (다른 설명 절대 금지). 마크다운 ```json``` 블록 사용 OK.
"""

def call_ollama(prompt: str, model: str = "exaone-deep:7.8b", timeout: int = 300) -> str:
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": 4096,
            "num_thread": 8,
        },
    }
    try:
        r = requests.post("http://localhost:11434/api/generate", json=payload, timeout=timeout)
        r.raise_for_status()
        resp_json = r.json()
        resp_text = resp_json.get("response", "")
        if not resp_text:
            print(f"      [DEBUG] Empty response! Status: {r.status_code}, Keys: {list(resp_json.keys())}, Full: {resp_json}")
        return resp_text
    except Exception as e:
        print(f"  [ERROR] ollama 호출 실패: {e}")
        return ""

def parse_json_array(text: str, expected_len: int):
    if not text:
        return None
    # Remove thought blocks
    text = re.sub(r"<thought>.*?</thought>", "", text, flags=re.DOTALL)
    
    # Try markdown code blocks first
    m = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.DOTALL)
    if m:
        try:
            arr = json.loads(m.group(1))
            if isinstance(arr, list):
                if len(arr) == expected_len:
                    return arr
                if len(arr) > expected_len:
                    return arr[:expected_len]
                else:
                    return arr + [""] * (expected_len - len(arr))
        except:
            pass

    # Try matching all bracket pairs
    for s_idx in range(len(text)):
        if text[s_idx] == '[':
            for e_idx in range(len(text) - 1, s_idx, -1):
                if text[e_idx] == ']':
                    candidate = text[s_idx:e_idx+1]
                    try:
                        arr = json.loads(candidate)
                        if isinstance(arr, list):
                            if len(arr) == expected_len:
                                return arr
                            if len(arr) > expected_len:
                                return arr[:expected_len]
                            else:
                                return arr + [""] * (expected_len - len(arr))
                    except:
                        pass
    return None

def main():
    if not SRC_PATH.exists():
        print(f"[ERROR] Source file {SRC_PATH} not found.")
        sys.exit(1)
        
    pages = json.load(open(SRC_PATH, encoding="utf-8"))
    total = len(pages)
    print(f"Start translating pg46 (A Christmas Carol) - {total} pages")
    
    start_time = time.time()
    for i, paragraphs in enumerate(pages, 1):
        out_path = OUT_DIR / f"p{i}.json"
        
        # Skip if already exists and is valid
        if out_path.exists():
            try:
                existing = json.load(open(out_path, encoding="utf-8"))
                if any(x.strip() for x in existing if isinstance(x, str)):
                    print(f"  p{i}/{total} skipped (already translated)")
                    continue
            except:
                pass
                
        if not paragraphs or all(not p.strip() for p in paragraphs):
            json.dump([""] * len(paragraphs), open(out_path, "w", encoding="utf-8"), ensure_ascii=False)
            print(f"  p{i}/{total} written (empty page)")
            continue
            
        print(f"  p{i}/{total} translating ({len(paragraphs)} paragraphs)...")
        paragraphs_clean = [p.replace('***', '---') for p in paragraphs]
        prompt = build_prompt(paragraphs_clean, GLOSSARY, "A Christmas Carol")
        resp = call_ollama(prompt, "exaone-deep:7.8b")
        translated = parse_json_array(resp, len(paragraphs))
        
        if translated is None:
            # retry with lower thread count or just log failure
            print(f"  [WARN] p{i} translation failed, raw response: {repr(resp)[:200]}")
            print(f"  Prompt was: {repr(prompt)[:300]}")
            print(f"  Retrying once...")
            resp = call_ollama(prompt, "exaone-deep:7.8b")
            translated = parse_json_array(resp, len(paragraphs))
            
        if translated is None:
            print(f"  [ERROR] p{i} translation failed completely, raw response: {repr(resp)[:200]}")
            print(f"  Prompt was: {repr(prompt)[:300]}")
            translated = [""] * len(paragraphs)
            
        json.dump(translated, open(out_path, "w", encoding="utf-8"), ensure_ascii=False)
        
    print(f"Translation completed in {time.time() - start_time:.1f} seconds.")

if __name__ == "__main__":
    main()
