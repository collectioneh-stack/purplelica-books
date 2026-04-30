# 한국어 번역 현황

> 새 책 번역 완료 시 이 파일을 업데이트하세요.
> 중복 작업 방지용 — 번역 전 반드시 이 목록 확인.

## 번역 완료

| PG ID | 한국어 제목 | 원제 | 페이지 수 | 완료일 |
|:---:|:---|:---|:---:|:---:|
| pg84 | 프랑켄슈타인 | Frankenstein | 70 | 2026-04-30 |
| pg11 | 이상한 나라의 앨리스 | Alice's Adventures in Wonderland | 26 | 2026-04-30 |
| pg5200 | 변신 | Metamorphosis | 24 | 2026-05-01 |
| pg1342 | 오만과 편견 | Pride and Prejudice | 113 | 2026-05-01 |

## 번역 대기 (우선순위 순)

| PG ID | 한국어 제목 | 원제 | 비고 |
|:---:|:---|:---|:---|
| 1661 | 셜록 홈즈의 모험 | The Adventures of Sherlock Holmes | |
| 174 | 도리안 그레이의 초상 | The Picture of Dorian Gray | |
| 345 | 드라큘라 | Dracula | 장편 — 여러 세션 필요 |
| 98 | 두 도시 이야기 | A Tale of Two Cities | 장편 |
| 2701 | 모비 딕 | Moby Dick | 장편 |
| 76 | 허클베리 핀의 모험 | Adventures of Huckleberry Finn | |
| 1400 | 위대한 기대 | Great Expectations | 장편 |
| 2542 | 인형의 집 | A Doll's House | |

## 번역 방법

### 사전 번역 스크립트 (Gemini API)
```bash
cd projects/bookmap
node scripts/pre-translate.js {pg_id}
```
- Gemini 무료 티어 할당량 초과 시 → Claude가 직접 번역 (JSON 수동 작성)
- 페이지당 약 1200 단어 기준으로 분할됨

### 번역 완료 후 할 일
1. `public/translations/STATUS.md` 업데이트
2. `git add public/translations/pg{id}/ public/translations/STATUS.md`
3. `git commit -m "feat: {한국어제목}(pg{id}) 전체 번역 완료"`
4. `git subtree push --prefix=projects/bookmap purplelica-books master`
5. `vercel deploy --prod --yes` (bookmap 디렉토리에서)
