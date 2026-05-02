#!/bin/bash
# Claude CLI를 이용한 pg1661 한국어 번역 스크립트
# 사용법: bash scripts/translate-with-claude-cli.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BOOKMAP_DIR="$(dirname "$SCRIPT_DIR")"
PAGES_JSON="$BOOKMAP_DIR/public/translations/_pages_raw.json"
OUT_DIR="$BOOKMAP_DIR/public/translations/pg1661"

mkdir -p "$OUT_DIR"

# 총 페이지 수 확인
TOTAL=$(python3 -c "import json; pages=json.load(open('$PAGES_JSON')); print(len(pages))")
echo "총 $TOTAL 페이지 번역 시작"

for i in $(seq 1 $TOTAL); do
  OUT_FILE="$OUT_DIR/p${i}.json"
  if [ -f "$OUT_FILE" ]; then
    echo "p${i}/$TOTAL ⏭ 스킵"
    continue
  fi

  echo -n "p${i}/$TOTAL 번역 중..."

  # 해당 페이지 단락 추출
  PARAGRAPHS=$(python3 -c "
import json, sys
pages = json.load(open('$PAGES_JSON'))
page = pages[$((i-1))]
numbered = '\n\n'.join(f'[{j}] {p}' for j,p in enumerate(page))
print(numbered)
")

  COUNT=$(python3 -c "
import json
pages = json.load(open('$PAGES_JSON'))
print(len(pages[$((i-1))]))
")

  PROMPT="Translate each English paragraph below into natural, fluent Korean.
Reply ONLY with a JSON array of strings. No explanation, no markdown fences, no extra text.
The array must have exactly ${COUNT} elements in the same order.
Example: [\"번역1\", \"번역2\"]

English paragraphs:
${PARAGRAPHS}"

  RESULT=$(echo "$PROMPT" | claude -p --output-format text 2>/dev/null)

  # JSON 배열 추출
  EXTRACTED=$(python3 -c "
import re, sys
raw = '''$RESULT'''
m = re.search(r'\[[\s\S]*\]', raw)
if m:
    print(m.group())
else:
    print('[]')
" 2>/dev/null)

  echo "$EXTRACTED" > "$OUT_FILE"
  echo " ✓"
  sleep 0.5
done

echo ""
echo "✅ 번역 완료: $OUT_DIR"
