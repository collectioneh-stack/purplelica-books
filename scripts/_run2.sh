#!/usr/bin/env bash
set -u
BM=/home/purple/ai-ceo-os/projects/bookmap; cd "$BM" || exit 1
export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"
pkill -f "translate-worker.py --book 4300" 2>/dev/null
pkill -f "translate-worker.py --book 7849" 2>/dev/null
echo "[$(date '+%H:%M')] 거대페이지: 4300 p424 (4401w)"
python3 scripts/_big_page.py 4300 424
echo "[$(date '+%H:%M')] 거대페이지: 7849 p46 (5698w)"
python3 scripts/_big_page.py 7849 46
echo "[$(date '+%H:%M')] pg730 올리버 트위스트 (쿼터-세이프)"
bash scripts/_translate_quota_safe.sh 730
