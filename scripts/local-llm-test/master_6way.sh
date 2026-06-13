#!/bin/bash
# 무인 6way 번역 비교 마스터 스크립트
# 1. 진행 중인 ollama pull 완료 대기 (Hermes/EEVE/A.X-Light/LDCC)
# 2. Bllossom-70B pull
# 3. A.X-4.0 72B safetensors 다운 + ollama create로 Q4_K_M 양자화
# 4. compare.py 6way 실행
# 5. report.py 보고서 생성
# 6. 텔레그램 알림

set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
LOG="$HERE/master_6way.log"
exec > >(tee -a "$LOG") 2>&1

cd /home/purple/ai-ceo-os

# Telegram env load
export TELEGRAM_BOT_TOKEN="$(grep -E '^TELEGRAM_BOT_TOKEN' "$HOME/.config/ai-ceo-os/telegram.env" 2>/dev/null | cut -d= -f2-)"
export TELEGRAM_CHAT_ID="$(grep -E '^TELEGRAM_CHAT_ID' "$HOME/.config/ai-ceo-os/telegram.env" 2>/dev/null | cut -d= -f2-)"

notify() {
  python3 -c "from scripts.telegram_notifier import send; send('''$1''')" 2>/dev/null || true
}

stage() {
  echo
  echo "===== [$(date '+%Y-%m-%d %H:%M:%S')] $1 ====="
}

stage "🚀 6way 무인 작업 시작"
notify "🚀 6way 무인 작업 시작 (예상 5~8시간)"

# ========== Stage 1: 진행 중인 다운로드 대기 ==========
stage "1. 진행 중인 ollama pull 완료 대기 (Hermes/EEVE/A.X-Light/LDCC)"
while pgrep -f "ollama pull" >/dev/null 2>&1; do
  sleep 60
done
stage "✓ 4개 모델 다운로드 완료"
ollama list
notify "✓ 1단계: Hermes/EEVE/A.X-Light/LDCC 다운로드 완료"

# ========== Stage 2: Bllossom-70B pull ==========
stage "2. Bllossom-70B 다운로드 (약 42GB)"
ollama pull hf.co/Bllossom/llama-3-Korean-Bllossom-70B-gguf-Q4_K_M
notify "✓ 2단계: Bllossom-70B 다운로드 완료"

# ========== Stage 3: A.X-4.0 72B safetensors → Q4_K_M ==========
stage "3-1. huggingface_hub 설치 (필요시)"
pip3 install --user --quiet huggingface_hub 2>&1 | tail -3
export PATH="$HOME/.local/bin:$PATH"

stage "3-2. skt/A.X-4.0 safetensors 다운로드 (144GB, 약 30~60분)"
AX_DIR="/home/purple/models/ax40-orig"
mkdir -p "$AX_DIR"
huggingface-cli download skt/A.X-4.0 \
  --local-dir "$AX_DIR" \
  --local-dir-use-symlinks False 2>&1 | tail -5
notify "✓ 3-1단계: A.X-4.0 safetensors 144GB 다운 완료, 양자화 시작"

stage "3-3. ollama create로 Q4_K_M 양자화 (약 1~3시간)"
MODELFILE="/tmp/ax40.modelfile"
echo "FROM $AX_DIR" > "$MODELFILE"
ollama create ax40-q4 --experimental --quantize q4_K_M -f "$MODELFILE" 2>&1 | tail -20
notify "✓ 3-2단계: A.X-4.0 72B Q4_K_M 양자화 완료"

stage "3-4. 임시 safetensors 정리 (144GB 회수)"
rm -rf "$AX_DIR"
df -h /

# ========== Stage 4: 6way 번역 ==========
stage "4. 6way compare.py 실행"
# 새 6개 모델만 비교
NEW_MODELS=$(ollama list | awk 'NR>1 {print $1}' | grep -E "(hermes|eeve|bllossom|A\.X|ax40|LDCC|ldcc)" | tr '\n' ',' | sed 's/,$//')
echo "감지된 새 모델: $NEW_MODELS"
notify "✓ 4단계: 6way 번역 시작 — 모델: $NEW_MODELS"

cd "$HERE"
# claude.json은 이미 있으므로 skip됨. 새 모델만 돌아감.
MODELS="$NEW_MODELS" python3 -u compare.py

# ========== Stage 5: 보고서 ==========
stage "5. REPORT.md 재생성"
python3 -u report.py

# 한자/누수 정량 분석 추가
stage "5-2. 품질 정량 분석"
python3 -u <<'PYEOF'
import json, re
from pathlib import Path
RESULTS = Path(__file__).parent if False else Path("/home/purple/ai-ceo-os/projects/bookmap/scripts/local-llm-test/results")
out = []
out.append("# 6way 품질 정량 분석\n")
out.append(f"- 생성: {__import__('datetime').datetime.now().isoformat(timespec='seconds')}\n\n")
out.append("| 모델 | 소요 | 단락 | 한자누수 | Claude대비보존율 |\n")
out.append("|:---|---:|:---:|---:|---:|\n")
claude = json.loads((RESULTS / "claude.json").read_text())
claude_chars = sum(len(t) for t in claude["translations"])
for f in sorted(RESULTS.glob("*.json")):
    if f.name.endswith(".bak"): continue
    d = json.loads(f.read_text())
    name = d["name"]
    sec = d["elapsed_sec"]
    parsed = d["parsed_count"]
    trans = d.get("translations", [])
    cjk = sum(len(re.findall(r'[一-鿿]', t)) for t in trans)
    total = sum(len(t) for t in trans)
    ratio = total / claude_chars * 100 if claude_chars else 0
    out.append(f"| {name} | {sec:.0f}s | {parsed}/17 | {cjk}자 | {ratio:.0f}% |\n")
(RESULTS / "QUALITY_SUMMARY.md").write_text("".join(out), encoding="utf-8")
print("✓ QUALITY_SUMMARY.md 생성")
print("".join(out))
PYEOF

# ========== Stage 6: 텔레그램 최종 알림 ==========
stage "6. 텔레그램 최종 알림"
SUMMARY_FILE="$HERE/results/QUALITY_SUMMARY.md"
if [ -f "$SUMMARY_FILE" ]; then
  SUMMARY=$(cat "$SUMMARY_FILE")
else
  SUMMARY="결과 파일 미발견"
fi
notify "🎉 6way 완료!

$SUMMARY

REPORT.md: $HERE/REPORT.md
QUALITY_SUMMARY.md: $SUMMARY_FILE"

stage "🎉 master_6way 완료"
