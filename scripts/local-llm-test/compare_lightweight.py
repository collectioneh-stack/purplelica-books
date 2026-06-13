"""
경량모델(qwen2.5:7b) 단락별 1개씩 호출 — 6way 실패 원인(출력 잘림 + 추론 누출) 회피.

권장방법 적용:
- 비추론 모델만 사용 (qwen2.5 family)
- 단락별 분할 호출 (한 번에 1단락 → 출력 잘림 0%)
- JSON 강요 폐기 (plain Korean으로 받음 → 파싱 실패 0%)
- num_predict 1024 (단락당 충분)
- keep_alive 유지 (모델 17번 reload 방지)
"""
import json, time, sys
from pathlib import Path
import urllib.request

HERE = Path(__file__).parent
INPUT = HERE / "test_input.json"
RESULTS = HERE / "results"
RESULTS.mkdir(exist_ok=True)

MODEL = "qwen2.5:7b"
OUT = RESULTS / f"{MODEL.replace(':', '_')}_perpara.json"

pages = json.loads(INPUT.read_text(encoding="utf-8"))
print(f"📖 입력: {len(pages)}단락 / 총 {sum(len(p) for p in pages)}자")
print(f"🤖 모델: {MODEL} (단락별 1개씩 호출)")

translations = []
overall_start = time.time()

for idx, para in enumerate(pages):
    prompt = (
        "다음 영어 단락을 자연스럽고 유려한 한국어로 번역하세요. "
        "번역문만 출력하고 다른 설명, 따옴표, 머리말은 일절 붙이지 마세요.\n\n"
        f"영어 단락:\n{para}\n\n한국어 번역:"
    )
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "keep_alive": "10m",
        "options": {
            "temperature": 0.3,
            "num_predict": 1024,
            "num_thread": 4,
        },
    }
    start = time.time()
    try:
        req = urllib.request.Request(
            "http://localhost:11434/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=600) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        elapsed = time.time() - start
        text = (body.get("response") or "").strip()
        # 흔한 잡음 제거: 앞뒤 따옴표 / "한국어 번역:" 머리말
        for prefix in ("한국어 번역:", "번역:", "Korean:", "Translation:"):
            if text.startswith(prefix):
                text = text[len(prefix):].strip()
        text = text.strip('"').strip()
        translations.append(text)
        print(f"  [{idx+1:2d}/{len(pages)}] {elapsed:5.1f}초 / {len(text):4d}자")
    except Exception as e:
        print(f"  [{idx+1:2d}/{len(pages)}] ❌ {e}")
        translations.append(f"_(실패: {e})_")

total = time.time() - overall_start
ok_count = sum(1 for t in translations if not t.startswith("_(실패"))

OUT.write_text(json.dumps({
    "name": f"{MODEL} (per-paragraph)",
    "method": "단락별 1개씩 호출",
    "elapsed_sec": round(total, 1),
    "parsed_count": ok_count,
    "translations": translations,
    "raw_preview": "",
}, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"\n✅ 완료: 총 {total:.1f}초 / 성공 {ok_count}/{len(pages)} / 저장 {OUT.name}")
