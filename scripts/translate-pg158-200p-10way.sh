#!/usr/bin/env bash
# pg158 엠마 — 미번역 페이지 중 앞 200개를 10워커 stride 분배로 번역
# 끝나면 검수 + git commit + subtree push + 텔레그램 알림

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
echo "=== pg158 엠마 200p 10분할 번역 시작: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
echo "================================================================"

export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"
echo "claude: $(which claude || echo NOT_FOUND)"

cd /home/purple/ai-ceo-os/projects/bookmap

START_TS=$(date +%s)
notify "📚 pg158 엠마 200p 10분할 번역 시작"

# 1) 미번역 페이지 중 앞 200개를 10워커로 stride 분배
read -r -a WORKER_PAGES <<< "$(python3 <<'PYEOF'
import re
from pathlib import Path
F = Path('public/translations/pg158')
nums = []
for p in sorted(F.glob('p[0-9]*.json'), key=lambda x: int(re.match(r'p(\d+)', x.name).group(1))):
    if p.name.startswith('src_'): continue
    if not re.search(r'[가-힣]', p.read_text(encoding='utf-8')):
        nums.append(int(re.match(r'p(\d+)', p.name).group(1)))
nums = nums[:200]
print(' '.join(','.join(str(n) for n in nums[w::10]) for w in range(10)))
PYEOF
)"

echo "분배된 페이지 (워커별):"
for i in "${!WORKER_PAGES[@]}"; do
  echo "  w${i}: ${WORKER_PAGES[$i]}"
done

# 2) 10워커 spawn
PIDS=()
for W in 0 1 2 3 4 5 6 7 8 9; do
  PAGES="${WORKER_PAGES[$W]}"
  WLOG="/home/purple/ai-ceo-os/tasks/pg158-200p-w${W}.log"
  : > "$WLOG"
  python3 scripts/translate-worker.py --book 158 --pages "$PAGES" --log "$WLOG" >> "$WLOG" 2>&1 &
  PIDS+=($!)
  echo "worker $W pid=$! count=$(echo "$PAGES" | tr ',' '\n' | wc -l)"
done

# 3) 대기
for pid in "${PIDS[@]}"; do
  wait "$pid" || echo "worker pid=$pid exited non-zero"
done

# 4) 검수
RESULT=$(python3 - <<'PYEOF'
import re
from pathlib import Path
F = Path('public/translations/pg158')
tx = ut = 0
for p in F.glob('p[0-9]*.json'):
    if p.name.startswith('src_'): continue
    if re.search(r'[가-힣]', p.read_text(encoding='utf-8')):
        tx += 1
    else:
        ut += 1
total = tx + ut
print(f'pg158: 번역됨 {tx}/{total}  남은 {ut}p')
PYEOF
)
echo "$RESULT"
END_TS=$(date +%s)
ELAPSED=$(( (END_TS - START_TS) / 60 ))

# 5) git commit + push
cd /home/purple/ai-ceo-os
if [ -n "$(git status --short projects/bookmap/public/translations/pg158/ 2>/dev/null)" ]; then
  git add projects/bookmap/public/translations/pg158/
  MSG="feat: 엠마(pg158) 200p 10분할 번역 진행"
  if git commit -m "$MSG

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"; then
    if git subtree push --prefix=projects/bookmap purplelica-books master; then
      notify "🚀 pg158 엠마 200p commit + push 완료 (${ELAPSED}분)

${RESULT}"
    else
      notify "⚠️ pg158 commit 됐으나 subtree push 실패 — 수동 확인 필요

${RESULT}"
    fi
  else
    notify "⚠️ pg158 git commit 실패"
  fi
else
  echo "변경 없음, commit/push 건너뜀."
  notify "ℹ️ pg158 변경 없음 (${ELAPSED}분)
${RESULT}"
fi

echo "=== 종료: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
