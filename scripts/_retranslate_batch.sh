#!/usr/bin/env bash
# 깨진책 앱-정합 전량 재번역 배치. 사용: _retranslate_batch.sh <ID1> <ID2> ...
# 책별: split검증 → 백업 → _source생성 → 클리어 → 15워커 → 누락 재시도(최대 5라운드)
set -u
ROOT=/home/purple/ai-ceo-os
BM=$ROOT/projects/bookmap
cd "$BM" || exit 1
export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"
LOG=$ROOT/tasks/retranslate-batch.log

say(){ echo "[$(date '+%H:%M:%S')] $*"; }

count_done(){ # $1=book  → 채워진 페이지수
  python3 - "$1" <<'PY'
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
  say "===== pg${B} 시작 ====="
  # 1) split 동일성 검증 (앱 vs pre-translate)
  OK=$(python3 - "$B" <<'PY'
import importlib.util,sys
from pathlib import Path
b=sys.argv[1]
s1=importlib.util.spec_from_file_location('d','scripts/diagnose-pagination.py');d=importlib.util.module_from_spec(s1);s1.loader.exec_module(d)
s2=importlib.util.spec_from_file_location('p','scripts/pre-translate-by-claude.py');p=importlib.util.module_from_spec(s2);s2.loader.exec_module(p)
def n(s):return ' '.join(s.split()).strip()
t=open(f'public/books/pg{b}.txt',encoding='utf-8',errors='replace').read()
a=[[n(x) for x in pg['paragraphs']] for pg in d.split_into_chapter_pages(t)]
q=[[n(x) for x in pg] for pg in p.split_into_pages(t)]
mm=sum(1 for i in range(min(len(a),len(q))) if a[i]!=q[i])
print('OK' if (mm==0 and len(a)==len(q)) else 'MISMATCH')
PY
)
  if [ "$OK" != "OK" ]; then say "pg${B} split 불일치 — SKIP"; continue; fi
  # 2) 백업
  if [ ! -d "public/translations/pg${B}.backup" ] && [ -d "public/translations/pg${B}" ]; then
    cp -r "public/translations/pg${B}" "public/translations/pg${B}.backup"
    say "백업 생성"
  fi
  # 3) _source
  python3 scripts/dump-source-pages.py --book "$B" >/dev/null 2>&1
  N=$(python3 -c "import json;print(len(json.load(open('public/translations/_source_pg${B}.json'))))")
  say "_source ${N}p"
  # 4) 클리어
  mkdir -p "public/translations/pg${B}"
  rm -f public/translations/pg${B}/p*.json
  # 5) 번역 + 누락 재시도
  for round in 1 2 3 4 5; do
    bash scripts/_fix_missing.sh "$B" 10
    DONE=$(count_done "$B")
    say "라운드${round}: ${DONE}/${N}"
    [ "$DONE" -ge "$N" ] && break
  done
  FINAL=$(count_done "$B")
  say "pg${B} 완료 ${FINAL}/${N}"
done
say "===== 배치 종료 ====="
