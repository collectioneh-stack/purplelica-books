#!/usr/bin/env bash
# 미완료 7권 즉시 재시도
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
echo "=== 미완료 7권 즉시 재시도: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
echo "================================================================"
notify "🔄 미완료 7권 즉시 재시도 시작 — pg526·pg219·pg209·pg863·pg308·pg408·pg74"

START_ALL=$(date +%s)

declare -A TITLE_MAP
TITLE_MAP[526]="야성의 부름 (잔여)"
TITLE_MAP[219]="어둠의 심장"
TITLE_MAP[209]="나사의 회전"
TITLE_MAP[863]="오페라의 유령"
TITLE_MAP[308]="이선 프롬"
TITLE_MAP[408]="각성"
TITLE_MAP[74]="톰 소여의 모험"

BOOKS=(526 219 209 863 308 408 74)

for B in "${BOOKS[@]}"; do
  TITLE="${TITLE_MAP[$B]}"
  echo ""
  echo "----- pg$B $TITLE 시작: $(date '+%H:%M:%S %Z') -----"
  notify "📖 pg$B $TITLE 재시도 시작"
  START=$(date +%s)

  bash scripts/translate-book-15way.sh "$B"

  END=$(date +%s)
  ELAPSED_BOOK=$(( (END - START) / 60 ))
  echo "----- pg$B $TITLE 종료: $(date '+%H:%M:%S %Z') (${ELAPSED_BOOK}분) -----"
done

END_ALL=$(date +%s)
TOTAL=$(( (END_ALL - START_ALL) / 60 ))

SUMMARY=$(python3 - <<'PYEOF'
import re
from pathlib import Path
T = Path('/home/purple/ai-ceo-os/projects/bookmap/public/translations')
lines = []
for bid in ['pg526','pg219','pg209','pg863','pg308','pg408','pg74']:
    F = T/bid
    if not F.exists():
        lines.append(f"  {bid}: NO_FOLDER")
        continue
    pages = [p for p in F.glob('p[0-9]*.json') if not p.name.startswith('src_')]
    tx = sum(1 for p in pages if re.search(r'[가-힣]', p.read_text(encoding='utf-8')))
    lines.append(f"  {bid}: {tx}/{len(pages)}")
print('\n'.join(lines))
PYEOF
)
notify "🎉 7권 재시도 완료 (총 ${TOTAL}분)
${SUMMARY}"

echo "=== 전체 종료: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
