// 화면 마크업. 상태를 받아 문자열을 돌려주며 이벤트 연결은 app.js가 맡는다.
import { AXES } from '../core/axes.js';
import { RESPONSES } from '../core/responses.js';
import { renderRadarSvg } from './radar.js';

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const GITHUB_ICON = `<svg class="credit__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`;
const YOUTUBE_ICON = `<svg class="credit__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#ff0033" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><path fill="#fff" d="M9.545 15.568V8.432L15.818 12z"/></svg>`;

export function renderGameSelection(games) {
  const choices = games
    .map(({ id, name, logo, description }) => `
      <li><a class="game-card" href="#/${id}" data-game-id="${id}">
        <span class="game-card__label">현재 검사 가능</span>
        ${logo
          ? `<img class="game-card__logo" src="${escapeHtml(logo)}" alt="${escapeHtml(name)}" />`
          : `<strong>${escapeHtml(name)}</strong>`}<span>${escapeHtml(description)}</span>
      </a><a class="button button--ghost game-guide" href="#/${id}/guide" aria-label="${escapeHtml(name)} 검사 설명">검사 설명</a></li>`)
    .join('');

  return `<section class="hero" aria-labelledby="page-title">
    <p class="eyebrow">MONBTI</p><h1 id="page-title" tabindex="-1">어떤 무기가 나와 잘 맞을까?</h1>
    <p>어려운 게임 용어 없이, 나의 플레이 취향부터 알아봅니다.</p>
    <ul class="game-list" aria-label="검사할 작품 선택">${choices}</ul>
    <footer class="credit">
      <p class="credit__by">
        <span>Made by <strong>종잇장</strong></span>
        <a class="credit__link" href="https://github.com/PieceOfPaper" target="_blank" rel="noopener noreferrer">${GITHUB_ICON}GitHub</a>
        <a class="credit__link" href="https://www.youtube.com/@lancer_owl" target="_blank" rel="noopener noreferrer">${YOUTUBE_ICON}랜스하는 부엉이</a>
      </p>
    </footer>
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
        <button class="button button--ghost" type="button" data-action="prev">${index === 0 ? '작품 선택으로' : '이전 질문'}</button>
        <button class="button" type="submit"${selected ? '' : ' disabled'}>${isLast ? '결과 보기' : '다음 질문'}</button>
      </div>
    </form>
  </section>`;
}

const RANK_LABELS = ['1순위', '2순위', '3순위'];

function weaponIcon(weapon, className) {
  return weapon.icon
    ? `<img class="${className}" src="${escapeHtml(weapon.icon)}" alt="" width="100" height="100" />`
    : `<span class="${className} ${className}--text" aria-hidden="true">${escapeHtml(weapon.weapon_name.slice(0, 1))}</span>`;
}

function renderRanking(weapons, selectedIndex) {
  return weapons.map((weapon, index) => `
      <li class="rank rank--${index + 1}">
        <button class="rank__button" type="button" data-select="${index}" aria-pressed="${index === selectedIndex}">
          <span class="rank__label">${RANK_LABELS[index]}</span>
          ${weaponIcon(weapon, 'rank__icon')}
          <strong class="rank__name">${escapeHtml(weapon.weapon_name)}</strong>
        </button>
      </li>`).join('');
}

const formatValue = (value) => (value === null ? '측정 안 됨' : String(Math.round(value)));

function renderComparison(profile, weapon, who) {
  const chart = renderRadarSvg(
    [{ values: weapon, className: 'radar__series--weapon' }, { values: profile, className: 'radar__series--me' }],
    { label: `${who}와 ${escapeHtml(weapon.weapon_name)}의 기준 비교` },
  );
  const rows = AXES.map(({ id, short }) => `
          <tr><th scope="row">${short}</th><td>${formatValue(profile[id])}</td><td>${formatValue(weapon[id])}</td></tr>`).join('');
  return `<section class="result__section" aria-labelledby="compare-title">
      <h2 id="compare-title">${who} vs ${escapeHtml(weapon.weapon_name)}</h2>
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
      </div>
    </section>`;
}

function renderVideo(weapon) {
  if (!weapon.videoId) return '';
  const id = escapeHtml(weapon.videoId);
  // 처음에는 미리보기 이미지만 보여 주고, 누르면 그 자리에서 영상을 바로 재생한다.
  return `<section class="result__section" aria-labelledby="video-title">
      <h2 id="video-title">${escapeHtml(weapon.weapon_name)} 소개 영상</h2>
      <div class="video" data-video-id="${id}">
        <button class="video__play" type="button" data-action="play-video" aria-label="${escapeHtml(weapon.weapon_name)} 소개 영상 재생">
          <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" />
          <span class="video__icon" aria-hidden="true"></span>
        </button>
      </div>
      <p class="video__credit">출처: 캡콤아시아 공식 유튜브</p>
    </section>`;
}

export function renderVideoPlayer(videoId, title) {
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&playsinline=1`;
  return `<iframe src="${src}" title="${escapeHtml(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
}

// result: { weapons: [1~3순위], profile: { 축: 0~100 | null } }
// shared가 참이면 공유 링크로 연 결과이며 답변 수정 대신 검사 시작을 안내한다.
export function renderResult(game, result, { selectedIndex = 0, shared = false } = {}) {
  const selected = result.weapons[selectedIndex];
  const actions = shared
    ? `<a class="button" href="#/${game.id}" data-action="start">나도 검사하기</a>`
    : `<a class="button button--ghost" href="#/${game.id}" data-action="review">답변 수정하기</a>
      <button class="button button--ghost" type="button" data-action="restart">처음부터 다시 하기</button>`;

  return `<section class="result" aria-labelledby="result-title">
    <p class="eyebrow">${escapeHtml(game.name)}</p>
    <h1 id="result-title" tabindex="-1">${shared ? '친구와 어울리는 무기' : '나와 어울리는 무기'}</h1>
    <ol class="ranking" aria-label="추천 무기 순위">${renderRanking(result.weapons, selectedIndex)}
    </ol>
    ${renderComparison(result.profile, selected, shared ? '친구' : '나')}
    ${renderVideo(selected)}
    <section class="result__section" aria-labelledby="share-title">
      <h2 id="share-title">결과 공유하기</h2>
      <div class="share">
        <button class="button" type="button" data-action="share-image">이미지로 공유</button>
        <button class="button" type="button" data-action="share-link">링크 공유</button>
      </div>
      <p class="share__status" role="status" aria-live="polite"></p>
    </section>
    <div class="result__actions">
      ${actions}
      <a class="button button--ghost" href="#/">작품 선택으로</a>
    </div>
  </section>`;
}

// 검사 설명. 누구를 위한 검사인지, 어떻게 답하고 어떤 기준으로 무기를 고르는지 게임 지식 없이 읽을 수 있게 쓴다.
export function renderGuide(game) {
  const axes = AXES.map(({ short, name, guide, fit }) => `
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
        <li>질문 ${questionCount}개에 답해요. 질문 순서는 검사할 때마다 섞여요.</li>
        <li>각 질문에 ‘전혀 그렇지 않다’부터 ‘매우 그렇다’까지 여섯 단계 중 하나를 골라요. 가운데 답은 없으니 조금이라도 더 가까운 쪽을 고르면 돼요.</li>
        <li>정답은 없어요. 잘하는 것보다 <strong>하고 싶은 것</strong>을 기준으로 답해 주세요.</li>
        <li>답을 마치면 ${weaponCount}가지 무기 중 나와 잘 맞는 무기 세 가지를 순서대로 보여 줘요.</li>
      </ul>
    </section>
    <section aria-labelledby="guide-axes">
      <h2 id="guide-axes">어떤 기준으로 보나요?</h2>
      <p>답변으로 다섯 가지 기준마다 나의 점수를 0~100으로 매기고, 무기마다 정해 둔 같은 기준의 값과 비교해요.</p>
      <ul class="guide__axes">${axes}
      </ul>
      <p>다섯 기준을 똑같은 비중으로 합쳐서 가장 잘 맞는 무기부터 순위를 정해요.</p>
    </section>
    <section aria-labelledby="guide-not">
      <h2 id="guide-not">이런 것은 보지 않아요</h2>
      <ul class="guide__list">
        <li>무기가 멋있는지, 겉모습이 어떤지</li>
        <li>무기가 얼마나 강한지, 내 실력이 어느 정도인지</li>
        <li>버튼을 누르는 순서처럼 조작 입력이 어려운지</li>
        <li>몬스터의 움직임을 익히는 것처럼 모든 무기에 똑같이 필요한 것</li>
      </ul>
      <p class="guide__note">무기별 값은 테스트하면서 계속 다듬고 있어요. 결과는 첫 무기를 고르는 참고로 삼고, 마음에 드는 무기는 직접 써 보는 것을 추천해요.</p>
    </section>
    <div class="result__actions">
      <a class="button" href="#/${game.id}">검사 시작하기</a>
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
