# CLAUDE.md

이 저장소에서 작업할 때 지켜야 할 규칙입니다. 레포 소개·설치·실행 방법은 `README.md`를 참고하세요.

## 아키텍처

- `src/App.vue`가 유일한 루트 컴포넌트입니다. `src/router.js`(URL 해시 기반 경량 자체 라우터)의
  값에 따라 화면을 반응형으로 전환합니다. **vue-router는 아직 도입하지 않았습니다** — 화면이
  늘어 중첩 라우트/가드가 필요해지기 전까지는 도입하지 마세요.
- 화면은 `src/pages/<화면명>/` 폴더 하나에 다음 3가지를 함께 둡니다.
  - `<화면명>.vue` — 템플릿. 로직은 최대한 넣지 않고 composable 결과를 템플릿에 연결만 함
  - `use<화면명>.js` — 상태/필터링/정렬 등 로직을 담는 composable
  - `<화면명>.mock.js` — 실제 API 연동 전까지 쓰는 임시 데이터. API 연동 시 이 파일만 교체
- `src/components/`에 재사용 가능한 디자인 시스템 컴포넌트(A 접두사: AButton, AInput 등)가
  있습니다. 새 화면을 만들 때 여기 먼저 확인하고 재사용하세요. 없는 스타일이 필요하면
  `!important` 인라인 오버라이드보다 컴포넌트에 variant를 추가하는 걸 우선 고려하세요.
- `src/components/layout/`에 화면 공통 레이아웃(`AppHeader.vue`, `DefaultLayout.vue`)이
  있습니다. 여러 화면이 공유하는 UI만 여기 둡니다.
- CSS 진입점은 `src/style.css` 하나입니다 (Tailwind + `src/tokens/*.css` 디자인 토큰 +
  기본 리셋). `src/theme.css`는 토큰을 Tailwind v4 `@theme`로 연결하는 브릿지이며, 색상 값이
  `src/tokens/colors.css`와 일부 중복 선언되어 있는 건 Tailwind v4의 제약 때문에 의도된
  것입니다 — 토큰 값을 바꾸면 두 파일 다 확인하세요.

## 코딩 원칙

- 화면이 1~2개뿐인 지금 단계에서는 최상위 `composables/`, `mocks/` 폴더보다 화면별 폴더
  안에 로직을 두는 걸 우선합니다. **같은 로직이 실제로 2개 이상 화면에서 필요해지는 시점에만**
  상위 공통 폴더로 승격하세요. 미리 만들어두지 마세요.
- 과도한 추상화, 사용하지 않는 옵션/훅, 향후를 대비한 설정값을 추가하지 마세요. 지금 필요한
  것만 구현합니다.
- 코드 수정 후에는 `npm run build`로 정상 빌드되는지 확인하세요.

## 커밋 컨벤션

`[<Jira 이슈번호>]<타입>: <제목>` 형식을 따릅니다. 타입 목록과 예시는 `README.md`의
"커밋 컨벤션" 절을 참고하세요.

## PR

`.github/PULL_REQUEST_TEMPLATE.md`가 있습니다. PR을 올릴 base 브랜치에 이 파일이 merge되어
있어야 자동으로 적용됩니다.
