#!/usr/bin/env bash
# pg1322 풀잎 15병행 번역 — 배포(commit/push) 제외 버전. CEO 지시: "배포하지말고 번역만".
set -u
BOOK=1322
LOG=/home/purple/ai-ceo-os/tasks/translate-pg1322-nodeploy.log
mkdir -p "$(dirname "$LOG")"
exec >> "$LOG" 2>&1

echo ""
echo "================================================================"
echo "=== pg${BOOK} 15병행 번역 (배포제외) 시작: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
echo "================================================================"

export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"
echo "claude: $(which claude || echo NOT_FOUND)"

cd /home/purple/ai-ceo-os/projects/bookmap || { echo "FATAL: bookmap dir not found"; exit 1; }

SRC="public/translations/_source_pg${BOOK}.json"
if [ ! -f "$SRC" ]; then echo "FATAL: $SRC 없음"; exit 1; fi

OUT_DIR="public/translations/pg${BOOK}"
mkdir -p "$OUT_DIR"

# 옛 미정렬 빈 placeholder 전부 제거 (내용 없으므로 손실 없음)
python3 - <<'PYEOF'
import json, os, glob
removed = 0
for f in glob.glob('public/translations/pg1322/p*.json'):
    try:
        arr = json.loads(open(f, encoding='utf-8').read())
        if isinstance(arr, list) and not any(s.strip() for s in arr):
            os.remove(f); removed += 1
    except Exception:
        pass
print(f'빈 placeholder 제거: {removed}')
PYEOF

N=$(python3 -c "import json; print(len(json.load(open('public/translations/_source_pg1322.json'))))")
echo "총 ${N} 페이지"

# 15 워커 stride 분배
PIDS=()
for W in 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14; do
  PAGES=$(python3 -c "
N = ${N}; W = ${W}
print(','.join(str(i) for i in range(W + 1, N + 1, 15)))
")
  WLOG="/home/purple/ai-ceo-os/tasks/nodeploy-pg1322-w${W}.log"
  : > "$WLOG"
  python3 scripts/translate-worker.py --book "$BOOK" --pages "$PAGES" --log "$WLOG" >> "$WLOG" 2>&1 &
  PIDS+=($!)
  echo "worker $W pid=$! pages=$PAGES"
done

for pid in "${PIDS[@]}"; do
  wait "$pid" || echo "worker pid=$pid exited non-zero"
done

# 검수
python3 - <<'PYEOF'
import json, os
B = 1322
src = json.load(open(f'public/translations/_source_pg{B}.json'))
empty=[]; mismatch=[]; ok=0
for i in range(1, len(src)+1):
    p = f'public/translations/pg{B}/p{i}.json'
    if not os.path.exists(p): empty.append(i); continue
    arr = json.load(open(p))
    if not any(s.strip() for s in arr): empty.append(i)
    elif len(arr) != len(src[i-1]): mismatch.append((i, len(src[i-1]), len(arr)))
    else: ok += 1
print(f'pg{B} 검수: ok={ok}/{len(src)}  empty={len(empty)}  mismatch={len(mismatch)}')
if empty: print(f'  empty: {empty[:40]}')
if mismatch: print(f'  mismatch: {mismatch[:15]}')
PYEOF

echo "=== pg${BOOK} 번역 라운드 종료: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
echo "=== 배포(commit/push) 생략됨 — CEO 지시 ==="
