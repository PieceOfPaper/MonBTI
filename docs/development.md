# 개발 및 AI 협업

## 현재 상태

저장소에는 작품 선택 화면, 기획 문서, AI 작업 지침 및 GitHub Pages 배포 기반이 있습니다.
Vite 기반의 의존성 관리와 빌드에는 npm을 사용하고, 단위 테스트에는 Vitest를 사용합니다.
정적 산출물은 `dist/`에 생성되며 GitHub Pages에서 `/MonBTI/` 경로로 제공되도록 설정되어 있습니다.

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

`package-lock.json`은 재현 가능한 설치를 위해 커밋합니다. `node_modules/`, `dist/`, 테스트 산출물은 커밋하지 않습니다.

## CI 및 GitHub Pages 배포

- `.github/workflows/ci.yml`은 풀 리퀘스트와 `main` 브랜치 푸시에서 의존성을 고정 설치하고 테스트와 빌드를 실행합니다.
- `.github/workflows/deploy-pages.yml`은 `main` 브랜치 푸시 또는 수동 실행에서 `dist/`를 GitHub Pages에 배포합니다.
- GitHub 저장소의 **Settings → Pages → Build and deployment**에서 Source를 **GitHub Actions**로 한 번 선택해야 합니다. 이 설정은 워크플로 파일만으로 대신할 수 없습니다.
- 정상 배포 주소는 `https://pieceofpaper.github.io/MonBTI/`입니다. 저장소 이름을 바꾸면 `vite.config.js`의 `base`도 같은 경로로 바꿉니다.

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
- 방향이 바뀌면 README, 관련 기획, 결정 기록을 함께 갱신합니다.
- 작업을 넘길 때 변경한 내용, 확인한 결과, 미정 사항, 다음 작업을 커밋 또는 PR 설명에 남깁니다.
- 동시에 작업한다면 별도 브랜치 또는 worktree에서 작업하고 같은 파일의 동시 편집을 피합니다.
- 개인 설정과 인증 정보는 로컬에 둡니다. 공통 규칙은 AGENTS.md에서만 수정합니다.

## 구현을 이어갈 때 정할 사항

- 작품별 데이터 구조, 질문·결과·점수 계산의 구분
- 결과 URL과 새로고침 처리
- 모바일 화면, 키보드 사용, 결과 공유
- 데이터·계산 변경에 필요한 검증

이 항목이 결정되면 이 문서와 관련 기획을 함께 갱신합니다.

## 기본 파일 설정

- .editorconfig: UTF-8, LF, 기본 들여쓰기와 파일 끝 개행
- .gitattributes: 텍스트 파일의 LF 통일
- .gitignore: 개인 설정, 비밀 값, 의존성·빌드 결과·캐시 제외
- .github/pull_request_template.md: 변경 목적, 문서 반영, 검증 및 미정 사항 기록

## 공식 도구 문서

- [Codex — Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Claude Code — How Claude remembers your project](https://code.claude.com/docs/en/memory)
