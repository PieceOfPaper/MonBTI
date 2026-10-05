# MonBTI — 몬BTI

몬스터헌터 입문자가 자신의 플레이 취향에 맞는 무기를 찾도록 돕는 웹 검사입니다.
MBTI 검사처럼 질문에 답하는 경험을 제공하며, 기존 유저에게는 자신의 취향을 돌아보고 즐길 수 있는 콘텐츠를 목표로 합니다.

## 프로젝트 방향

- **첫 화면:** 기준 작품을 선택한 뒤 해당 작품의 검사로 진입합니다.
- **현재 지원 범위:** 몬스터헌터 와일즈만 대상으로 합니다.
- **주요 대상과 목적:** 입문자의 무기 선택을 돕습니다. 질문과 설명은 게임 지식이 없어도 이해할 수 있게 작성합니다.
- **질문 방향:** 일상에서 생각할 수 있는 행동 선호를 간접적으로 묻습니다. 한 응답은 여러 축으로 해석할 수 있지만, 독립된 주장들을 묶어 답하기 어렵게 만들지 않습니다. 앞으로 문항 작성·검토는 [질문 작성 가이드](docs/question-guide.md)를 따릅니다.
- **기존 유저:** 검사와 결과를 재미있게 즐길 수 있도록 구성합니다.
- **배포 목표:** GitHub Pages에서 이용할 수 있는 웹사이트입니다.
- **개발 도구:** Codex와 Claude Code로 작업하며, 공통 지침과 기획을 저장소에서 관리합니다.

현재는 작품 선택 → 질문 응답 → 기준별 합산 결과 확인까지 동작하는 단계이며, 무기 선택 기준 다섯 가지를 정했습니다.
무기 추천은 계산 방식이 정해지지 않아 결과 화면에서 준비 중으로 안내합니다.
응답은 모든 질문에 공통인 1~6단계 동의 척도를 사용하며, 한 질문이 여러 축에 영향을 줄 수 있습니다.
질문 수, 유형 구조, 무기 추천 계산과 결과 구성은 미정입니다.
기술 스택은 GitHub Pages에 맞는 Vite 기반 정적 웹사이트로 정했습니다.
참고 자료의 분류 체계를 어느 범위까지 채택할지도 자료 검토 후 결정합니다.

## 무기 선택 기준

멋짐 등 주관적인 인상보다 입문자의 손에 익숙해질 수 있는 플레이 특성을 기준으로 삼습니다.

| 기준 | 영문명·필드 이름 | 의미 |
| --- | --- | --- |
| 공격 성향 | attack | 꾸준히 대미지를 넣는 지속형 ↔ 준비하거나 모아서 한 번에 넣는 한방형 |
| 자유도 | freedom | 공격 중 이동·방향 전환과 다른 행동으로의 전환이 자유로운 정도 |
| 콤보 의존 | combo | 공격을 이어가야 제 역할을 하는 정도 |
| 자원 부담 | resource | 자원 확인·보충·유지에 신경 써야 하는 정도 |
| 카운터 의존 | counter | 카운터 중심으로 플레이해야 하는 정도 |

공격 성향은 두 스타일 사이의 성향이며, 나머지 네 기준은 정도의 높고 낮음을 평가합니다.
세부 평가 범위는 [검사 설계](docs/test-design.md)에 기록합니다.

## 데이터 원본

무기 특성과 질문은 [MonBTI_테이블](https://docs.google.com/spreadsheets/d/124oQusXZQ6_F9-UYUVAzG3TD7u50oBjKdBIEbrT7Ras/edit)에서 관리합니다.
와일즈 데이터는 `Wilds_Weapon`과 `Wilds_Question` 탭을 사용합니다.
질문은 한 행에 ID·순서·문구와 `attack`, `freedom`, `combo`, `resource`, `counter`의 부호 있는 가중치를 기록합니다. 응답 1~6에 각각 -1·-0.6·-0.2·0.2·0.6·1을 곱해 축별로 합산합니다. 음수 가중치는 방향을 반대로 바꾸며, 0·빈칸은 해당 축에 영향을 주지 않습니다.
무기 기준값 입력 범위는 0~100이며, 무기 14개에는 수정 가능한 임시값을 넣었고 질문 하나를 예시로 추가했습니다.
사이트는 시트에서 내보낸 데이터를 검증·변환한 JSON을 배포에 포함하는 방식으로 개발합니다.
열 정의와 반영 절차는 [시트 데이터 설계](docs/data-schema.md)에 기록했습니다. `npm run data:convert`로 시트를 검증·변환해 `src/data/wilds/`의 JSON을 갱신합니다.

## 문서

| 문서 | 내용 |
| --- | --- |
| [기획 문서 안내](docs/README.md) | 문서 구성과 관리 원칙 |
| [프로젝트 기획](docs/project-plan.md) | 대상, 목적, 작품 선택 흐름, 범위 |
| [검사 설계](docs/test-design.md) | 질문·분류·추천 설계와 미정 항목 |
| [질문 작성 가이드](docs/question-guide.md) | 일상 질문의 표현, 다축 해석과 문항 검토 기준 |
| [시트 데이터 설계](docs/data-schema.md) | 원본 시트, 열 정의, JSON 변환·반영 규칙 |
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

대화에서 정리한 내용은 사용자가 저장소 반영을 명시적으로 요청했을 때만 기록합니다.
반영을 요청받은 방향 변경은 같은 작업에서 README와 관련 기획서를 함께 수정합니다.
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
