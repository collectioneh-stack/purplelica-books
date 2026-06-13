import requests, json

url = "http://localhost:11434/api/generate"
prompt = """당신은 영한 번역 전문가입니다. 다음 영어 문단 배열을 자연스러운 현대 한국어로 번역하세요.

책 제목: A Christmas Carol

고유명사 표기 통일:
- Scrooge = 스크루지
- Marley = 말리
- Jacob Marley = 제이콥 말리
- Bob Cratchit = 밥 크래칫
- Cratchit = 크래칫
- Tiny Tim = 꼬마 팀
- Tim = 팀
- Fezziwig = 페지위그
- Fred = 프레드
- Belle = 벨
- Ghost of Christmas Past = 과거의 크리스마스 유령
- Ghost of Christmas Present = 현재의 크리스마스 유령
- Ghost of Christmas Yet to Come = 미래의 크리스마스 유령

번역 규칙:
1. 입력 배열의 길이 = 출력 배열의 길이 (문단 합치기/분리 금지)
2. 빈 문단("")은 빈 문단으로 유지
3. 영어 그대로 두지 말 것
4. 자연스러운 한국어 (직역 아닌 의역 우선)
5. 큰 따옴표는 "" 그대로, 단락 내 인용은 '' 사용

입력 (영어 문단 배열):
[
  "--- START OF THE PROJECT GUTENBERG EBOOK A CHRISTMAS CAROL IN PROSE; BEING A GHOST STORY OF CHRISTMAS ---"
]

출력 형식: JSON 배열만 (다른 설명 절대 금지). 마크다운 ```json``` 블록 사용 OK.
"""

payload = {
    "model": "exaone-deep:7.8b",
    "prompt": prompt,
    "stream": False,
    "options": {
        "temperature": 0.3,
        "num_predict": 4096,
        "num_thread": 8,
    }
}

try:
    r = requests.post(url, json=payload, timeout=60)
    print("Response:")
    print(r.json().get("response"))
except Exception as e:
    print("Error:", e)
