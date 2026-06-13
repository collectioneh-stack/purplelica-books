#!/usr/bin/env bash
# 누락분만 채움(클리어 X). 사용: _resume_fill.sh <ID1> <ID2> ...
set -u
ROOT=/home/purple/ai-ceo-os; BM=$ROOT/projects/bookmap
cd "$BM" || exit 1
export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"
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
  N=$(python3 -c "import json;print(len(json.load(open('public/translations/_source_pg${B}.json'))))")
  for r in 1 2 3 4 5 6 7 8; do
    bash scripts/_fix_missing.sh "$B" 10
    D=$(cnt "$B")
    echo "[$(date '+%H:%M:%S')] pg${B} 라운드${r}: ${D}/${N}"
    [ "$D" -ge "$N" ] && break
  done
done
echo "RESUME DONE"
