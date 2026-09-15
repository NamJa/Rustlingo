# 🦀 Rustlingo — 게임처럼 배우는 Rust

《The Rust Programming Language》(Rust 1.90 / 2024 edition 기준, 681쪽)의 전체 내용을
**Duolingo 스타일**로 학습하는 정적 웹 튜토리얼입니다. 빌드 도구·프레임워크 없이 HTML/CSS/JS만 사용합니다.

## 기능

- **학습 경로**: 5개 섹션 → 22개 챕터(부록 포함) → 레슨 노드. 이전 레슨을 끝내야 다음이 열립니다(자유 모드로 해제 가능).
- **레슨 흐름**: 개념 해설 → 문제 풀이 → 결과 화면. 문제 유형 6종(객관식·참/거짓·빈칸·출력 예측·코드 순서·짝 맞추기).
- **게이미피케이션**: XP·레벨, 하트 5개(틀리면 -1, 0이면 재도전), 틀린 문제 자동 재출제, 일일 스트릭 🔥, 업적 배지 10종, 복습 연습 모드.
- **코드 실행**: 해설 화면의 Rust 코드 블록마다 **▶ 실행** 버튼이 있어 [Rust Playground](https://play.rust-lang.org) API(`evaluate.json`)로 브라우저에서 바로 컴파일·실행하고 결과를 확인합니다. `fn main`이 없는 조각은 자동으로 감싸서 실행합니다. 실패 시 "Playground에서 열기" 링크로 폴백합니다.
- 진행 상황은 브라우저 `localStorage`에 저장됩니다.

## 커리큘럼

| 섹션 | 챕터 |
|---|---|
| 1. 입문 | 1 시작하기 · 2 추리 게임 · 3 일반 프로그래밍 개념 |
| 2. 핵심 개념 | 4 소유권 · 5 구조체 · 6 열거형과 패턴 매칭 · 7 모듈 · 8 컬렉션 · 9 에러 처리 |
| 3. 추상화와 테스트 | 10 제네릭·트레이트·라이프타임 · 11 테스트 · 12 I/O 프로젝트 · 13 클로저·이터레이터 |
| 4. 심화 | 14 Cargo · 15 스마트 포인터 · 16 동시성 · 17 비동기 |
| 5. 마스터 | 18 OOP · 19 패턴 · 20 고급 기능 · 21 최종 프로젝트 · 22 부록 |

세부 레슨 목록은 앱의 **커리큘럼** 탭에서 확인할 수 있습니다.

## 로컬 실행

```bash
python3 -m http.server 8000   # 그 후 http://localhost:8000
```

(`fetch`로 JSON을 읽기 때문에 `file://`로 직접 열면 동작하지 않습니다.)

## GitHub Pages 배포

1. 이 저장소를 GitHub에 push합니다(기본 브랜치 `main`).
2. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. `main`에 push할 때마다 `.github/workflows/pages.yml`이 데이터 검증(`validate_data.py`) 후 자동 배포합니다.
4. 주소: `https://<사용자명>.github.io/<저장소명>/`

## 데이터 구조

`data/chNN.json` 한 파일이 챕터 하나입니다. 스키마와 문제 유형은 `validate_data.py`가 강제합니다.

```bash
python3 validate_data.py
```

## 알아두기

Playground 실행 API는 비공식이며 속도 제한이 있습니다. 실행 버튼이 실패하면 옆의 "Playground에서 열기"를 사용하세요.

## 라이선스

앱 코드: MIT. 학습 내용은 원서를 바탕으로 새로 작성한 해설·문제입니다.
원서 *The Rust Programming Language*는 MIT/Apache-2.0 이중 라이선스로 공개되어 있습니다.
