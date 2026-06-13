#!/usr/bin/env bash
# 북맵 책 10병행 번역 (cron으로 호출).
# 사용법: translate-book-10way.sh <BOOK_ID> [<BOOK_ID2> ...]
# 여러 책 ID 주면 순차 처리.

set -u
LOG=/home/purple/ai-ceo-os/tasks/translation-cron.log
mkdir -p "$(dirname "$LOG")"
exec >> "$LOG" 2>&1

echo ""
echo "================================================================"
echo "=== 10병행 번역 시작: $(date -u '+%Y-%m-%d %H:%M:%S UTC') ==="
echo "=== 인자: $* ==="
echo "================================================================"

# claude CLI 경로 (nvm)
export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"
echo "claude: $(which claude || echo NOT_FOUND) / $(claude --version 2>&1 | head -1)"

cd /home/purple/ai-ceo-os/projects/bookmap || { echo "FATAL: bookmap dir not found"; exit 1; }

for BOOK in "$@"; do
  echo ""
  echo "--- pg${BOOK} 시작: $(date -u '+%H:%M:%S UTC') ---"

  # 1) 소스 분할
  SRC="public/translations/_source_pg${BOOK}.json"
  if [ ! -f "$SRC" ]; then
    python3 scripts/dump-source-pages.py --book "$BOOK"
  fi
  if [ ! -f "$SRC" ]; then
    echo "WARN: pg${BOOK} 소스 분할 실패. 건너뜀."
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

  # 5) 10개 워커 분배 — stride 방식 (워커 i는 페이지 i, i+10, i+20, ...)
  PIDS=()
  for W in 0 1 2 3 4 5 6 7 8 9; do
    PAGES=$(python3 -c "
N = ${N}; W = ${W}
print(','.join(str(i) for i in range(W + 1, N + 1, 10)))
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
  python3 - <<PYEOF
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

  echo "--- pg${BOOK} 종료: $(date -u '+%H:%M:%S UTC') ---"
done

echo ""
echo "=== 모든 책 처리 완료: $(date -u '+%Y-%m-%d %H:%M:%S UTC') ==="

# 8) git commit + subtree push (한 번에) — 변경된 책마다 자동 처리
cd /home/purple/ai-ceo-os
CHANGED_BOOKS=()
for BOOK in "$@"; do
  if [ -n "$(git status --short projects/bookmap/public/translations/pg${BOOK}/ 2>/dev/null)" ]; then
    CHANGED_BOOKS+=("$BOOK")
    git add "projects/bookmap/public/translations/pg${BOOK}/"
  fi
done
if [ ${#CHANGED_BOOKS[@]} -gt 0 ]; then
  MSG="feat: cron 10병행 번역 진행 (${CHANGED_BOOKS[*]})"
  git commit -m "$MSG

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" || echo "git commit failed (no staged changes?)"
  git subtree push --prefix=projects/bookmap purplelica-books master || echo "git subtree push failed"
else
  echo "변경된 책 없음, commit/push 건너뜀."
fi

# 9) cron self-cleanup — 이 스크립트로 등록된 cron 라인 한 회성이므로 매칭하는 인자 줄 제거
ARGS_SIG="translate-book-10way.sh $*"
crontab -l 2>/dev/null | grep -vF "$ARGS_SIG" | crontab - 2>/dev/null || true
echo "cron line 정리 시도: '$ARGS_SIG'"
echo ""
