# MonBTI — 몬BTI

몬스터헌터 입문자가 자신의 플레이 취향에 맞는 무기를 찾도록 돕는 웹 검사입니다.
MBTI 검사처럼 질문에 답하는 경험을 제공하며, 기존 유저에게는 자신의 취향을 돌아보고 즐길 수 있는 콘텐츠를 목표로 합니다.

## 프로젝트 방향

- **첫 화면:** 기준 작품을 선택한 뒤 해당 작품의 검사로 진입합니다.
- **현재 지원 범위:** 몬스터헌터 와일즈만 대상으로 합니다.
- **주요 대상과 목적:** 입문자의 무기 선택을 돕습니다. 질문과 설명은 게임 지식이 없어도 이해할 수 있게 작성합니다.
- **기존 유저:** 검사와 결과를 재미있게 즐길 수 있도록 구성합니다.
- **배포 목표:** GitHub Pages에서 이용할 수 있는 웹사이트입니다.
- **개발 도구:** Codex와 Claude Code로 작업하며, 공통 지침과 기획을 저장소에서 관리합니다.

현재는 작품 선택 화면과 개발·배포 기반을 준비한 단계입니다. 질문 수, 선택지 형식, 성향 분류, 점수 계산, 결과 구성은 미정입니다.
기술 스택은 GitHub Pages에 맞는 Vite 기반 정적 웹사이트로 정했습니다.
참고 자료의 분류 체계를 어느 범위까지 채택할지도 자료 검토 후 결정합니다.

## 문서

| 문서 | 내용 |
| --- | --- |
| [기획 문서 안내](docs/README.md) | 문서 구성과 관리 원칙 |
| [프로젝트 기획](docs/project-plan.md) | 대상, 목적, 작품 선택 흐름, 범위 |
| [검사 설계](docs/test-design.md) | 질문·분류·추천 설계와 미정 항목 |
| [결정 기록](docs/decisions.md) | 확정 사항과 방향 변경 이력 |
| [참고 자료](docs/references.md) | 참고 자료의 제목과 링크 목록 |
| [개발 및 AI 협업](docs/development.md) | Codex·Claude 작업 방법과 개발 준비 |

## 빠른 시작

Node.js 22 이상에서 다음 명령을 실행합니다.

```sh
npm install
npm run dev
```

검증과 배포 절차는 [개발 및 AI 협업](docs/development.md)에서 확인합니다.

## 문서 갱신 원칙

대화에서 프로젝트 방향이 확정되거나 변경되면, 해당 작업에서 README와 관련 기획서를 함께 수정합니다.
변경 이유와 영향을 [결정 기록](docs/decisions.md)에 남깁니다.
제안과 미정 항목을 확정된 요구사항처럼 기록하지 않습니다.

## 참고 자료

- [무기 성향을 알아보자! 몬BTI - 1화, 카운터 취향인가? 회피 취향?](https://youtu.be/jKEeixLy53s?si=PzxnGpjuApMbsB3w)
- [무기 성향 그래프! 몬BTI 2화 - 대가리 빵꾸 사건](https://youtu.be/H6VwKlf0sEM?si=PT2gZXIvy-vL2lh3)
- [무기 성향 몬BTI 3탄! - 무기별 솔플과 멀티 부담감](https://youtu.be/W1PIL_u_oz4?si=sXscg0owIdyuO2hC)
- [모넌 취향 잡담! 몬BTI - 4화, 코인형과 적금형 무기](https://youtu.be/MoAE0ex5cE8?si=ajQrbzEm0ljXNZFD)
- [An (almost) definitive guide to picking a weapon — Reddit](https://www.reddit.com/r/MonsterHunter/comments/1jj5hze/an_almost_definitive_guide_to_picking_a_weapon/?tl=ko)
- [[MHW:IB] 무기를 고민하는 당신께, 무기추천 — 인벤](https://www.inven.co.kr/board/mhf/3749/9156)
- [몬스터 헌터 와일즈 입문, 초보 무기 고르는 법 2026 — 꿀잼픽](https://sideprofit.tistory.com/269)
- [선브레이크 무기 퀴즈 — 몬스터헌터 공식 사이트](https://www.monsterhunter.com/content/sunbreak-weaponquiz/ko/)
