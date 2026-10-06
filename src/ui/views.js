// 화면 마크업. 상태를 받아 문자열을 돌려주며 이벤트 연결은 app.js가 맡는다.
import { AXES } from '../core/axes.js';
import { RESPONSES } from '../core/responses.js';

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

function formatTotal(total) {
  // 표시할 때만 소수 첫째 자리로 반올림한다. 계산값은 그대로 둔다.
  const rounded = Math.round(total * 10) / 10 || 0;
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function describeAxis(axis, { total, count }) {
  if (total === null) return { value: '—', direction: '이번 질문에서는 측정하지 않았어요.' };
  const value = formatTotal(total);
  if (total > 0) return { value, direction: `${axis.high} 쪽`, count };
  if (total < 0) return { value, direction: `${axis.low} 쪽`, count };
  return { value, direction: '어느 한쪽으로 기울지 않음', count };
}

export function renderResult(game, totals) {
  const rows = AXES.map((axis) => {
    const { value, direction, count } = describeAxis(axis, totals[axis.id]);
    const measured = totals[axis.id].total !== null;
    return `<li class="axis${measured ? '' : ' axis--unmeasured'}">
        <div class="axis__head"><strong>${axis.name}</strong><span class="axis__value">${value}</span></div>
        <p class="axis__direction">${direction}</p>
        <p class="axis__description">${escapeHtml(axis.description)}</p>
        ${measured ? `<p class="axis__meta">${axis.low} ↔ ${axis.high} · 관련 질문 ${count}개</p>` : ''}
      </li>`;
  }).join('');

  return `<section class="result" aria-labelledby="result-title">
    <p class="eyebrow">${escapeHtml(game.name)}</p>
    <h1 id="result-title" tabindex="-1">나의 플레이 취향</h1>
    <p class="result__lead">답변을 기준별로 더한 값입니다. 양수는 오른쪽 특성, 음수는 왼쪽 특성에 가깝다는 뜻이에요.</p>
    <ul class="axes">${rows}</ul>
    <p class="notice" role="note">무기 추천은 아직 준비 중이에요. 추천 방식이 정해지면 이 화면에서 어울리는 무기를 알려 드릴게요.</p>
    <div class="result__actions">
      <a class="button" href="#/${game.id}" data-action="review">답변 수정하기</a>
      <button class="button button--ghost" type="button" data-action="restart">처음부터 다시 하기</button>
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
