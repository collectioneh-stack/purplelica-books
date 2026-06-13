# 로컬 LLM 번역 비교 테스트

## 목적
구텐베르크 영어 원서 → 한국어 번역을 Claude API 대신 로컬 LLM으로 전환 가능한지 검증.

## 테스트 대상
- Claude (현재 기준선)
- EXAONE Deep 7.8B
- EXAONE Deep 32B
- Qwen2.5 32B
- DeepSeek-R1 14B
- DeepSeek-R1 32B

## 테스트 데이터
- 책: A Christmas Carol (Dickens, pg46)
- 페이지: 3페이지, 17단락, 6,296자

## 실행 순서

### 1. 모델 다운로드 상태 확인
```bash
ollama list
```
5개 모두 보여야 함 (없으면 `ollama pull <name>` 재실행).

### 2. 6-way 번역 실행
```bash
cd /home/purple/ai-ceo-os/projects/bookmap/scripts/local-llm-test
python3 compare.py
```
- 각 모델당 5~30분 소요 (32B는 더 오래)
- 이미 완료된 모델은 자동 스킵
- 결과: `results/<model>.json`

### 3. 비교 보고서 생성
```bash
python3 report.py
```
- `REPORT.md` 생성
- 속도 매트릭스 + 단락별 side-by-side + 정성 평가 영역

### 4. CEO 정성 채점
`REPORT.md` 열어서 각 모델 종합 1~5점 채점 → 최종 의사결정

## 파일 구조
```
local-llm-test/
├── test_input.json   # 영문 원문 (17단락)
├── test_meta.json    # 책 메타
├── compare.py        # 번역 실행
├── report.py         # 보고서 생성
├── results/          # 모델별 번역 결과
│   ├── claude.json
│   ├── exaone-deep_7.8b.json
│   └── ...
└── REPORT.md         # 최종 비교 보고서
```
