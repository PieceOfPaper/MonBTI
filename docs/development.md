# 개발 및 AI 협업

## 현재 상태

저장소에는 작품 선택·질문·결과(1~3순위·차트·영상·공유) 화면, 시트 변환기, 기획 문서, AI 작업 지침 및 GitHub Pages 배포 기반이 있습니다.
Vite 기반의 의존성 관리와 빌드에는 npm을 사용하고, 단위 테스트에는 Vitest를 사용합니다.
정적 산출물은 `dist/`에 생성되며 GitHub Pages에서 `/MonBTI/` 경로로 제공되도록 설정되어 있습니다.

## 코드 구조

| 경로 | 역할 |
| --- | --- |
| `scripts/convert-sheet.js` | 원본 시트 XLSX를 읽어 작품별 JSON 생성 |
| `scripts/sheet-converter.js` | 열 이름 매핑과 변환 오류 검증 |
| `scripts/json-output.js` | 시각을 제외한 데이터 변경 판단 |
| `src/data/<작품 ID>/` | 생성된 무기·질문 JSON. 직접 편집하지 않음 |
| `src/games/index.js` | 작품 등록과 작품별 데이터·표시 자료 연결 |
| `src/games/<작품 ID>/media.js` | 무기별 아이콘·소개 영상 ID |
| `src/assets/weapons/<작품 ID>/` | 무기 아이콘 파일 |
| `src/core/` | 기준 축, 공통 응답, 축별 합산·임시 환산, 임시 추천(`recommend.js`), 공유 링크(`share.js`) |
| `src/ui/views.js` | 화면 마크업 |
| `src/ui/radar.js` | 오각형 방사형 차트 위치 계산과 SVG |
| `src/ui/share-image.js` | 공유 이미지(캔버스). 공유할 때만 불러옴 |
| `src/app.js` | 해시 라우팅, 답변 상태와 세션 저장, 결과·공유 동작 |

## 로컬 개발 및 검증

Node.js 22 이상과 npm이 필요합니다. 저장소 루트에서 다음을 실행합니다.

```sh
npm install
npm run dev
```

개발 서버 주소는 실행 결과에 표시됩니다. 배포 산출물을 로컬에서 확인하려면 다음을 사용합니다.

```sh
npm run build
npm run preview
```

변경을 저장소에 올리기 전에는 아래 검증을 실행합니다.

```sh
npm test
npm run build
```

원본 시트의 데이터를 사이트에 반영할 때는 다음을 실행하고 생성된 JSON의 변경을 확인한 뒤 커밋합니다. 자세한 규칙은 [시트 데이터 설계](data-schema.md)를 따릅니다.

```sh
npm run data:convert
```

`package-lock.json`은 재현 가능한 설치를 위해 커밋합니다. `node_modules/`, `dist/`, 테스트 산출물은 커밋하지 않습니다.

## CI 및 GitHub Pages 배포

- `.github/workflows/ci.yml`은 풀 리퀘스트와 `main` 브랜치 푸시에서 의존성을 고정 설치하고 테스트와 빌드를 실행합니다.
- `.github/workflows/deploy-pages.yml`은 `main` 브랜치 푸시 또는 수동 실행에서 최신 `main`을 빌드해 GitHub Pages에 배포합니다.
- `.github/workflows/refresh-data.yml`은 **시트 데이터 갱신** 버튼으로 최신 원본을 내려받아 검증·변환하고, 테스트·빌드가 성공하면 데이터 두 파일만 `main`에 커밋한 뒤 같은 실행에서 Pages에 배포합니다. 두 배포 워크플로는 `pages` 동시 실행 그룹을 공유합니다.
- GitHub 저장소의 **Settings → Pages → Build and deployment**에서 Source를 **GitHub Actions**로 한 번 선택해야 합니다. 이 설정은 워크플로 파일만으로 대신할 수 없습니다.
- 정상 배포 주소는 `https://pieceofpaper.github.io/MonBTI/`입니다. 저장소 이름을 바꾸면 `vite.config.js`의 `base`도 같은 경로로 바꿉니다.

## 버튼으로 시트 데이터 반영

1. 원본 시트의 무기·질문을 편집합니다.
2. [Actions → 시트 데이터 갱신](https://github.com/PieceOfPaper/MonBTI/actions/workflows/refresh-data.yml)을 엽니다.
3. **Run workflow**에서 브랜치를 **main**으로 선택하고 실행합니다. 별도 입력값은 없습니다.
4. 실행의 `refresh`와 `deploy`가 모두 성공하면 [사이트](https://pieceofpaper.github.io/MonBTI/)에서 확인합니다.

현재 시트는 로그인 없이 XLSX 다운로드가 가능하므로 별도 인증 Secret을 요구하지 않습니다. 시트 공유 설정은 변경하지 않습니다. 접근이 막히면 해당 단계에서 실패하며, 직접 내보낸 XLSX를 사용하는 로컬 절차로 반영할 수 있습니다.
`--if-changed`로 변환하기 때문에 실제 데이터·원본·형식 버전이 같으면 파일을 다시 쓰거나 커밋하지 않고 현재 데이터로 다시 배포합니다. 무기 탭의 `reason` 메모는 JSON에 포함하지 않습니다.

커밋에는 워크플로의 `GITHUB_TOKEN`을 사용합니다. 이 토큰으로 만든 푸시는 다른 `push` 워크플로를 실행하지 않으므로, 수동 워크플로 자체에서 테스트·빌드와 배포까지 수행합니다. 다운로드·검증·테스트·빌드에 실패하면 커밋과 배포를 진행하지 않습니다. 다른 작업으로 `main`이 먼저 변경되면 강제 푸시하지 않고 중단하므로 최신 상태에서 버튼을 다시 누릅니다. 커밋 후 배포 단계만 실패했다면 오류 해결 후 재실행할 수 있습니다.

## Codex와 Claude Code 시작 방법

1. 저장소를 로컬에 복제하고 저장소 루트에서 작업을 시작합니다.
2. Codex는 루트 AGENTS.md를 프로젝트 지침으로 사용합니다.
3. Claude Code는 CLAUDE.md의 `@AGENTS.md` 가져오기로 같은 지침을 사용합니다.
4. README, 최신 기획과 결정 기록을 확인하고 작업합니다.

```sh
git clone https://github.com/PieceOfPaper/MonBTI.git
cd MonBTI
```

Codex를 설치·인증한 환경에서는 저장소 루트에서 `codex`를, Claude Code를 설치·인증한 환경에서는 `claude`를 실행합니다.
클라우드에서 작업할 때는 각 도구에 이 저장소 접근 권한을 연결하고, 시작 시 동일한 지침을 확인하도록 요청합니다.
저장소 파일만으로 계정 연결, 앱 설치, 서비스 측 리뷰 자동화가 활성화되지는 않습니다.

## 역할 및 인계

- 어느 도구든 같은 기획과 지침을 기준으로 작업합니다.
- 대화에서 정리한 내용은 사용자가 저장소 반영을 명시적으로 요청했을 때만 기록합니다. 반영을 요청받은 방향 변경은 README, 관련 기획, 결정 기록에 함께 갱신합니다.
- 작업을 넘길 때 변경한 내용, 확인한 결과, 미정 사항, 다음 작업을 커밋 또는 PR 설명에 남깁니다.
- 동시에 작업한다면 별도 브랜치 또는 worktree에서 작업하고 같은 파일의 동시 편집을 피합니다.
- 개인 설정과 인증 정보는 로컬에 둡니다. 공통 규칙은 AGENTS.md에서만 수정합니다.

## 구현을 이어갈 때 정할 사항

- 확정 추천 계산으로 `src/core/recommend.js`의 임시 무작위 선택 대체
- `computeAxisProfile`의 현재 환산이 확정 정규화 공식과 일치하는지 회귀 테스트 추가
- 추천 계산 도입 시 축별 비대칭 벌점, 동점, 답변 수정, 공유 링크 검증

이 항목의 저장소 반영을 요청받으면 이 문서와 관련 기획을 함께 갱신합니다.

## 기본 파일 설정

- .editorconfig: UTF-8, LF, 기본 들여쓰기와 파일 끝 개행
- .gitattributes: 텍스트 파일의 LF 통일
- .gitignore: 개인 설정, 비밀 값, 의존성·빌드 결과·캐시 제외
- .github/pull_request_template.md: 변경 목적, 문서 반영, 검증 및 미정 사항 기록
- .claude/settings.json: Claude Code 공통 권한 허용 목록(테스트·빌드·의존성 설치와 읽기 전용 git 명령). 개인 설정은 `.claude/settings.local.json`에 둡니다.

## 공식 도구 문서

- [Codex — Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Claude Code — How Claude remembers your project](https://code.claude.com/docs/en/memory)
