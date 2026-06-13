#!/bin/bash
# 예약 실행 스크립트 — cron이 이 파일을 호출
# 1회 실행 후 자기 cron 라인 자동 제거

set -e
cd /home/purple/ai-ceo-os

LOG="projects/bookmap/scripts/scheduled-translate.log"
echo "===== $(date) — 예약 번역 시작 =====" >> "$LOG"

# Claude Code 호출 (비대화형 모드)
/home/purple/.nvm/versions/node/v24.16.0/bin/claude \
  --print \
  --allow-dangerously-skip-permissions \
  --add-dir /home/purple/ai-ceo-os \
  "$(cat <<'PROMPT'
북맵 프로젝트에서 pg1251 아서왕의 죽음(251p)과 pg1232 군주론(59p)을 각각 10분할 병행 번역하라. 사용자 메모리: "책 번역은 권한받은 후 중간 멈춤 금지, 소스 라벨 불일치도 자율 처리"

실행 단계:
1. cd /home/purple/ai-ceo-os/projects/bookmap
2. 소스 분할:
   - python3 scripts/dump-source-pages.py --book 1251 (이미 있으면 스킵 OK)
   - python3 scripts/dump-source-pages.py --book 1232 (이미 있으면 스킵 OK)
3. 각 책의 _source_pg{id}.json을 10개 배치 파일로 분할 (Python 직접 실행):
   - 결과: public/translations/pg{id}/_batches/batch_NN.json
4. 각 책마다 Agent tool로 10개 병행 에이전트 디스패치 (총 20개):
   - 각 에이전트는 영어 문단 배열을 자연스러운 한국어로 번역하여 pg{id}/p{N}.json에 Write
   - 형식: ["번역1", "번역2", ...] — 입력과 동일 개수
   - 빈 문단 유지, 영어 그대로 두지 말 것
5. 모든 에이전트 완료 대기 후 디스크 실측 (빈 페이지 카운트)
6. STATUS.md 업데이트
7. git add public/translations/pg1251/ public/translations/pg1232/ public/translations/STATUS.md
8. git commit -m "feat: 아서왕의 죽음(pg1251) + 군주론(pg1232) 10분할 자동 번역 완료"
9. git subtree push --prefix=projects/bookmap purplelica-books master

고유명사 통일:
- pg1251 아서왕: King Arthur=아서 왕, Merlin=멀린, Lancelot=란슬롯, Guinevere=귀네비어, Excalibur=엑스칼리버, Round Table=원탁, Sir Gawain=가웨인 경, Sir Tristram=트리스트람 경, Sir Galahad=갈라하드 경, Sir Percival=퍼시벌 경, Camelot=카멜롯, Britain=브리튼
- pg1232 군주론: Machiavelli=마키아벨리, Prince=군주, Cesare Borgia=체사레 보르자, Italy=이탈리아, Florence=피렌체, Lorenzo de' Medici=로렌초 데 메디치

중단 없이 끝까지. 사용자가 자고 있으므로 자율 진행하라.
PROMPT
)" 2>&1 >> "$LOG"

echo "===== $(date) — 종료 =====" >> "$LOG"

# 자기 자신 cron 라인 제거 (1회성 보장)
crontab -l 2>/dev/null | grep -v "scheduled-translate.sh" | crontab -
echo "[$(date)] cron 라인 자동 제거 완료" >> "$LOG"
