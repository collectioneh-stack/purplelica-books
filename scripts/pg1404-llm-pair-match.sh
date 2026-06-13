#!/usr/bin/env bash
# pg1404 빈 11p (p227-240) LLM 페어 매칭 분석
# 1) #27 완료 대기
# 2) 디스크 p226·p232·p234·p237·p241 한국어 마지막/첫 단락 → Claude CLI로 영어 원문 식별
# 3) _source(489p)에서 매칭 위치 검색
# 4) 빈 페이지 11p에 들어갈 영어 단락 위치 추정 + 텔레그램 보고
# 5) 적용은 사용자 결정 후 (이 스크립트는 read-only)

set -u
LOG=/home/purple/ai-ceo-os/tasks/translation-cron.log
exec >> "$LOG" 2>&1

export TELEGRAM_BOT_TOKEN="$(grep -E '^TELEGRAM_BOT_TOKEN' "$HOME/.config/ai-ceo-os/telegram.env" 2>/dev/null | cut -d= -f2-)"
export TELEGRAM_CHAT_ID="$(grep -E '^TELEGRAM_CHAT_ID' "$HOME/.config/ai-ceo-os/telegram.env" 2>/dev/null | cut -d= -f2-)"
notify() {
  python3 -c "from scripts.telegram_notifier import send; send('''$1''')" 2>/dev/null || true
}

export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"
cd /home/purple/ai-ceo-os/projects/bookmap

echo ""
echo "================================================================"
echo "=== pg1404 LLM 페어 매칭: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
echo "================================================================"

# #27 완료 대기
echo "$(date '+%H:%M:%S') #27 완료 대기..."
while pgrep -f "translate-book-15way.sh 219 209 74" >/dev/null 2>&1; do
  sleep 60
done
echo "$(date '+%H:%M:%S') #27 완료, 분석 시작"
notify "🔍 pg1404 LLM 페어 매칭 분석 시작 (빈 11p 영어 원문 추정)"

# 분석 — Python에서 처리
python3 - <<'PYEOF'
import json, re, subprocess, os, sys
from pathlib import Path

T = Path('public/translations')
SRC = json.load(open(T/'_source_pg1404.json'))
PAGES_DIR = T/'pg1404'

# 빈 페이지 위치
miss = [227,228,229,230,231,233,235,236,238,239,240]
# 빈 페이지 양쪽의 번역된 페이지
anchors = [226, 232, 234, 237, 241]

# 디스크에서 한국어 마지막/첫 단락 추출
def disk_paragraphs(n, position='last'):
    p = PAGES_DIR / f'p{n}.json'
    if not p.exists(): return None
    arr = json.loads(p.read_text(encoding='utf-8'))
    # 한국어 들어있는 단락만
    ko_paras = [x for x in arr if re.search(r'[가-힣]', x)]
    if not ko_paras: return None
    return ko_paras[-1] if position == 'last' else ko_paras[0]

print("=== 앵커 페이지 한국어 단락 ===")
for n in anchors:
    last = disk_paragraphs(n, 'last')
    first = disk_paragraphs(n, 'first')
    if last:
        print(f"  p{n} 마지막: {last[:80]}...")
    if first:
        print(f"  p{n} 첫번째: {first[:80]}...")

# Claude CLI로 한국어 → 영어 원문 식별 시도
def kor_to_eng_prompt(kor):
    return (
        f"Below is a Korean translation of a paragraph from 'The Federalist Papers'. "
        f"Identify the original English passage (translate back the meaning into formal 18th-century English, "
        f"and add 1-2 distinctive key phrases that would help me find it in the source).\n"
        f"Reply ONLY with the English passage, no explanation.\n\nKorean:\n{kor}"
    )

print()
print("=== p226 마지막 한국어 → 영어 식별 시도 ===")
p226_last = disk_paragraphs(226, 'last')
if p226_last:
    prompt = kor_to_eng_prompt(p226_last)
    try:
        r = subprocess.run(['claude','-p','--output-format','text', prompt],
            capture_output=True, text=True, timeout=120, encoding='utf-8')
        eng = r.stdout.strip()
        print(f"  추정 영어: {eng[:300]}")
        # _source에서 키 단어 검색
        flat = [p for page in SRC for p in page]
        # 영어 추정에서 핵심 단어 5개 (4글자 이상)
        keys = [w for w in re.findall(r'\b[A-Z][a-zA-Z]{4,}\b', eng)][:5]
        print(f"  검색 키: {keys}")
        # _source flat 단락 인덱스에서 매칭 시도
        matches = []
        for i, para in enumerate(flat):
            if all(k in para for k in keys[:3]) and keys[:3]:
                matches.append(i)
        print(f"  단락 인덱스 매칭: {matches[:5]}")
        # 페이지 인덱스 환산
        cum = 0
        page_idx = []
        for pi, page in enumerate(SRC):
            for _ in page:
                if cum in matches:
                    page_idx.append(pi+1)
                cum += 1
        print(f"  _source 페이지 인덱스: {sorted(set(page_idx))[:5]}")
    except Exception as e:
        print(f"  ERROR: {e}")

print()
print("⚠️ 분석 결과 검증 필요. 자동 적용 X — 사용자 결정 후 별도 워커 호출.")
PYEOF

echo ""
echo "=== 분석 종료: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
notify "✓ pg1404 페어 매칭 분석 종료. 결과는 translation-cron.log 확인."
