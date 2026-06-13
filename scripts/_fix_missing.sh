#!/usr/bin/env bash
# 누락 페이지 보충 워커 런처. 사용: _fix_missing.sh <BOOK_ID> <NWORKERS>
set -u
BOOK="$1"; NW="${2:-10}"
cd /home/purple/ai-ceo-os/projects/bookmap || exit 1
export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"

pkill -f "translate-worker.py --book ${BOOK}" 2>/dev/null
sleep 2

N=$(python3 -c "import json; print(len(json.load(open('public/translations/_source_pg${BOOK}.json'))))")
python3 - "$BOOK" "$N" "$NW" <<'PY' > /tmp/_chunks_${BOOK}.txt
import glob,re,json,sys
book,N,NW=sys.argv[1],int(sys.argv[2]),int(sys.argv[3])
have=set()
for f in glob.glob(f'public/translations/pg{book}/p*.json'):
    pn=int(re.sub(r'\D','',f.split('/')[-1]))
    try: j=json.load(open(f))
    except: continue
    if isinstance(j,list) and any(re.search(r'[가-힣]',s) for s in j if isinstance(s,str)): have.add(pn)
miss=[str(i) for i in range(1,N+1) if i not in have]
for w in range(NW):
    chunk=miss[w::NW]
    if chunk: print(','.join(chunk))
PY

W=0
while IFS= read -r pages; do
  [ -z "$pages" ] && continue
  LOG="/home/purple/ai-ceo-os/tasks/pg${BOOK}-fix-w${W}.log"; : > "$LOG"
  python3 scripts/translate-worker.py --book "$BOOK" --pages "$pages" --log "$LOG" >> "$LOG" 2>&1 &
  W=$((W+1))
done < /tmp/_chunks_${BOOK}.txt
echo "launched ${W} workers for pg${BOOK}"
wait
echo "ALL WORKERS DONE pg${BOOK}"
