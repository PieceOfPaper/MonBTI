// 화면 마크업. 상태를 받아 문자열을 돌려주며 이벤트 연결은 app.js가 맡는다.
import { DEFAULT_AXIS_MODEL, axisModelOf } from '../core/axis-models.js';
import { AMPLIFY_FACTOR } from '../core/central.js';
import { NICKNAME_MAX_LENGTH } from '../core/nickname.js';
import { RESPONSES } from '../core/responses.js';
import { renderRadarSvg } from './radar.js';
import {
  COMPARE_SECTION_TITLE, RANK_LABELS, comparisonRows, difficultyContent, displayName, winnerBadge, winnerName, quoteContent, reasonContent, resultReasonContent, resultTitle,
} from './result-content.js';

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const GITHUB_ICON = `<svg class="credit__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`;
// 공유 버튼 아이콘. 선 아이콘으로 그려 버튼 글자색을 따른다.
const IMAGE_ICON = `<svg class="share__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>`;
const LINK_ICON = `<svg class="share__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
const YOUTUBE_ICON = `<svg class="credit__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#ff0033" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><path fill="#fff" d="M9.545 15.568V8.432L15.818 12z"/></svg>`;

// 작품 카드: 왼쪽에 기반 작품 로고, 오른쪽에 검사 이름(버전은 작게)과 짧은 소개. 개발 중 여부와 관계없이 같은 모양이다.
function renderGameChoice({ id, title, version, logo, description }) {
  const label = version ? `${title} ${version}` : title;
  return `
      <li><a class="game-card" href="#/${id}" data-game-id="${id}" data-start-quiz="${id}">
        ${logo ? `<img class="game-card__logo" src="${escapeHtml(logo)}" alt="" />` : ''}
        <strong class="game-card__title">${escapeHtml(title)}${version ? ` <span class="game-card__version">${escapeHtml(version)}</span>` : ''}</strong>
        <span class="game-card__description">${escapeHtml(description)}</span>
      </a><a class="button button--ghost game-guide" href="#/${id}/guide" aria-label="${escapeHtml(label)} 검사 설명">검사 설명</a></li>`;
}

// 개발 중인 검사는 기본으로 접어 둔 목록에 따로 보여 주고, 없으면 목록 자체를 만들지 않는다.
export function renderGameSelection(games) {
  const choices = games.filter(({ development }) => !development).map(renderGameChoice).join('');
  const developing = games.filter(({ development }) => development);
  const developingList = developing.length
    ? `<details class="game-dev">
      <summary>개발 중인 검사 <span class="game-dev__count">${developing.length}</span></summary>
      <p class="game-dev__note">아직 만들고 있는 검사예요. 질문·무기 수치와 결과가 예고 없이 바뀔 수 있어요.</p>
      <ul class="game-list game-list--dev" aria-label="개발 중인 검사 선택">${developing.map(renderGameChoice).join('')}</ul>
    </details>`
    : '';

  return `<section class="hero" aria-labelledby="page-title">
    <h1 id="page-title" tabindex="-1">MonBTI</h1>
    <p>몬스터헌터와 관련된 여러 검사를 제공해요.</p>
    ${choices ? `<ul class="game-list" aria-label="검사할 작품 선택">${choices}</ul>` : ''}
    ${developingList}
    <footer class="credit">
      <p class="credit__by">
        <span>Made by <strong>종잇장</strong></span>
        <a class="credit__link" href="https://github.com/PieceOfPaper" target="_blank" rel="noopener noreferrer">${GITHUB_ICON}GitHub</a>
        <a class="credit__link" href="https://www.youtube.com/@lancer_owl" target="_blank" rel="noopener noreferrer">${YOUTUBE_ICON}랜스하는 부엉이</a>
      </p>
    </footer>
  </section>`;
}

// 검사 시작 전 이름 입력. value는 입력 칸의 기본값(이번 검사의 이름, 없으면 기본 이름)이다.
export function renderNameForm(game, value = '') {
  return `<section class="quiz" aria-labelledby="name-title">
    <header class="quiz__header">
      <p class="eyebrow">${escapeHtml(game.name)}</p>
    </header>
    <form class="quiz__form name-form" novalidate>
      <h1 id="name-title" class="quiz__question" tabindex="-1">결과에 표시할 이름을 알려 주세요</h1>
      <p class="name-form__help" id="nickname-help">결과 화면과 공유 이미지·링크에 이 이름이 그대로 나와요. 별명도 좋아요. (최대 ${NICKNAME_MAX_LENGTH}자)</p>
      <label class="sr-only" for="nickname">표시 이름</label>
      <input class="name-form__input" id="nickname" name="nickname" type="text" value="${escapeHtml(value)}"
        maxlength="${NICKNAME_MAX_LENGTH}" autocomplete="nickname" enterkeyhint="go" placeholder="이름을 입력해 주세요"
        aria-describedby="nickname-help nickname-error" required />
      <p class="name-form__error" id="nickname-error" role="alert"></p>
      <div class="quiz__nav">
        <a class="button button--ghost" href="#/">작품 선택으로</a>
        <button class="button" type="submit">검사 시작</button>
      </div>
    </form>
  </section>`;
}

export function renderQuestion(game, index, answers) {
  const { questions } = game;
  const question = questions[index];
  const selected = answers[question.question_id];
  const isLast = index === questions.length - 1;
  // 6칸 게이지. 칸에는 글자를 두지 않고 양 끝의 안내와 선택한 응답 문구로 의미를 보여 준다.
  const cells = RESPONSES.map(({ value, label }) => `
          <label class="scale__cell scale__cell--${value}" title="${label}">
            <input type="radio" name="response" value="${value}"${selected === value ? ' checked' : ''} />
            <span class="sr-only">${label}</span>
          </label>`).join('');
  const selectedLabel = RESPONSES.find(({ value }) => value === selected)?.label ?? '';

  return `<section class="quiz" aria-labelledby="question-title">
    <header class="quiz__header">
      <p class="eyebrow">${escapeHtml(game.name)}</p>
      <p class="quiz__progress">질문 ${index + 1} / ${questions.length}</p>
      <progress max="${questions.length}" value="${index + 1}" aria-hidden="true"></progress>
    </header>
    <form class="quiz__form" data-question-id="${escapeHtml(question.question_id)}">
      <fieldset>
        <legend><h1 id="question-title" class="quiz__question" tabindex="-1">${escapeHtml(question.question_text)}</h1></legend>
        <div class="scale">
          <span class="scale__end scale__end--low" aria-hidden="true">그렇지 않다</span>
          <div class="scale__cells">${cells}
          </div>
          <span class="scale__end scale__end--high" aria-hidden="true">그렇다</span>
        </div>
        <p class="scale__selected" aria-hidden="true">${selectedLabel || '&nbsp;'}</p>
      </fieldset>
      <div class="quiz__nav">
        <button class="button button--ghost" type="button" data-action="prev">${index === 0 ? '이름 바꾸기' : '이전 질문'}</button>
        <button class="button" type="submit"${selected ? '' : ' disabled'}>${isLast ? '결과 보기' : '다음 질문'}</button>
      </div>
    </form>
  </section>`;
}

function weaponIcon(weapon, className) {
  return weapon.icon
    ? `<img class="${className}" src="${escapeHtml(weapon.icon)}" alt="" width="100" height="100" />`
    : `<span class="${className} ${className}--text" aria-hidden="true">${escapeHtml(weapon.weapon_name.slice(0, 1))}</span>`;
}

// 결과 상단의 1순위 무기. 순위 표기와 상자 없이 아이콘 뒤의 빛과 큰 이름으로 강조하고, 바로 아래에 공식 소개 문구를 인용한다.
// 뒤에는 공식 사이트 배치를 따른 무기별 캐릭터 이미지를 흐리게 깐다(장식용이라 화면 낭독기에서 숨김).
function renderWinnerArt(weapon) {
  if (!weapon.characters?.length) return '';
  const images = weapon.characters.map(({ src, top, left, width }) => `
        <img src="${escapeHtml(src)}" alt="" style="top: ${top}%; left: ${left}%; width: ${width}%;" />`).join('');
  return `<div class="winner__art" aria-hidden="true"><div class="winner__frame">${images}
      </div></div>`;
}

// 입문 난이도: 같은 작품 무기 사이의 상대평가 별표. 별 글자 대신 단계를 읽어 주도록 화면 낭독기용 이름을 붙인다.
function renderDifficulty(weapon, weapons, axisModel) {
  const { title, label, spoken } = difficultyContent(weapon, weapons, axisModel);
  return `<p class="difficulty">
          <span class="difficulty__label">${title}</span>
          <span class="difficulty__stars" role="img" aria-label="${spoken}">${label}</span>
        </p>`;
}

// badge는 중앙형 특별 결과의 물음표 표시(result-content.js의 winnerBadge)이며 없으면 아이콘만 둔다.
// name은 크게 보여 주는 이름(result-content.js의 winnerName)이며 특별 결과면 끝에 물음표가 붙는다.
function renderWinner(weapon, weapons, axisModel, badge = null, name = weapon.weapon_name) {
  const icon = badge
    ? `<span class="winner__icon-wrap">${weaponIcon(weapon, 'winner__icon')}<span class="winner__badge" role="img" aria-label="${escapeHtml(badge.label)}" title="${escapeHtml(badge.label)}">${escapeHtml(badge.mark)}</span></span>`
    : weaponIcon(weapon, 'winner__icon');
  return `<div class="winner">
      ${renderWinnerArt(weapon)}
      <div class="winner__main">
        ${icon}
        <strong class="winner__name">${escapeHtml(name)}</strong>
        ${renderDifficulty(weapon, weapons, axisModel)}
      </div>
      ${renderQuote(weapon)}
    </div>`;
}

// 비교할 무기를 고르는 1~3순위 버튼. 세 버튼은 같은 크기이며 누르면 기준 비교만 바뀐다.
function renderRanking(weapons, selectedIndex) {
  return weapons.map((weapon, index) => `
      <li class="rank">
        <button class="rank__button" type="button" data-select="${index}" aria-pressed="${index === selectedIndex}">
          <span class="rank__label">${RANK_LABELS[index]}</span>
          ${weaponIcon(weapon, 'rank__icon')}
          <strong class="rank__name">${escapeHtml(weapon.weapon_name)}</strong>
        </button>
      </li>`).join('');
}

// 1~3순위 버튼 아래의 접히는 '나머지 무기' 목록. 순위 번호는 4순위부터 이어지고, 누르면 그 무기와 비교한다.
function renderOthers(others, selectedIndex, open) {
  if (others.length === 0) return '';
  const items = others.map((weapon, offset) => {
    const index = offset + RANK_LABELS.length;
    return `
        <li><button class="others__button" type="button" data-select="${index}" aria-pressed="${index === selectedIndex}">
          <span class="others__rank">${index + 1}순위</span>
          ${weaponIcon(weapon, 'others__icon')}
          <span class="others__name">${escapeHtml(weapon.weapon_name)}</span>
        </button></li>`;
  }).join('');
  return `<div class="others">
      <button class="others__toggle" type="button" data-action="toggle-others" aria-expanded="${open}" aria-controls="other-weapons">나머지 무기</button>
      <ol class="others__list" id="other-weapons" aria-label="나머지 무기 순위"${open ? '' : ' hidden'}>${items}
      </ol>
    </div>`;
}

// 1순위 추천 이유. 다른 무기를 선택해도 바뀌지 않으며, 없는 항목은 자리를 두지 않는다.
// 내용은 result-content.js가 원문으로 만들고 여기서 한 번에 이스케이프한다.
export function renderRecommendationReason(reason, weapons) {
  return renderReasonContent(reasonContent(reason, weapons));
}

// 설명 영역(추천 이유 또는 중앙형 특별 결과 안내)을 그린다. 내용은 result-content.js가 만든다.
function renderReasonContent(content) {
  if (!content) return '';
  const parts = content.parts.map(({ title, lines }) => `
        <div class="reason__part">
          <h3>${escapeHtml(title)}</h3>
          ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
        </div>`).join('');
  return `<section class="result__section reason" aria-labelledby="reason-title">
      <h2 id="reason-title">${escapeHtml(content.title)}</h2>
      <p class="reason__lead">${escapeHtml(content.lead)}</p>${parts}
    </section>`;
}

// 선택한 무기와 나의 기준 비교(차트·표). 비교 대상 버튼을 누르면 이 부분만 다시 그린다.
// axisModel은 작품의 축 모델이며 차트 꼭짓점과 표의 행 순서를 정한다.
export function renderComparisonView(profile, weapon, who, axisModel = DEFAULT_AXIS_MODEL) {
  const chart = renderRadarSvg(
    [{ values: weapon, className: 'radar__series--weapon' }, { values: profile, className: 'radar__series--me' }],
    { label: `${who} 점수와 ${escapeHtml(weapon.weapon_name)} 기준 비교`, axes: axisModel.axes },
  );
  const rows = comparisonRows(profile, weapon, axisModel).map(({ short, me, weapon: value }) => `
          <tr><th scope="row">${short}</th><td>${me}</td><td>${value}</td></tr>`).join('');
  return `<h3 id="compare-title" class="compare__title">${who} vs ${escapeHtml(weapon.weapon_name)}</h3>
      <div class="compare">
        <figure class="compare__chart">${chart}
          <figcaption class="legend">
            <span class="legend__item legend__item--me">${who}</span>
            <span class="legend__item legend__item--weapon">${escapeHtml(weapon.weapon_name)}</span>
          </figcaption>
        </figure>
        <table class="compare__table">
          <thead><tr><th scope="col">기준</th><th scope="col">${who}</th><th scope="col">${escapeHtml(weapon.weapon_name)}</th></tr></thead>
          <tbody>${rows}
          </tbody>
        </table>
      </div>`;
}

// 비교 대상 버튼(1~3순위와 나머지 무기)과 기준 비교.
function renderComparison(result, others, selected, selectedIndex, othersOpen, who, axisModel) {
  return `<section class="result__section" aria-labelledby="compare-section-title">
      <h2 id="compare-section-title">${COMPARE_SECTION_TITLE}</h2>
      <ol class="ranking" aria-label="추천 무기 순위">${renderRanking(result.weapons, selectedIndex)}
      </ol>
      ${renderOthers(others, selectedIndex, othersOpen)}
      <div class="compare-view" id="compare-view" aria-live="polite">
      ${renderComparisonView(result.profile, selected, who, axisModel)}
      </div>
    </section>`;
}

// 1순위 무기의 공식 소개 문구(인용). 결과 상단의 1순위 무기 아래에 둔다.
function renderQuote(weapon) {
  const quote = quoteContent(weapon);
  if (!quote) return '';
  const lines = quote.lines.map(escapeHtml).join('<br />');
  const credit = quote.credit ? `<figcaption class="quote__credit">${escapeHtml(quote.credit)}</figcaption>` : '';
  return `<figure class="quote">
        <blockquote>${lines}</blockquote>
        ${credit}
      </figure>`;
}

function renderVideo(weapon) {
  if (!weapon.videoId) return '';
  const id = escapeHtml(weapon.videoId);
  // 처음에는 미리보기 이미지만 보여 주고, 누르면 그 자리에서 영상을 바로 재생한다.
  return `<div class="video" data-video-id="${id}">
        <button class="video__play" type="button" data-action="play-video" aria-label="${escapeHtml(weapon.weapon_name)} 소개 영상 재생">
          <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" />
          <span class="video__icon" aria-hidden="true"></span>
        </button>
      </div>
      <p class="video__credit">출처: 캡콤아시아 공식 유튜브</p>`;
}

// 1순위 무기의 소개 영상. 제목 없이 기준 비교 아래에 두며 비교 대상을 바꿔도 그대로 둔다.
function renderIntro(weapon) {
  const video = renderVideo(weapon);
  if (!video) return '';
  return `<section class="result__section intro" aria-label="${escapeHtml(weapon.weapon_name)} 소개 영상">
      ${video}
    </section>`;
}

export function renderVideoPlayer(videoId, title) {
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&playsinline=1`;
  return `<iframe src="${src}" title="${escapeHtml(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
}

// result: { weapons: [1~3순위], profile: { 축: 0~100 | null }, nickname: 표시 이름, central?: 중앙형 특별 결과 모델 }
// central이 있으면 추천 이유 대신 중앙형 특별 결과 안내를 보여 준다.
// others는 4순위 이후 무기이며 selectedIndex는 기준 비교에 처음 보여 줄 무기의 전체 순위 위치다.
// shared가 참이면 공유 링크로 연 결과이며 다시 하기 대신 검사 시작을 안내한다.
// reason은 1순위 추천 이유 모델이며 없으면 그 영역을 생략한다.
export function renderResult(game, result, {
  selectedIndex = 0, shared = false, others = [], othersOpen = false, reason = null,
} = {}) {
  const winner = result.weapons[0];
  const axisModel = axisModelOf(game);
  const selected = [...result.weapons, ...others][selectedIndex] ?? winner;
  const name = displayName(result.nickname);
  const who = escapeHtml(name);
  const actions = shared
    ? `<a class="button" href="#/${game.id}" data-action="start" data-start-quiz="${game.id}">나도 검사하기</a>`
    : `<button class="button button--ghost" type="button" data-action="restart">처음부터 다시 하기</button>`;

  return `<section class="result" aria-labelledby="result-title">
    <p class="eyebrow">${escapeHtml(game.name)}</p>
    <h1 id="result-title" tabindex="-1">${escapeHtml(resultTitle(name))}</h1>
    ${renderWinner(winner, game.weapons, axisModel, winnerBadge(result), winnerName(result))}
    ${renderReasonContent(resultReasonContent(result, reason))}
    ${renderComparison(result, others, selected, selectedIndex, othersOpen, who, axisModel)}
    ${renderIntro(winner)}
    <section class="result__section share-section" aria-labelledby="share-title">
      <h2 id="share-title">결과 공유하기</h2>
      <div class="share">
        <button class="share__button" type="button" data-action="share-image" aria-label="이미지로 공유" title="이미지로 공유">${IMAGE_ICON}<span class="share__label">이미지</span></button>
        <button class="share__button" type="button" data-action="share-link" aria-label="링크 공유" title="링크 공유">${LINK_ICON}<span class="share__label">링크</span></button>
      </div>
      <p class="share__status" role="status" aria-live="polite"></p>
    </section>
    <div class="result__actions">
      ${actions}
      <a class="button button--ghost" href="#/">작품 선택으로</a>
    </div>
  </section>`;
}

// 중앙형 응답 특별 결과(core/central.js)를 쓰는 검사의 설명.
function renderCentralGuide() {
  return `
    <section aria-labelledby="guide-central">
      <h2 id="guide-central">다섯 기준이 모두 가운데에 가까우면</h2>
      <p>다섯 기준이 평균적으로 가운데(50)에서 10점 이내로만 떨어져 있으면 뚜렷한 취향이 보이지 않는다고 보고 <strong>특별 결과</strong>를 보여 줘요.</p>
      <ul class="guide__list">
        <li>1순위는 답변에서 살짝 기운 쪽을 ${AMPLIFY_FACTOR}배로 키워서 고른 무기예요. 재미로 고른 결과라 평소보다 잘 맞지 않을 수 있어요.</li>
        <li>2·3순위는 키우기 전 원래 답변으로 계산한 가장 가까운 무기예요.</li>
        <li>그래프와 표는 키우기 전 실제 답변 점수를 보여 줘요.</li>
      </ul>
    </section>`;
}

// 이전 버전 검사에서 달라진 점. 작품 설정의 changes를 대략적인 목록으로 보여 준다.
function renderChangesGuide({ from, items }) {
  return `
    <section aria-labelledby="guide-changes">
      <h2 id="guide-changes">${escapeHtml(from)} 검사에서 달라진 점</h2>
      <ul class="guide__list">${items.map((item) => `
        <li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </section>`;
}

// 검사 설명. 누구를 위한 검사인지, 어떻게 답하고 어떤 기준으로 무기를 고르는지 게임 지식 없이 읽을 수 있게 쓴다.
export function renderGuide(game) {
  const axes = axisModelOf(game).axes.map(({ short, name, guide, fit }) => `
      <li class="guide__axis">
        <h3><span class="guide__short">${short}</span> ${name}</h3>
        <p>${guide}</p>
        <p class="guide__fit">${fit}</p>
      </li>`).join('');
  const questionCount = game.questions.length;
  const weaponCount = game.weapons.length;

  return `<section class="guide" aria-labelledby="guide-title">
    <p class="eyebrow">${escapeHtml(game.name)}</p>
    <h1 id="guide-title" tabindex="-1">몬BTI는 어떤 검사인가요?</h1>
    <section aria-labelledby="guide-who">
      <h2 id="guide-who">누구를 위한 검사인가요?</h2>
      <p>몬스터헌터를 처음 시작해서 <strong>어떤 무기를 골라야 할지 고민하는 분</strong>을 위해 만들었어요. 게임을 몰라도 답할 수 있도록 게임 용어 대신 일상적인 상황과 취향을 물어봅니다.</p>
      <p>이미 게임을 즐기고 있는 분이라면 내 취향과 지금 쓰는 무기가 얼마나 닮았는지 재미로 확인해 보세요.</p>
    </section>
    <section aria-labelledby="guide-how">
      <h2 id="guide-how">어떻게 진행되나요?</h2>
      <ul class="guide__list">
        <li>시작할 때 결과에 표시할 이름(별명도 좋아요)을 입력해요. 결과와 공유 이미지·링크에 이 이름이 그대로 나와요.</li>
        <li>질문 ${questionCount}개에 답해요. 질문 순서는 검사할 때마다 섞여요.</li>
        <li>각 질문에 ‘전혀 그렇지 않다’부터 ‘매우 그렇다’까지 여섯 단계 중 하나를 골라요. 가운데 답은 없으니 조금이라도 더 가까운 쪽을 고르면 돼요.</li>
        <li>정답은 없어요. 잘하는 것보다 <strong>하고 싶은 것</strong>을 기준으로 답해 주세요.</li>
        <li>답을 마치면 ${weaponCount}가지 무기 중 나와 잘 맞는 무기 세 가지를 순서대로 보여 주고, 1순위 무기가 왜 추천됐는지도 함께 알려 줘요. 1순위 무기에는 입문 난이도를 별 다섯 개로 보여 주는데, 같은 작품의 무기끼리 비교한 값이라 추천 순위와는 상관없어요.</li>
      </ul>
    </section>
    <section aria-labelledby="guide-axes">
      <h2 id="guide-axes">어떤 기준으로 보나요?</h2>
      <p>답변으로 다섯 가지 기준마다 나의 점수를 0~100으로 매기고, 무기마다 정해 둔 같은 기준의 값과 비교해요.</p>
      <ul class="guide__axes">${axes}
      </ul>
      <p>다섯 기준을 합쳐서 가장 잘 맞는 무기부터 순위를 정해요. 한방과 반격은 어느 쪽으로 달라도 차이를 모두 반영하기 때문에, 다른 세 기준과 영향이 비슷해지도록 조금 낮은 비중으로 합쳐요.</p>
    </section>${game.centralResult ? renderCentralGuide() : ''}
    <section aria-labelledby="guide-not">
      <h2 id="guide-not">이런 것은 보지 않아요</h2>
      <ul class="guide__list">
        <li>무기가 멋있는지, 겉모습이 어떤지</li>
        <li>무기가 얼마나 강한지, 내 실력이 어느 정도인지</li>
        <li>버튼을 누르는 순서처럼 조작 입력이 어려운지</li>
        <li>몬스터의 움직임을 익히는 것처럼 모든 무기에 똑같이 필요한 것</li>
      </ul>
      <p class="guide__note">무기별 값은 테스트하면서 계속 다듬고 있어요. 결과는 첫 무기를 고르는 참고로 삼고, 마음에 드는 무기는 직접 써 보는 것을 추천해요.</p>
    </section>${game.changes ? renderChangesGuide(game.changes) : ''}
    <div class="result__actions">
      <a class="button" href="#/${game.id}" data-start-quiz="${game.id}">검사 시작하기</a>
      <a class="button button--ghost" href="#/">작품 선택으로</a>
    </div>
  </section>`;
}

export function renderEmpty(game) {
  return `<section class="hero" aria-labelledby="empty-title">
    <p class="eyebrow">${escapeHtml(game.name)}</p>
    <h1 id="empty-title" tabindex="-1">검사를 준비하고 있어요.</h1>
    <p>질문이 등록되면 이곳에서 시작할 수 있습니다.</p>
    <a class="button button--ghost" href="#/">작품 선택으로 돌아가기</a>
  </section>`;
}
