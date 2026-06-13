#!/usr/bin/env bash
# 남은 깨진책 무인 드레인. 세션한도 자동대응(정체 시 대기 후 재개).
# 사용: _drain.sh <ID1> <ID2> ...
set -u
ROOT=/home/purple/ai-ceo-os; BM=$ROOT/projects/bookmap
cd "$BM" || exit 1
export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"
STALL_WAIT=1500   # 한도소진(정체) 시 대기 25분

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
splitok(){ python3 - "$1" <<'PY'
import importlib.util,sys
b=sys.argv[1]
s1=importlib.util.spec_from_file_location('d','scripts/diagnose-pagination.py');d=importlib.util.module_from_spec(s1);s1.loader.exec_module(d)
s2=importlib.util.spec_from_file_location('p','scripts/pre-translate-by-claude.py');p=importlib.util.module_from_spec(s2);s2.loader.exec_module(p)
def n(s):return ' '.join(s.split()).strip()
t=open(f'public/books/pg{b}.txt',encoding='utf-8',errors='replace').read()
a=[[n(x) for x in pg['paragraphs']] for pg in d.split_into_chapter_pages(t)]
q=[[n(x) for x in pg] for pg in p.split_into_pages(t)]
mm=sum(1 for i in range(min(len(a),len(q))) if a[i]!=q[i])
print('OK' if (mm==0 and len(a)==len(q)) else 'BAD')
PY
}

for B in "$@"; do
  echo "[$(date '+%m-%d %H:%M')] ===== pg${B} ====="
  if [ "$(splitok "$B")" != "OK" ]; then echo "pg${B} split BAD — SKIP"; continue; fi
  # 백업
  if [ ! -d "public/translations/pg${B}.backup" ] && [ -d "public/translations/pg${B}" ]; then
    cp -r "public/translations/pg${B}" "public/translations/pg${B}.backup"
  fi
  python3 scripts/dump-source-pages.py --book "$B" >/dev/null 2>&1
  N=$(python3 -c "import json;print(len(json.load(open('public/translations/_source_pg${B}.json'))))")
  mkdir -p "public/translations/pg${B}"
  rm -f public/translations/pg${B}/p*.json   # 전량 재번역(MISALIGNED)
  prev=-1; stalls=0
  while :; do
    bash scripts/_fix_missing.sh "$B" 10 >/dev/null 2>&1
    D=$(cnt "$B")
    echo "[$(date '+%H:%M')] pg${B}: ${D}/${N}"
    [ "$D" -ge "$N" ] && { echo "pg${B} DONE"; break; }
    if [ "$D" -le "$prev" ]; then
      stalls=$((stalls+1))
      echo "pg${B} 정체(한도추정) #${stalls} — ${STALL_WAIT}s 대기"
      [ "$stalls" -ge 12 ] && { echo "pg${B} 12회 정체 — 포기"; break; }
      sleep "$STALL_WAIT"
    else
      stalls=0
    fi
    prev=$D
  done
done
echo "[$(date '+%m-%d %H:%M')] ===== DRAIN 종료 ====="
