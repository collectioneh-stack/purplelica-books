#!/usr/bin/env bash
set -u
BM=/home/purple/ai-ceo-os/projects/bookmap
cd "$BM" || exit 1
export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"

# 1) pg5200 변신: misaligned 전체 → clear후 재번역
echo "[$(date '+%H:%M')] pg5200 clear+재번역"
[ -d public/translations/pg5200.backup ] || cp -r public/translations/pg5200 public/translations/pg5200.backup
python3 scripts/dump-source-pages.py --book 5200 >/dev/null 2>&1
rm -f public/translations/pg5200/p*.json
bash scripts/_drain_fillonly.sh 5200

# 2) 단일 페이지 결손
echo "[$(date '+%H:%M')] 단일페이지: pg67 p78 / pg4300 p424 / pg7849 p46"
for spec in "67:78" "4300:424" "7849:46"; do
  B="${spec%%:*}"; P="${spec##*:}"
  for try in 1 2 3 4 5 6; do
    python3 scripts/translate-worker.py --book "$B" --pages "$P" --log /home/purple/ai-ceo-os/tasks/fix-pg${B}-p${P}.log >/dev/null 2>&1
    if python3 -c "import json,re;j=json.load(open('public/translations/pg${B}/p${P}.json'));exit(0 if any(re.search(r'[가-힣]',s) for s in j) else 1)" 2>/dev/null; then
      echo "  pg${B} p${P} ✅"; break
    fi
    echo "  pg${B} p${P} 재시도${try} (한도?) — 대기"; sleep 1200
  done
done
echo "[$(date '+%H:%M')] === FINALIZE 종료 ==="
