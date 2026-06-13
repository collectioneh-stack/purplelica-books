#!/usr/bin/env bash
# 짧은 책 5권 2권씩 병렬 번역 + 마지막에 한 번 commit/push
# Round 1: pg216 + pg11339
# Round 2: pg1327 + pg408
# Round 3: pg2680 단독

set -u
LOG=/home/purple/ai-ceo-os/tasks/translation-cron.log
exec >> "$LOG" 2>&1

export TELEGRAM_BOT_TOKEN="$(grep -E '^TELEGRAM_BOT_TOKEN' "$HOME/.config/ai-ceo-os/telegram.env" 2>/dev/null | cut -d= -f2-)"
export TELEGRAM_CHAT_ID="$(grep -E '^TELEGRAM_CHAT_ID' "$HOME/.config/ai-ceo-os/telegram.env" 2>/dev/null | cut -d= -f2-)"
notify() {
  python3 -c "from scripts.telegram_notifier import send; send('''$1''')" 2>/dev/null || true
}

cd /home/purple/ai-ceo-os/projects/bookmap

echo ""
echo "================================================================"
echo "=== 짧은 책 5권 2권씩 병렬 시작: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
echo "================================================================"
notify "🚀 짧은 책 5권 병렬 시작 (Round1: pg216+pg11339, Round2: pg1327+pg408, Round3: pg2680)"

START_ALL=$(date +%s)

# Round 1: pg216 + pg11339
echo ""
echo "--- Round 1: pg216 도덕경 + pg11339 이솝 우화 시작 ---"
notify "📖 Round 1 시작: 도덕경 + 이솝 우화"
bash scripts/translate-book-15way-noPush.sh 216 &
PID1=$!
bash scripts/translate-book-15way-noPush.sh 11339 &
PID2=$!
wait $PID1 $PID2
echo "--- Round 1 종료: $(date '+%H:%M:%S %Z') ---"
notify "✓ Round 1 완료 (pg216 + pg11339)"

# Round 2: pg1327 + pg408
echo ""
echo "--- Round 2: pg1327 엘리자베스 + pg408 흑인의 영혼 시작 ---"
notify "📖 Round 2 시작: 엘리자베스와 독일 정원 + 흑인의 영혼"
bash scripts/translate-book-15way-noPush.sh 1327 &
PID1=$!
bash scripts/translate-book-15way-noPush.sh 408 &
PID2=$!
wait $PID1 $PID2
echo "--- Round 2 종료: $(date '+%H:%M:%S %Z') ---"
notify "✓ Round 2 완료 (pg1327 + pg408)"

# Round 3: pg2680 단독
echo ""
echo "--- Round 3: pg2680 명상록 단독 시작 ---"
notify "📖 Round 3 시작: 명상록"
bash scripts/translate-book-15way-noPush.sh 2680
echo "--- Round 3 종료: $(date '+%H:%M:%S %Z') ---"
notify "✓ Round 3 완료 (pg2680)"

# 최종 git commit + push (한 번에 5권)
echo ""
echo "--- 최종 commit + push ---"
cd /home/purple/ai-ceo-os
CHANGED=()
for B in 216 11339 1327 408 2680; do
  if [ -n "$(git status --short projects/bookmap/public/translations/pg${B}/ 2>/dev/null)" ]; then
    CHANGED+=("$B")
    git add "projects/bookmap/public/translations/pg${B}/"
  fi
done

# STATUS 갱신도 (간단히)
cd projects/bookmap
python3 - <<'PYEOF'
import re, json, subprocess
from pathlib import Path
from datetime import datetime, timezone, timedelta

ROOT = Path('.')
CATALOG = json.loads((ROOT/"public/books/catalog.json").read_text(encoding="utf-8"))
TRANS = ROOT/"public/translations"
prev = subprocess.run(["git","show","HEAD:projects/bookmap/public/translations/STATUS.md"],
    capture_output=True, text=True).stdout
ko_map = {}
for line in prev.splitlines():
    m = re.match(r'\|\s*(pg\d+)\s*\|\s*([^|]+?)\s*\|', line)
    if m:
        bid, ko = m.group(1), m.group(2).strip()
        if ko and ko not in ('한국어 제목','---','?'): ko_map[bid] = ko
en_map = {f"pg{b['id']}": b.get('title','?') for b in CATALOG}
status_ids = set(re.findall(r'\bpg\d+\b', prev))
all_ids = set(en_map.keys()) | status_ids | set(ko_map.keys())
def keynum(x):
    m = re.match(r'pg(\d+)', x); return int(m.group(1)) if m else 99999
mismatch = set()
for src_f in TRANS.glob('_source_pg*.json'):
    m = re.match(r'_source_(pg\d+)\.json$', src_f.name)
    if not m: continue
    bid = m.group(1)
    try: sc = len(json.load(open(src_f)))
    except: continue
    folder = TRANS/bid
    if not folder.exists(): continue
    disk = len([p for p in folder.iterdir() if re.match(r'^p\d+\.json$', p.name)])
    if sc != disk and disk > 0: mismatch.add(bid)
done = []; partial = []; empty_only = []; no_folder = []
for bid in sorted(all_ids, key=keynum):
    folder = TRANS/bid
    ko = ko_map.get(bid, '?'); en = en_map.get(bid, '?')
    is_mm = bid in mismatch
    if not folder.exists():
        no_folder.append((bid, ko, en)); continue
    pages = [p for p in folder.iterdir() if re.match(r'^p\d+\.json$', p.name)]
    total = len(pages)
    if total == 0:
        no_folder.append((bid, ko, en)); continue
    tx = sum(1 for p in pages if re.search(r'[가-힣]', p.read_text(encoding='utf-8')))
    if tx == total: done.append((bid, total, ko, en, is_mm))
    elif tx == 0: empty_only.append((bid, total, ko, en, is_mm))
    else: partial.append((bid, tx, total, ko, en, is_mm))
KST = timezone(timedelta(hours=9))
today = datetime.now(KST).strftime("%Y-%m-%d")
out = []
out.append(f"# 한국어 번역 현황\n\n> **마지막 디스크 실사: {today}** (짧은 책 5권 병렬 번역 완료 후)\n\n")
out.append(f"- ✅ 완료: **{len(done)}권**  ⏳ 진행 중(부분): **{len(partial)}권**  ⚪ 빈 페이지만: **{len(empty_only)}권**  ❌ 폴더 없음: **{len(no_folder)}권**\n\n")
out.append("## 번역 완료\n\n| PG ID | 한국어 제목 | 원제 | 페이지 수 | 분할정합 |\n|:---:|:---|:---|:---:|:---:|\n")
for bid, n, ko, en, mm in done: out.append(f"| {bid} | {ko} | {en} | {n} | {'⚠️' if mm else '✓'} |\n")
out.append("\n## 번역 진행 중\n\n| PG ID | 한국어 제목 | 원제 | 완료/전체 | 진행률 | 분할정합 |\n|:---:|:---|:---|:---:|:---:|:---:|\n")
for bid, tx, total, ko, en, mm in partial: out.append(f"| {bid} | {ko} | {en} | {tx}/{total} | {tx/total*100:.0f}% | {'⚠️' if mm else '✓'} |\n")
out.append("\n## 미번역 (빈 페이지 100%)\n\n| PG ID | 한국어 제목 | 원제 | 페이지 수 |\n|:---:|:---|:---|:---:|\n")
for bid, n, ko, en, mm in empty_only: out.append(f"| {bid} | {ko} | {en} | {n} |\n")
out.append("\n## catalog에만 있고 translations 폴더 없음\n\n| PG ID | 한국어 제목 | 원제 |\n|:---:|:---|:---|\n")
for bid, ko, en in no_folder: out.append(f"| {bid} | {ko} | {en} |\n")
(TRANS/"STATUS.md").write_text("".join(out), encoding="utf-8")
PYEOF

cd /home/purple/ai-ceo-os
git add projects/bookmap/public/translations/STATUS.md

if [ ${#CHANGED[@]} -gt 0 ] || [ -n "$(git status --short projects/bookmap/public/translations/STATUS.md)" ]; then
  MSG="feat: 짧은 책 5권 병렬 번역 (${CHANGED[*]}) + STATUS 갱신"
  git commit -m "$MSG

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  if git subtree push --prefix=projects/bookmap purplelica-books master; then
    notify "🚀 5권 commit + push 완료 (변경: ${CHANGED[*]})"
  else
    notify "⚠️ commit 됐으나 push 실패 — 수동 확인 필요"
  fi
else
  echo "변경 없음"
  notify "ℹ️ 변경된 책 없음, commit/push 생략"
fi

END_ALL=$(date +%s)
TOTAL=$(( (END_ALL - START_ALL) / 60 ))
notify "🎉 짧은 책 5권 병렬 번역 전체 종료 (총 ${TOTAL}분)"

echo "=== 전체 종료: $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
