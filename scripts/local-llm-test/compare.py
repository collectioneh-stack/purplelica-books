"""
로컬 LLM 번역 품질/속도 비교 스크립트
- 동일 페이지를 6개 모델(Claude + 로컬 5개)로 번역
- 문학 번역 품질 6-way 비교
"""
import json, os, re, subprocess, time, sys
from pathlib import Path
import urllib.request

HERE = Path(__file__).parent
INPUT = HERE / "test_input.json"
RESULTS = HERE / "results"
RESULTS.mkdir(exist_ok=True)

# 비교 대상 모델 (Claude는 별도 처리)
# 환경변수 MODELS="m1,m2,m3"로 override 가능
_env_models = os.environ.get("MODELS", "").strip()
if _env_models:
    LOCAL_MODELS = [m.strip() for m in _env_models.split(",") if m.strip()]
else:
    LOCAL_MODELS = [
        "exaone-deep:7.8b",
        "deepseek-r1:14b",
        "qwen2.5:32b",
        "exaone-deep:32b",
        "deepseek-r1:32b",
    ]

pages = json.loads(INPUT.read_text(encoding="utf-8"))
numbered = "\n\n".join(f"[{j}] {p}" for j, p in enumerate(pages))
PROMPT = (
    f"Translate each English paragraph below into natural, fluent Korean.\n"
    f"Reply ONLY with a JSON array of strings. No explanation, no markdown, no extra text.\n"
    f"The array must have exactly {len(pages)} elements in the same order.\n"
    f"Example: [\"번역1\", \"번역2\"]\n\n"
    f"English paragraphs:\n{numbered}"
)


def parse_translation(raw, expected_count):
    raw = re.sub(r"<think>[\s\S]*?</think>", "", raw, flags=re.IGNORECASE).strip()
    raw = re.sub(r"^```(?:json)?", "", raw, flags=re.MULTILINE).strip()
    raw = re.sub(r"```$", "", raw, flags=re.MULTILINE).strip()
    m = re.search(r"\[[\s\S]*\]", raw)
    if not m:
        return None, raw
    try:
        parsed = json.loads(m.group())
        if isinstance(parsed, list):
            return parsed, raw
    except Exception as e:
        return None, raw
    return None, raw


def save_result(name, elapsed, raw, parsed):
    out_path = RESULTS / f"{name.replace(':', '_').replace('/', '_')}.json"
    out_path.write_text(json.dumps({
        "name": name,
        "elapsed_sec": round(elapsed, 1),
        "raw_chars": len(raw),
        "parsed_count": len(parsed) if isinstance(parsed, list) else -1,
        "translations": parsed if isinstance(parsed, list) else [],
        "raw_preview": raw[:500] if not isinstance(parsed, list) else "",
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    ok = isinstance(parsed, list) and len(parsed) == len(pages)
    return ok


def run_claude():
    name = "claude"
    out_path = RESULTS / f"{name}.json"
    if out_path.exists():
        print(f"⏭  {name} (이미 존재)")
        return
    print(f"\n🟣 Claude CLI 번역...")
    start = time.time()
    try:
        result = subprocess.run(
            ["claude", "-p", "--output-format", "text", PROMPT],
            capture_output=True, text=True, timeout=300, encoding="utf-8"
        )
        elapsed = time.time() - start
        raw = result.stdout.strip()
        parsed, _ = parse_translation(raw, len(pages))
        ok = save_result(name, elapsed, raw, parsed)
        print(f"  {'✓' if ok else '⚠️'} {elapsed:.1f}초, 단락 {len(parsed) if parsed else 0}/{len(pages)}")
    except Exception as e:
        print(f"  ❌ {e}")


def ollama_stop(model):
    """현재 로드된 모델을 즉시 unload (VRAM 회수)."""
    try:
        subprocess.run(["ollama", "stop", model], capture_output=True, text=True, timeout=30)
    except Exception:
        pass


def run_local(model):
    name = model
    out_path = RESULTS / f"{name.replace(':', '_')}.json"
    if out_path.exists():
        print(f"⏭  {name} (이미 존재)")
        return
    # 모델이 실제 다운로드 됐는지 확인
    check = subprocess.run(["ollama", "list"], capture_output=True, text=True)
    if model.split(':')[0] not in check.stdout or model not in check.stdout:
        print(f"⏳ {model} 아직 다운로드 중 — 스킵")
        return

    print(f"\n🤖 {model} 번역 시작... (num_thread=4, keep_alive=0)")
    start = time.time()
    # HTTP API 사용: num_thread=4 (CPU 부하 제한), keep_alive=0 (호출 직후 unload → 한 번에 1개만 로드)
    payload = {
        "model": model,
        "prompt": PROMPT,
        "stream": False,
        "keep_alive": 0,
        "options": {
            "temperature": 0.3,
            "num_predict": 8192,
            "num_thread": 4,
        },
    }
    try:
        req = urllib.request.Request(
            "http://localhost:11434/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=3600) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        elapsed = time.time() - start
        raw = (body.get("response") or "").strip()
        parsed, _ = parse_translation(raw, len(pages))
        ok = save_result(name, elapsed, raw, parsed)
        print(f"  {'✓' if ok else '⚠️'} {elapsed:.1f}초, 단락 {len(parsed) if parsed else 0}/{len(pages)}")
    except Exception as e:
        print(f"  ❌ {e}")
    finally:
        # 안전망: keep_alive=0이지만 명시적으로 한 번 더 unload
        ollama_stop(model)


if __name__ == "__main__":
    print(f"📖 테스트 입력: {len(pages)}단락, 총 {sum(len(p) for p in pages)}자")
    run_claude()
    for m in LOCAL_MODELS:
        run_local(m)
    print("\n✅ 완료. results/ 폴더 확인.")
