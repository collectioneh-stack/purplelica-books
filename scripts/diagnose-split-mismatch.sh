#!/usr/bin/env bash
# #27 완료 대기 후 #29 분할 불일치 진단 + 시뮬레이션
# pg158·pg1404 대상. read-only(파일 수정 0). 결과 텔레그램 보고.

set -u
LOG=/home/purple/ai-ceo-os/tasks/translation-cron.log
exec >> "$LOG" 2>&1

export TELEGRAM_BOT_TOKEN="$(grep -E '^TELEGRAM_BOT_TOKEN' "$HOME/.config/ai-ceo-os/telegram.env" 2>/dev/null | cut -d= -f2-)"
export TELEGRAM_CHAT_ID="$(grep -E '^TELEGRAM_CHAT_ID' "$HOME/.config/ai-ceo-os/telegram.env" 2>/dev/null | cut -d= -f2-)"
notify() {
  python3 -c "from scripts.telegram_notifier import send; send('''$1''')" 2>/dev/null || true
}

cd /home/purple/ai-ceo-os/projects/bookmap

echo ""
echo "================================================================"
echo "=== #29 분할 불일치 진단 대기 시작: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
echo "================================================================"

# #27 (3권 retry) 완료 대기
WAIT_START=$(date +%s)
while pgrep -f "translate-book-15way.sh 219 209 74" >/dev/null 2>&1; do
  sleep 60
done
WAIT_END=$(date +%s)
WAITED=$(( (WAIT_END - WAIT_START) / 60 ))
echo "$(date '+%H:%M:%S') #27 완료 (${WAITED}분 대기), #29 진단 시작"

# 진단 + 시뮬레이션
REPORT=$(python3 - <<'PYEOF'
import json, re
from pathlib import Path

T = Path('public/translations')
report = []
report.append("📊 #29 분할 불일치 진단 결과\n")

for bid in ['pg158', 'pg1404']:
    folder = T/bid
    src_f = T/f'_source_{bid}.json'
    if not src_f.exists() or not folder.exists():
        report.append(f"\n{bid}: 파일 누락")
        continue
    src = json.load(open(src_f))
    src_words = sum(sum(len(p.split()) for p in page) for page in src)
    src_paras = sum(len(page) for page in src)

    pages = sorted(folder.glob('p[0-9]*.json'), key=lambda p: int(re.match(r'p(\d+)', p.name).group(1)))
    pages = [p for p in pages if not p.name.startswith('src_')]
    disk_paras = sum(len(json.loads(p.read_text(encoding='utf-8'))) for p in pages)
    tx = sum(1 for p in pages if re.search(r'[가-힣]', p.read_text(encoding='utf-8')))
    ut = len(pages) - tx
    miss_pages = [int(re.match(r'p(\d+)', p.name).group(1)) for p in pages
                  if not re.search(r'[가-힣]', p.read_text(encoding='utf-8'))]

    # 새 _source v2 시뮬레이션 — 단어 600w 단위로 재분할
    flat_paras = [p for page in src for p in page]
    v2_pages = []
    current_page = []
    current_words = 0
    for p in flat_paras:
        wc = len(p.split())
        if current_words + wc > 600 and current_page:
            v2_pages.append(current_page)
            current_page = []
            current_words = 0
        current_page.append(p)
        current_words += wc
    if current_page:
        v2_pages.append(current_page)

    match = abs(len(v2_pages) - len(pages))
    quality = "✅ 양호" if match <= 3 else "⚠️ 큰 차이" if match <= 10 else "❌ 매칭 불가"

    report.append(f"\n{bid}:")
    report.append(f"  _source: {len(src)}p, {src_paras}단락, {src_words}단어")
    report.append(f"  디스크: {len(pages)}p, {disk_paras}단락, 번역 {tx}/{len(pages)}")
    report.append(f"  미번역 페이지 위치: {miss_pages[:15]}{'...' if len(miss_pages)>15 else ''}")
    report.append(f"  새 _source v2 시뮬: {len(v2_pages)}p (디스크 {len(pages)}p와 차이 {match})")
    report.append(f"  매핑 품질: {quality}")
    if match <= 3:
        report.append(f"  → 600w 재분할로 자동 복구 가능성 높음")
    elif match <= 10:
        report.append(f"  → 부분 매칭 가능, 앵커(챕터) 보정 필요")
    else:
        report.append(f"  → 단순 600w 재분할로 안 됨. 챕터 앵커 기반 정밀 매핑 필요")

report.append("\n💡 다음 단계: 매핑 품질 ✅인 책만 자동 복구 시도. ⚠️/❌는 수동 검수 후 결정.")
print('\n'.join(report))
PYEOF
)
echo "$REPORT"
notify "$REPORT"

echo ""
echo "=== #29 진단 종료: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
