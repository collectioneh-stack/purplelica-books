#!/usr/bin/env bash
# 작은 책 10권 일괄 번역 (페이지 적은 순)
# 1) 현재 #22 (pg600+pg2097) 완료 대기
# 2) 한 책씩 translate-book-15way.sh 호출 → 책별 commit + push + 텔레그램

set -u
LOG=/home/purple/ai-ceo-os/tasks/translation-cron.log
mkdir -p "$(dirname "$LOG")"
exec >> "$LOG" 2>&1

# telegram
export TELEGRAM_BOT_TOKEN="$(grep -E '^TELEGRAM_BOT_TOKEN' "$HOME/.config/ai-ceo-os/telegram.env" 2>/dev/null | cut -d= -f2-)"
export TELEGRAM_CHAT_ID="$(grep -E '^TELEGRAM_CHAT_ID' "$HOME/.config/ai-ceo-os/telegram.env" 2>/dev/null | cut -d= -f2-)"
notify() {
  python3 -c "from scripts.telegram_notifier import send; send('''$1''')" 2>/dev/null || true
}

echo ""
echo "================================================================"
echo "=== 작은 책 10권 일괄 번역 master 시작: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
echo "================================================================"

cd /home/purple/ai-ceo-os/projects/bookmap

# 1) #22 진행 중인 경우 대기
echo "$(date '+%H:%M:%S') #22 (pg600+pg2097) 완료 대기..."
while pgrep -f "translate-book-15way.sh 600 2097" >/dev/null 2>&1; do
  sleep 60
done
echo "$(date '+%H:%M:%S') #22 완료 확인"
notify "📚 #22 완료, 작은 책 10권 일괄 번역 시작 (예상 ~1시간)"

# 2) 한 책씩 처리 (페이지 적은 순)
BOOKS=(2268 4517 1007 526 219 209 863 308 408 74)
TITLES=(
  "도덕경"
  "나의 안토니아"
  "이솝 우화"
  "야성의 부름"
  "어둠의 심장"
  "나사의 회전"
  "오페라의 유령"
  "이선 프롬"
  "톰 소여의 모험 (★주의: pg74)"
  "각성"
)

# pg74는 톰 소여, pg408은 각성 — TITLES 인덱스 매핑 신경

declare -A TITLE_MAP
TITLE_MAP[2268]="도덕경"
TITLE_MAP[4517]="나의 안토니아"
TITLE_MAP[1007]="이솝 우화"
TITLE_MAP[526]="야성의 부름"
TITLE_MAP[219]="어둠의 심장"
TITLE_MAP[209]="나사의 회전"
TITLE_MAP[863]="오페라의 유령"
TITLE_MAP[308]="이선 프롬"
TITLE_MAP[408]="각성"
TITLE_MAP[74]="톰 소여의 모험"

START_ALL=$(date +%s)
for B in "${BOOKS[@]}"; do
  TITLE="${TITLE_MAP[$B]}"
  echo ""
  echo "----- pg$B $TITLE 시작: $(date '+%H:%M:%S %Z') -----"
  notify "📖 pg$B $TITLE 시작"
  START=$(date +%s)

  # translate-book-15way.sh가 _source 생성 + 15워커 + 검수 + commit + push + 텔레그램 자체 수행
  bash scripts/translate-book-15way.sh "$B"

  END=$(date +%s)
  ELAPSED=$(( (END - START) / 60 ))
  echo "----- pg$B $TITLE 종료: $(date '+%H:%M:%S %Z') (${ELAPSED}분) -----"
done

END_ALL=$(date +%s)
TOTAL=$(( (END_ALL - START_ALL) / 60 ))
notify "🎉 작은 책 10권 일괄 번역 완료 (총 ${TOTAL}분)
처리 책: ${BOOKS[*]}"

echo "=== 전체 종료: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
