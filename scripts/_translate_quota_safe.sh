#!/usr/bin/env bash
# 쿼터-세이프 번역: 한도 걸리면 대기 없이 깔끔히 종료(진행분 저장, resume 가능).
# 사용: _translate_quota_safe.sh <BOOK_ID>
set -u
BM=/home/purple/ai-ceo-os/projects/bookmap
cd "$BM" || exit 1
export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"
B="$1"
cnt(){ python3 - "$B" <<'PY'
import glob,re,json,sys
b=sys.argv[1];c=0
for f in glob.glob(f'public/translations/pg{b}/p*.json'):
    try:j=json.load(open(f))
    except:continue
    if isinstance(j,list) and any(re.search(r'[가-힣]',s) for s in j if isinstance(s,str)):c+=1
print(c)
PY
}

# _source 보장(앱정합 split) + 폴더
[ -f "public/translations/_source_pg${B}.json" ] || python3 scripts/dump-source-pages.py --book "$B" >/dev/null 2>&1
N=$(python3 -c "import json;print(len(json.load(open('public/translations/_source_pg${B}.json'))))")
mkdir -p "public/translations/pg${B}"
echo "[$(date '+%m-%d %H:%M')] pg${B} 번역 시작 (총 ${N}p)"

prev=-1
while :; do
  : > /home/purple/ai-ceo-os/tasks/qs-pg${B}.round.log
  bash scripts/_fix_missing.sh "$B" 10 > /home/purple/ai-ceo-os/tasks/qs-pg${B}.round.log 2>&1
  D=$(cnt "$B")
  echo "[$(date '+%H:%M')] pg${B}: ${D}/${N}"
  if [ "$D" -ge "$N" ]; then echo "pg${B} 완료 ${D}/${N}"; break; fi
  # 한도 신호 감지 → 대기 없이 종료
  if grep -q "session limit" /home/purple/ai-ceo-os/tasks/pg${B}-fix-w*.log 2>/dev/null; then
    echo "[$(date '+%H:%M')] ⚠ 세션 한도 도달 — ${D}/${N}에서 깔끔히 종료(나중에 resume)"; break
  fi
  if [ "$D" -le "$prev" ]; then
    echo "[$(date '+%H:%M')] ⚠ 진행 정체(한도 추정) — ${D}/${N}에서 종료"; break
  fi
  prev=$D
done
echo "[$(date '+%m-%d %H:%M')] === 종료: pg${B} $(cnt "$B")/${N} ==="
