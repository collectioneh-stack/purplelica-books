# 한국어 번역 현황

> 새 책 번역 완료 시 이 파일을 업데이트하세요.
> 중복 작업 방지용 — 번역 전 반드시 이 목록 확인.
> **마지막 디스크 실사: 2026-05-02** (STATUS.md ≠ 실제 파일 사고 방지용)

> **리맵핑 대기**: pg16(피터팬), pg2500(싯다르타)는 순차 매핑으로 번역 완료.
> 챕터 기준 리맵핑 후 최종 확정 예정.

## 번역 완료 (파일 존재 확인됨)

| PG ID | 한국어 제목 | 원제 | 페이지 수 | 완료일 |
|:---:|:---|:---|:---:|:---:|
| pg11 | 이상한 나라의 앨리스 | Alice's Adventures in Wonderland | 26 | 2026-04-30 |
| pg41 | 슬리피 할로우의 전설 | The Legend of Sleepy Hollow | 14 | 2026-05-01 |
| pg84 | 프랑켄슈타인 | Frankenstein | 70 | 2026-04-30 (복구됨) |
| pg1342 | 오만과 편견 | Pride and Prejudice | 113 | 2026-05-01 (복구됨) |
| pg1064 | 붉은 죽음의 가면 | The Masque of the Red Death | 5 | 2026-05-02 |
| pg1080 | 겸손한 제안 | A Modest Proposal | 6 | 2026-05-02 |
| pg1661 | 셜록 홈즈의 모험 | The Adventures of Sherlock Holmes | 94 | 2026-05-01 |
| pg1934 | 순수의 노래와 경험의 노래 | Songs of Innocence and of Experience | 8 | 2026-05-02 |
| pg1952 | 노란 벽지 | The Yellow Wallpaper | 8 | 2026-05-02 |
| pg2542 | 인형의 집 | A Doll's House | 19 | 2026-05-01 |
| pg5200 | 변신 | Metamorphosis | 24 | 2026-05-01 |
| pg721 | 새들의 크리스마스 캐럴 | The Birds' Christmas Carol | 14 | 2026-05-02 |
| pg43 | 지킬 박사와 하이드 씨 | The Strange Case of Dr. Jekyll and Mr. Hyde | 27 | 2026-05-02 |
| pg46 | 크리스마스 캐럴 | A Christmas Carol | 27 | 2026-05-02 |
| pg16 | 피터 팬 | Peter Pan | 40 | 2026-05-02 (리맵핑 대기) |
| pg2500 | 싯다르타 | Siddhartha | 71 | 2026-05-02 (리맵핑 대기) |
| pg103 | 해저 2만리 | Twenty Thousand Leagues Under the Sea | 0 | 번역 대기 |

## 복구 필요 (파일 소실 — 최우선 작업)

| PG ID | 한국어 제목 | 상태 | 복구 방법 | 예상 작업량 |
|:---:|:---|:---|:---|:---:|
| pg345 | 드라큘라 | p123~p138 누락 (132/148p) | 16페이지 재번역 | ~16시간 |

## 번역 완료 — 최근 추가

| PG ID | 한국어 제목 | 원제 | 페이지 수 | 완료일 |
|:---:|:---|:---|:---:|:---:|
| pg2701 | 모비 딕 | Moby Dick | 462 | 2026-05-02 |

## 번역 진행 중

| PG ID | 한국어 제목 | 원제 | 진행률 | 비고 |
|:---:|:---|:---|:---:|:---|

## 번역 대기 (우선순위 순)

| PG ID | 한국어 제목 | 원제 | 비고 |
|:---:|:---|:---|:---|
| pg174 | 도리안 그레이의 초상 | The Picture of Dorian Gray | |
| pg98 | 두 도시 이야기 | A Tale of Two Cities | 장편 |
| pg76 | 허클베리 핀의 모험 | Adventures of Huckleberry Finn | |
| pg1400 | 위대한 기대 | Great Expectations | 장편 |

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
