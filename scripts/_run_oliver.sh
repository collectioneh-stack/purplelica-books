#!/usr/bin/env bash
set -u
BM=/home/purple/ai-ceo-os/projects/bookmap; cd "$BM" || exit 1
export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"
# 1) 굶던 2페이지 먼저 (우선순위)
echo "[$(date '+%H:%M')] 단일페이지 우선: 4300 p424, 7849 p46"
bash scripts/_fix_missing.sh 4300 10 >/dev/null 2>&1
bash scripts/_fix_missing.sh 7849 10 >/dev/null 2>&1
# 2) 올리버 트위스트 쿼터-세이프
echo "[$(date '+%H:%M')] pg730 올리버 트위스트 시작"
bash scripts/_translate_quota_safe.sh 730
