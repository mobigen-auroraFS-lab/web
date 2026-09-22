# web

## 이 레포지토리는 무엇인가?

멀티모달(텍스트·이미지·영상·오디오) 데이터 통합 플랫폼의 **프론트엔드** 레포입니다.
플랫폼이 수집·분류·색인한 자산을 사람이 찾고 살펴보는 화면 — 검색, 자산 상세,
자산 간 관계 탐색, 주제 기반 탐색, 운영 관리 화면을 제공합니다.

`src/components/`에 Aurora Vue 디자인 시스템 컴포넌트(버튼, 인풋, 테이블 등)가 있고,
`src/pages/`에 실제 화면(예: 파일 검색)이 있습니다. `App.vue`는 URL 해시에 따라 그중
어떤 화면을 보여줄지 결정하는 최상위 루트 컴포넌트입니다. `src/DesignGuide/`는 요구사항
화면이 아니라 개발자·디자이너용 컴포넌트 카탈로그라 `pages/`와 분리되어 있습니다.

> 국책과제 **RS-2025-02215256** 산출물.

## 디렉터리 구조

```
src/
  App.vue              # 최상위 루트 컴포넌트 — URL 해시로 화면 분기
  router.js            # 해시 기반 경량 자체 라우터 (vue-router 미사용)
  style.css            # CSS 진입점 (Tailwind + 디자인 토큰 + 기본 리셋을 한 파일에서 불러옴)
  theme.css            # 디자인 토큰을 Tailwind v4 @theme로 연결하는 브릿지
  tokens/              # 색상·타이포그래피·간격 등 디자인 토큰 원본(css 변수)
  assets/
    images/             # 로고 등 정적 이미지
  components/          # 재사용 UI 컴포넌트 (AButton, AInput 등)
  layout/              # 화면 공통 레이아웃 (헤더, 기본 레이아웃 틀). 재사용 컴포넌트와
                        # 달리 이 앱 자체의 뼈대라 components/와 분리
  DesignGuide/
    DesignGuide.vue      # 디자인 시스템 컴포넌트 카탈로그 (#design-guide). 요구사항
                          # 화면이 아니라 pages/ 바깥에 둠
  pages/               # 실제 화면. 화면별 폴더에 로직·목업을 함께 둠
    FileSearch/
      FileSearch.vue      # 템플릿
      useFileSearch.js    # 상태/필터링/정렬 로직 (composable)
      fileSearch.mock.js  # API 연동 전 임시 목업 데이터
    Login/
      Login.vue            # 자리만 마련된 placeholder — 라우팅 미연결
    MultimodalSearch/
      MultimodalSearch.vue # 자리만 마련된 placeholder (#multimodal-search 라우팅 연결됨)
  main.js              # 앱 마운트 시작점
```

## 사용 환경

| 항목 | 버전/사양 |
|---|---|
| Node.js | 18.x 이상 (개발 확인: v18.20.8) |
| npm | 10.x 이상 (개발 확인: 10.8.2) |
| OS | macOS / Linux / Windows (Vite 기반, OS 제약 없음) |
| 브라우저 | 최신 Chrome / Edge / Safari (evergreen 브라우저 기준, IE 미지원) |

## 설치 방법

```bash
git clone <repo-url>
cd web
npm install
```

## 실행 및 운영 방법

| 명령어 | 용도 |
|---|---|
| `npm run dev` | 로컬 개발 서버 실행 (기본 `http://localhost:5173`). 코드 저장 시 자동 반영(HMR) |
| `npm run build` | 배포용 정적 파일 빌드 → `dist/` 폴더 생성 |
| `npm run preview` | `npm run build` 결과물을 로컬에서 배포 환경과 동일하게 미리 확인 |
| `npm run format` | Prettier로 전체 코드 포맷 적용 |
| `npm run format:check` | Prettier 포맷 위반 여부만 확인 (변경 없음) |

배포는 `dist/` 폴더 내용을 정적 웹 서버(Nginx, 사내 서버, 또는 정적 호스팅 서비스)에
올리는 방식입니다. 별도의 Node.js 런타임을 서버에서 계속 띄워둘 필요는 없습니다.

> CI/CD 파이프라인은 아직 이 레포에 구성되어 있지 않습니다. 배포 대상 환경 및
> 배포 자동화 여부는 별도 확인이 필요합니다.

## 실행 예제

1. `npm run dev` 실행 후 브라우저에서 접속
2. 기본 주소(`http://localhost:5173`) → 파일 검색 화면(`src/pages/FileSearch/FileSearch.vue`),
   실제 서비스 화면(제품)의 메인 진입점입니다.
3. 헤더 내비게이션의 "멀티모달 검색"을 클릭하거나 주소 뒤에 `#multimodal-search`를
   붙이면 해당 화면(`src/pages/MultimodalSearch/MultimodalSearch.vue`, 현재 placeholder)으로
   전환됩니다.
4. 주소 뒤에 `#design-guide` 를 붙이면(`http://localhost:5173/#design-guide`) 디자인 시스템
   컴포넌트 카탈로그(`src/DesignGuide/DesignGuide.vue`)로 전환됩니다.

## 커밋 컨벤션

커밋 메시지는 아래 형식을 따릅니다.

```
[<Jira 이슈번호>]<타입>: <제목>
```

- 제목은 최대 50자, 마침표(.)로 끝내지 않음
- 타입은 아래 중 하나를 사용

| 타입 | 설명 |
|---|---|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 수정 (README 등) |
| `test` | 테스트 코드 추가/수정 |
| `refactor` | 동작 변경 없는 코드 구조 개선 |
| `style` | 포맷팅, 세미콜론 등 코드 의미에 영향 없는 변경 |
| `chore` | 빌드 설정, 패키지 매니저 등 그 외 잡무성 변경 |
| `build` | 빌드 시스템, 외부 종속성 변경 |

예시:
```
[HP-93]refactor: FileSearch 목업/로직 분리 및 pages 구조 도입
```

## 기타

- 디자인 토큰(`src/tokens/*.css`)에 색상·타이포그래피·간격·라운드·그림자 등이 정의되어
  있고, `src/theme.css`를 통해 Tailwind CSS와 연결됩니다. 전체는 `src/style.css`
  하나에서 불러옵니다.
- 현재 `src/pages/FileSearch/`는 실제 API 연동 전 단계로, 목업 데이터(`fileSearch.mock.js`)를
  사용합니다. API 연동 시 해당 파일만 교체하면 됩니다.
- 화면 간 라우팅 라이브러리(Vue Router 등)는 아직 도입되어 있지 않습니다. 대신
  `src/router.js`의 경량 자체 라우터가 URL 해시 변화를 반응형으로 추적하고,
  `src/App.vue`가 그 값에 따라 화면을 전환합니다 — 새로고침 없이 주소창 해시만
  바꿔도 화면이 전환됩니다.
- 코드 포맷은 Prettier(`.prettierrc`)로 통일합니다. 세미콜론 없음·싱글쿼트·trailing
  comma 없음이 기본 스타일이며, `npm run format`으로 적용할 수 있습니다.
