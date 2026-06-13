#!/usr/bin/env python3
"""거대 단일블록 페이지 번역 (긴 타임아웃). 사용: _big_page.py <book> <page>"""
import json, re, subprocess, sys, os

book, page = sys.argv[1], int(sys.argv[2])
src = json.load(open(f'public/translations/_source_pg{book}.json'))
paras = src[page-1]
pj = json.dumps(paras, ensure_ascii=False, indent=2)
prompt = f"""아래 영어 문단 배열을 자연스러운 현대 한국어로 번역하라.
규칙: 입력 배열 길이=출력 배열 길이. 영어 그대로 두지 말 것. 자연스러운 의역.
입력:
{pj}
출력: JSON 배열만. ```json ``` OK."""

for attempt in range(3):
    try:
        r = subprocess.run(["claude","--print","--output-format","text",prompt],
                           capture_output=True, text=True, timeout=900, encoding="utf-8")
        out = r.stdout.strip()
    except subprocess.TimeoutExpired:
        print(f"  attempt{attempt+1} TIMEOUT(900s)"); continue
    m = re.search(r"```(?:json)?\s*(\[[\s\S]*?\])\s*```", out)
    txt = m.group(1) if m else out[out.find("["):out.rfind("]")+1]
    try:
        arr = json.loads(txt)
        if isinstance(arr, list) and len(arr) == len(paras):
            json.dump(arr, open(f'public/translations/pg{book}/p{page}.json','w',encoding='utf-8'), ensure_ascii=False)
            print(f"  ✅ pg{book} p{page} 완료 ({len(arr)}문단)"); sys.exit(0)
        print(f"  attempt{attempt+1} 길이불일치 {len(arr) if isinstance(arr,list) else '?'} vs {len(paras)}")
    except Exception as e:
        print(f"  attempt{attempt+1} 파싱실패: {str(e)[:60]}")
print("  ✗ 실패"); sys.exit(1)
