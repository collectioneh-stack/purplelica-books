#!/usr/bin/env bash
# 북맵 번역 재가동 스크립트 (cron으로 호출)
# 우선순위 큐를 따라 미번역 책을 차례대로 번역. 이미 번역된 페이지는 자동 skip.

set -u
LOG=/home/purple/ai-ceo-os/tasks/translation-resume.log
mkdir -p "$(dirname "$LOG")"
exec >> "$LOG" 2>&1

echo ""
echo "================================================================"
echo "=== 북맵 번역 재가동 시작: $(date -u '+%Y-%m-%d %H:%M:%S UTC') ==="
echo "================================================================"

cd /home/purple/ai-ceo-os/projects/bookmap || { echo "FATAL: bookmap dir not found"; exit 1; }

# claude CLI 경로 추가 (nvm)
export PATH="/home/purple/.nvm/versions/node/v24.16.0/bin:$PATH"
echo "claude CLI: $(which claude)  $(claude --version 2>&1 | head -1)"
echo "python: $(which python3)"

# 우선순위 큐: STATUS.md 미번역 섹션 단편 우선 + 대작 후순위
BOOKS=(244 5230 2814 1232 174 768 158 1184 1251 1322 1399 2554 2600 4300 161)

for BOOK in "${BOOKS[@]}"; do
  echo ""
  echo "--- pg${BOOK} 시작: $(date -u '+%H:%M:%S UTC') ---"

  # 원본 페이지 분할 (없으면 생성)
  SRC=/home/purple/ai-ceo-os/projects/bookmap/public/translations/_source_pg${BOOK}.json
  if [ ! -f "$SRC" ]; then
    python3 scripts/dump-source-pages.py --book "$BOOK" 2>&1
    if [ $? -ne 0 ]; then
      echo "WARN: pg${BOOK} 원본 분할 실패. 건너뜀."
      continue
    fi
  fi

  # 번역 폴더 보장
  mkdir -p "public/translations/pg${BOOK}"

  # 번역 실행 (이미 번역된 페이지는 자동 skip)
  python3 scripts/pre-translate-by-claude.py --book "$BOOK" 2>&1
  RC=$?

  echo "--- pg${BOOK} 종료 (rc=$RC): $(date -u '+%H:%M:%S UTC') ---"

  # claude CLI 실패가 많으면 사용량 한도일 가능성 → 일단 다음 책 시도
  # (한 책에서 일부 실패해도 다음 책으로 진행)
done

echo ""
echo "================================================================"
echo "=== 번역 라운드 종료: $(date -u '+%Y-%m-%d %H:%M:%S UTC') ==="
echo "================================================================"

# 다음 번역 라운드 자동 예약 (2시간 후) — 무한 반복 방지를 위해 최대 3회까지
TRIGGER_COUNT_FILE=/home/purple/ai-ceo-os/tasks/translation-resume-count
COUNT=$(cat "$TRIGGER_COUNT_FILE" 2>/dev/null || echo 0)
COUNT=$((COUNT + 1))
echo "$COUNT" > "$TRIGGER_COUNT_FILE"
echo "라운드 누적: $COUNT / 최대 3회"

if [ "$COUNT" -lt 3 ]; then
  NEXT_TIME=$(date -u -d "+2 hours" '+%M %H %d %m')
  TMP_CRON=$(mktemp)
  crontab -l 2>/dev/null | grep -v "resume-translation.sh" > "$TMP_CRON" || true
  echo "$NEXT_TIME * /home/purple/ai-ceo-os/projects/bookmap/scripts/resume-translation.sh" >> "$TMP_CRON"
  crontab "$TMP_CRON"
  rm "$TMP_CRON"
  echo "다음 라운드 예약: $(date -u -d '+2 hours' '+%Y-%m-%d %H:%M:%S UTC')"
else
  echo "최대 라운드 도달 — 더 이상 자동 재예약 안 함. CEO 깨어났을 때 수동 확인 필요."
  # 마지막에 cron 항목 정리
  crontab -l 2>/dev/null | grep -v "resume-translation.sh" | crontab -
  rm -f "$TRIGGER_COUNT_FILE"
fi
