"""
번역 결과 6-way 비교 보고서 생성
- results/*.json 읽어서 markdown 보고서 생성
- 속도 매트릭스 + 단락별 side-by-side
"""
import json
from pathlib import Path
from datetime import datetime

HERE = Path(__file__).parent
RESULTS = HERE / "results"
INPUT = HERE / "test_input.json"
META = HERE / "test_meta.json"
OUT = HERE / "REPORT.md"

# 모델별 표시 이름 + 순서
MODEL_ORDER = [
    ("claude", "Claude (기존)"),
    ("exaone-deep_7.8b", "EXAONE 7.8B"),
    ("exaone-deep_32b", "EXAONE 32B"),
    ("qwen2.5_32b", "Qwen2.5 32B"),
    ("deepseek-r1_14b", "DeepSeek-R1 14B"),
    ("deepseek-r1_32b", "DeepSeek-R1 32B"),
]

source = json.loads(INPUT.read_text(encoding="utf-8"))
meta = json.loads(META.read_text(encoding="utf-8"))

results = {}
for key, _ in MODEL_ORDER:
    fp = RESULTS / f"{key}.json"
    if fp.exists():
        results[key] = json.loads(fp.read_text(encoding="utf-8"))

lines = []
lines.append(f"# 로컬 LLM 번역 비교 보고서")
lines.append(f"")
lines.append(f"- **생성**: {datetime.now().isoformat(timespec='seconds')}")
lines.append(f"- **테스트 책**: {meta['title']} (pg{meta['book_id']}) — {meta['author']}")
lines.append(f"- **테스트 페이지**: {meta['source_page_index']+1}페이지, {meta['paragraph_count']}단락, {meta['total_chars']}자")
lines.append(f"")

# 속도 매트릭스
lines.append("## ⚡ 속도 / 안정성 매트릭스")
lines.append("")
lines.append("| 모델 | 소요(초) | 단락 파싱 | 성공률 | 추정 토큰/초 |")
lines.append("|:---|---:|:---:|:---:|---:|")
for key, name in MODEL_ORDER:
    if key not in results:
        lines.append(f"| {name} | — | — | 미실행/다운로드중 | — |")
        continue
    r = results[key]
    elapsed = r.get("elapsed_sec", 0)
    parsed = r.get("parsed_count", -1)
    expected = meta["paragraph_count"]
    ok_emoji = "✅" if parsed == expected else ("⚠️" if parsed > 0 else "❌")
    rate = f"{parsed}/{expected}"
    tps = round(r.get("raw_chars", 0) / 4 / elapsed, 1) if elapsed > 0 else 0
    lines.append(f"| {name} | {elapsed} | {rate} | {ok_emoji} | {tps} |")
lines.append("")

# Side-by-side 단락별 비교
lines.append("## 📖 단락별 번역 비교")
lines.append("")
for i, en_para in enumerate(source):
    lines.append(f"### 단락 {i+1}")
    lines.append("")
    lines.append(f"**[원문]**")
    lines.append(f"> {en_para}")
    lines.append("")
    for key, name in MODEL_ORDER:
        if key not in results:
            continue
        r = results[key]
        trs = r.get("translations", [])
        if i < len(trs):
            text = trs[i]
        else:
            text = "_(번역 누락)_"
        lines.append(f"**[{name}]**")
        lines.append(f"> {text}")
        lines.append("")
    lines.append("---")
    lines.append("")

# 정성 평가 영역 (CEO가 직접 채점)
lines.append("## 🎯 정성 평가 (CEO 직접 채점)")
lines.append("")
lines.append("각 모델 종합 1~5점:")
lines.append("")
lines.append("| 모델 | 자연스러움 | 문학성 | 정확도 | 종합 | 비고 |")
lines.append("|:---|:---:|:---:|:---:|:---:|:---|")
for _, name in MODEL_ORDER:
    lines.append(f"| {name} | / 5 | / 5 | / 5 | / 5 | |")
lines.append("")

# 권고
lines.append("## 💡 권고 (스크립트 자동)")
lines.append("")
fastest = None
fast_time = 999999
for key, name in MODEL_ORDER:
    if key == "claude" or key not in results:
        continue
    r = results[key]
    if r.get("parsed_count") == meta["paragraph_count"] and r.get("elapsed_sec", 999999) < fast_time:
        fastest = name
        fast_time = r["elapsed_sec"]

if fastest:
    lines.append(f"- 안정+빠른 로컬 모델: **{fastest}** ({fast_time}초)")
    lines.append(f"- 책 1권(평균 80페이지) 추정: 약 {round(fast_time * 80 / 60, 1)}분")
else:
    lines.append("- 아직 충분한 결과 없음")
lines.append("")

OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"✅ 보고서 생성: {OUT}")
print(f"   완료 모델: {list(results.keys())}")
print(f"   미완료: {[k for k, _ in MODEL_ORDER if k not in results]}")
