#!/usr/bin/env bash
# pg158 엠마 — 현재 200p 진행 워커 종료 대기 후, 잔여 미번역 페이지를 15분할로 처리.
# translate-book-15way.sh를 호출 (자체 검수 + commit + subtree push + 텔레그램 알림 포함).

set -u
LOG=/home/purple/ai-ceo-os/tasks/translation-cron.log
mkdir -p "$(dirname "$LOG")"
exec >> "$LOG" 2>&1

# telegram env
export TELEGRAM_BOT_TOKEN="$(grep -E '^TELEGRAM_BOT_TOKEN' "$HOME/.config/ai-ceo-os/telegram.env" 2>/dev/null | cut -d= -f2-)"
export TELEGRAM_CHAT_ID="$(grep -E '^TELEGRAM_CHAT_ID' "$HOME/.config/ai-ceo-os/telegram.env" 2>/dev/null | cut -d= -f2-)"
notify() {
  python3 -c "from scripts.telegram_notifier import send; send('''$1''')" 2>/dev/null || true
}

echo ""
echo "================================================================"
echo "=== pg158 잔여 15분할 자동 진행 대기: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
echo "================================================================"

cd /home/purple/ai-ceo-os/projects/bookmap

# 200p 워커 종료 대기
echo "$(date '+%H:%M:%S') 현재 pg158 200p 진행 워커 종료 대기..."
WAIT_START=$(date +%s)
while pgrep -f "translate-worker.py --book 158" >/dev/null 2>&1; do
  sleep 60
done
WAIT_END=$(date +%s)
WAITED=$(( (WAIT_END - WAIT_START) / 60 ))
echo "$(date '+%H:%M:%S') 200p 진행 종료 (${WAITED}분 대기), 잔여 15분할 시작"
notify "📚 pg158 200p 완료 감지 (${WAITED}분 대기) → 잔여 15분할 자동 시작"

# 잔여 페이지 사전 확인
REMAINING=$(python3 -c "
import re
from pathlib import Path
F = Path('public/translations/pg158')
ut = sum(1 for p in F.glob('p[0-9]*.json') if not p.name.startswith('src_') and not re.search(r'[가-힣]', p.read_text(encoding='utf-8')))
print(ut)
")
echo "잔여 미번역: ${REMAINING}p"
notify "📊 pg158 잔여 ${REMAINING}p, 15분할 시작"

# translate-book-15way.sh 호출 (스킵 로직 + commit + push + 텔레그램 자체 포함)
bash scripts/translate-book-15way.sh 158

echo "=== pg158 잔여 처리 종료: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
