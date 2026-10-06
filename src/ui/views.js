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

export function renderGameSelection(games) {
  const choices = games
    .map(({ id, name, description }) => `
      <li><a class="game-card" href="#/${id}" data-game-id="${id}">
        <span class="game-card__label">현재 검사 가능</span>
        <strong>${escapeHtml(name)}</strong><span>${escapeHtml(description)}</span>
      </a></li>`)
    .join('');

  return `<section class="hero" aria-labelledby="page-title">
    <p class="eyebrow">MONBTI</p><h1 id="page-title" tabindex="-1">어떤 무기가 나와 잘 맞을까?</h1>
    <p>어려운 게임 용어 없이, 나의 플레이 취향부터 알아봅니다.</p>
    <ul class="game-list" aria-label="검사할 작품 선택">${choices}</ul>
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

export function renderEmpty(game) {
  return `<section class="hero" aria-labelledby="empty-title">
    <p class="eyebrow">${escapeHtml(game.name)}</p>
    <h1 id="empty-title" tabindex="-1">검사를 준비하고 있어요.</h1>
    <p>질문이 등록되면 이곳에서 시작할 수 있습니다.</p>
    <a class="button button--ghost" href="#/">작품 선택으로 돌아가기</a>
  </section>`;
}
