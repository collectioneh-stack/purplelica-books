#!/usr/bin/env bash
# 북맵 책 15병행 번역 — 번역 전용 (git commit / subtree push 없음).
# 원본 translate-book-15way.sh 의 step 1~7 만 수행. CEO 요청: "번역만 해줘".
# 사용법: translate-book-15way-noPush.sh <BOOK_ID> [<BOOK_ID2> ...]

set -u
LOG=/home/purple/ai-ceo-os/tasks/translation-cron.log
mkdir -p "$(dirname "$LOG")"
exec >> "$LOG" 2>&1

# telegram env load
export TELEGRAM_BOT_TOKEN="$(grep -E '^TELEGRAM_BOT_TOKEN' "$HOME/.config/ai-ceo-os/telegram.env" 2>/dev/null | cut -d= -f2-)"
export TELEGRAM_CHAT_ID="$(grep -E '^TELEGRAM_CHAT_ID' "$HOME/.config/ai-ceo-os/telegram.env" 2>/dev/null | cut -d= -f2-)"
notify() {
  python3 -c "from scripts.telegram_notifier import send; send('''$1''')" 2>/dev/null || true
}

echo ""
echo "================================================================"
echo "=== 15병행 번역(번역전용/NO-PUSH) 시작: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
echo "=== 인자: $* ==="
echo "================================================================"

# claude CLI 경로 (nvm)
export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"
echo "claude: $(which claude || echo NOT_FOUND) / $(claude --version 2>&1 | head -1)"

cd /home/purple/ai-ceo-os/projects/bookmap || { echo "FATAL: bookmap dir not found"; exit 1; }

notify "📚 15분할 번역(번역전용/배포안함) 시작: $*"

for BOOK in "$@"; do
  echo ""
  echo "--- pg${BOOK} 시작: $(date '+%H:%M:%S %Z') ---"
  START_TS=$(date +%s)

  # 1) 소스 분할
  SRC="public/translations/_source_pg${BOOK}.json"
  if [ ! -f "$SRC" ]; then
    python3 scripts/dump-source-pages.py --book "$BOOK"
  fi
  if [ ! -f "$SRC" ]; then
    echo "WARN: pg${BOOK} 소스 분할 실패. 건너뜀."
    notify "⚠️ pg${BOOK} 소스 분할 실패"
    continue
  fi

  # 2) 번역 폴더 보장
  OUT_DIR="public/translations/pg${BOOK}"
  mkdir -p "$OUT_DIR"

  # 3) 빈 placeholder 정리 단계 — CEO 명령에 따라 비활성화 (파일 삭제 절대 금지).
  echo "placeholder 삭제 단계 SKIP (보존 정책)"

  # 4) 페이지 수
  N=$(python3 -c "import json; print(len(json.load(open('public/translations/_source_pg${BOOK}.json'))))")
  echo "총 ${N} 페이지"

  # 5) 15개 워커 분배 — stride 방식 (워커 W는 페이지 W+1, W+16, W+31, ...)
  PIDS=()
  for W in 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14; do
    PAGES=$(python3 -c "
N = ${N}; W = ${W}
print(','.join(str(i) for i in range(W + 1, N + 1, 15)))
")
    WLOG="/home/purple/ai-ceo-os/tasks/cron-pg${BOOK}-w${W}.log"
    : > "$WLOG"
    python3 scripts/translate-worker.py --book "$BOOK" --pages "$PAGES" --log "$WLOG" >> "$WLOG" 2>&1 &
    PIDS+=($!)
    echo "worker $W pid=$! pages=$PAGES"
  done

  # 6) 모든 워커 대기
  for pid in "${PIDS[@]}"; do
    wait "$pid" || echo "worker pid=$pid exited non-zero"
  done

  # 7) 결과 검증
  RESULT=$(python3 - <<PYEOF
import json, os
B = ${BOOK}
src = json.load(open(f'public/translations/_source_pg{B}.json'))
empty=[]; mismatch=[]; ok=0
for i in range(1, len(src)+1):
    p = f'public/translations/pg{B}/p{i}.json'
    if not os.path.exists(p):
        empty.append(i); continue
    arr = json.load(open(p))
    if not any(s.strip() for s in arr):
        empty.append(i)
    elif len(arr) != len(src[i-1]):
        mismatch.append((i, len(src[i-1]), len(arr)))
    else:
        ok += 1
print(f'pg{B} 검수: ok={ok}/{len(src)}  empty={len(empty)}  mismatch={len(mismatch)}')
if empty: print(f'  empty pages: {empty[:30]}{"..." if len(empty)>30 else ""}')
if mismatch: print(f'  mismatch: {mismatch[:10]}{"..." if len(mismatch)>10 else ""}')
PYEOF
)
  echo "$RESULT"
  END_TS=$(date +%s)
  ELAPSED=$(( (END_TS - START_TS) / 60 ))
  notify "✓ pg${BOOK} 1라운드 완료 (${ELAPSED}분) — 배포 안함
${RESULT}"

  echo "--- pg${BOOK} 종료: $(date '+%H:%M:%S %Z') ---"
done

echo ""
echo "=== 모든 책 번역 완료(배포 없음): $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
notify "🎉 15분할 번역(번역전용/배포안함) 종료: $*
※ git commit/push 안 함. 검수 후 수동 배포 필요."
