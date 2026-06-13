#!/usr/bin/env bash
# pg2268 안토니우스 + pg67 미국의 흑인 경험 + pg7849 심판
# 각 책 5워커 stride 분배 → 합 15워커 동시
# 끝나면 commit + push + 텔레그램

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
echo "=== 3권 병렬 (각 5워커, 합 15워커) 시작: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
echo "================================================================"
notify "🚀 3권 병렬 번역 시작: pg2268·pg67·pg7849 (각 5워커)"

START_ALL=$(date +%s)

# 1) 각 책 _source 생성
for B in 2268 67 7849; do
  SRC="public/translations/_source_pg${B}.json"
  if [ ! -f "$SRC" ]; then
    python3 scripts/dump-source-pages.py --book "$B" 2>&1 | tail -3
  fi
done

# 2) 각 책 워커 5개 spawn
ALL_PIDS=()
for B in 2268 67 7849; do
  SRC="public/translations/_source_pg${B}.json"
  if [ ! -f "$SRC" ]; then
    echo "WARN: pg${B} _source 없음 — 건너뜀"
    notify "⚠️ pg${B} _source 분할 실패 — 건너뜀"
    continue
  fi
  N=$(python3 -c "import json; print(len(json.load(open('$SRC'))))")
  if [ "$N" -eq 0 ]; then
    echo "WARN: pg${B} _source 0페이지 — 건너뜀"
    notify "⚠️ pg${B} _source 0p — 건너뜀 (셰익스피어 희곡 분할 실패 가능)"
    continue
  fi
  mkdir -p "public/translations/pg${B}"
  echo "pg${B}: 총 ${N}p, 5워커 spawn"
  for W in 0 1 2 3 4; do
    PAGES=$(python3 -c "
N = ${N}; W = ${W}
print(','.join(str(i) for i in range(W + 1, N + 1, 5)))
")
    WLOG="/home/purple/ai-ceo-os/tasks/cron-pg${B}-w${W}.log"
    : > "$WLOG"
    python3 scripts/translate-worker.py --book "$B" --pages "$PAGES" --log "$WLOG" >> "$WLOG" 2>&1 &
    ALL_PIDS+=($!)
    echo "  worker $W pid=$! pages=$PAGES"
  done
done

# 3) 모든 워커 대기
for pid in "${ALL_PIDS[@]}"; do
  wait "$pid" || echo "worker pid=$pid 비정상 종료"
done

# 4) 검수
RESULT=$(python3 - <<'PYEOF'
import re
from pathlib import Path
T = Path('public/translations')
lines = []
for B in ['pg2268','pg67','pg7849']:
    F = T/B
    if not F.exists():
        lines.append(f"  {B}: 폴더 없음")
        continue
    pages = [p for p in F.iterdir() if re.match(r'^p\d+\.json$', p.name)]
    if not pages:
        lines.append(f"  {B}: 페이지 0")
        continue
    tx = sum(1 for p in pages if re.search(r'[가-힣]', p.read_text(encoding='utf-8')))
    lines.append(f"  {B}: 번역됨 {tx}/{len(pages)}")
print('\n'.join(lines))
PYEOF
)
echo "$RESULT"
END_ALL=$(date +%s)
ELAPSED=$(( (END_ALL - START_ALL) / 60 ))

# 5) git commit + push
cd /home/purple/ai-ceo-os
CHANGED=()
for B in 2268 67 7849; do
  if [ -n "$(git status --short projects/bookmap/public/translations/pg${B}/ 2>/dev/null)" ]; then
    CHANGED+=("$B")
    git add "projects/bookmap/public/translations/pg${B}/"
  fi
done
if [ ${#CHANGED[@]} -gt 0 ]; then
  MSG="feat: 3권 5워커씩 병렬 번역 (${CHANGED[*]})"
  if git commit -m "$MSG

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"; then
    if git subtree push --prefix=projects/bookmap purplelica-books master; then
      notify "🚀 pg${CHANGED[*]} commit + push 완료 (${ELAPSED}분)
${RESULT}"
    else
      notify "⚠️ commit 됐으나 push 실패
${RESULT}"
    fi
  fi
else
  notify "ℹ️ 변경 없음 (${ELAPSED}분)
${RESULT}"
fi

notify "🎉 3권 병렬 종료 (총 ${ELAPSED}분)"
echo "=== 종료: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
