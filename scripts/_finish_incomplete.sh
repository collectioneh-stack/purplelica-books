#!/usr/bin/env bash
# INCOMPLETE 마무리: 비워진/부분정합 책은 fill만, 옛 misaligned는 clear후 재번역.
set -u
BM=/home/purple/ai-ceo-os/projects/bookmap
cd "$BM" || exit 1
export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"

# 1) fill-only (클리어 X) — 이미 비었거나 정합부분만 존재
echo "[$(date '+%m-%d %H:%M')] === FILL 단계: 103 308 139 98 6130 ==="
bash scripts/_drain_fillonly.sh 103 308 139 98 6130

# 2) clear후 재번역 — 옛 misaligned 잔존
echo "[$(date '+%m-%d %H:%M')] === CLEAR+재번역 단계: 1497 4300 1399 135 ==="
bash scripts/_drain.sh 1497 4300 1399 135
echo "[$(date '+%m-%d %H:%M')] === INCOMPLETE 마무리 종료 ==="
