#!/usr/bin/env bash
# fill-only 드레인: 클리어 없이 누락만 채움. 한도 정체 시 대기 후 재개.
set -u
BM=/home/purple/ai-ceo-os/projects/bookmap
cd "$BM" || exit 1
export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"
STALL_WAIT=1500
cnt(){ python3 - "$1" <<'PY'
import glob,re,json,sys
b=sys.argv[1];c=0
for f in glob.glob(f'public/translations/pg{b}/p*.json'):
    try:j=json.load(open(f))
    except:continue
    if isinstance(j,list) and any(re.search(r'[가-힣]',s) for s in j if isinstance(s,str)):c+=1
print(c)
PY
}
for B in "$@"; do
  echo "[$(date '+%m-%d %H:%M')] ===== pg${B} (fill) ====="
  # _source 보장 (없으면 생성 — 앱정합 split)
  [ -f "public/translations/_source_pg${B}.json" ] || python3 scripts/dump-source-pages.py --book "$B" >/dev/null 2>&1
  N=$(python3 -c "import json;print(len(json.load(open('public/translations/_source_pg${B}.json'))))")
  mkdir -p "public/translations/pg${B}"
  prev=-1; stalls=0
  while :; do
    bash scripts/_fix_missing.sh "$B" 10 >/dev/null 2>&1
    D=$(cnt "$B")
    echo "[$(date '+%H:%M')] pg${B}: ${D}/${N}"
    [ "$D" -ge "$N" ] && { echo "pg${B} DONE"; break; }
    if [ "$D" -le "$prev" ]; then
      stalls=$((stalls+1))
      echo "pg${B} 정체 #${stalls} — ${STALL_WAIT}s 대기"
      [ "$stalls" -ge 20 ] && { echo "pg${B} 20회 정체 — 포기"; break; }
      sleep "$STALL_WAIT"
    else stalls=0; fi
    prev=$D
  done
done
echo "[$(date '+%m-%d %H:%M')] === FILLONLY 종료 ==="
