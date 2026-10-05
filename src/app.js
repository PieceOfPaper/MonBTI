// 해시 라우팅과 화면 상태. GitHub Pages 하위 경로(/MonBTI/)에서도 새로고침이 동작하도록
// 경로 대신 #/<작품 ID>, #/<작품 ID>/result 형식을 사용한다.
import { computeAxisTotals, firstUnansweredIndex, isComplete, sanitizeAnswers, setAnswer } from './core/scoring.js';
import { findGame, supportedGames } from './games/index.js';
import { renderEmpty, renderGameSelection, renderQuestion, renderResult } from './ui/views.js';

export function parseRoute(hash) {
  const [gameId, page] = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!gameId) return { name: 'home' };
  if (!page) return { name: 'quiz', gameId };
  if (page === 'result') return { name: 'result', gameId };
  return { name: 'unknown' };
}

const storageKey = (gameId) => `monbti:answers:${gameId}`;

// 진행 중인 답변은 새로고침 후에도 이어 하도록 세션 저장소에 둔다. 저장소를 쓸 수 없어도 검사는 진행된다.
export function createAnswerStore(storage) {
  return {
    load(game) {
      try {
        return sanitizeAnswers(JSON.parse(storage?.getItem(storageKey(game.id)) ?? 'null'), game.questions);
      } catch {
        return {};
      }
    },
    save(game, answers) {
      try {
        storage?.setItem(storageKey(game.id), JSON.stringify(answers));
      } catch {
        // 저장 실패는 무시한다.
      }
    },
    clear(game) {
      try {
        storage?.removeItem(storageKey(game.id));
      } catch {
        // 삭제 실패는 무시한다.
      }
    },
  };
}

function safeSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function startApp(root, { games = supportedGames, storage = safeSessionStorage() } = {}) {
  const store = createAnswerStore(storage);
  const state = { gameId: null, answers: {}, index: 0, startFromFirst: false };

  const focusHeading = () => root.querySelector('h1')?.focus({ preventScroll: false });

  function enterGame(game) {
    if (state.gameId === game.id) return;
    state.gameId = game.id;
    state.answers = store.load(game);
    state.index = Math.min(firstUnansweredIndex(state.answers, game.questions), game.questions.length - 1);
  }

  function showQuestion(game) {
    root.innerHTML = renderQuestion(game, state.index, state.answers);
    const form = root.querySelector('form');
    const submit = form.querySelector('[type="submit"]');

    form.addEventListener('change', (event) => {
      if (event.target.name !== 'response') return;
      state.answers = setAnswer(state.answers, game.questions, form.dataset.questionId, Number(event.target.value));
      store.save(game, state.answers);
      submit.disabled = false;
      form.querySelector('.scale__selected').textContent = event.target.closest('label').title;
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!state.answers[form.dataset.questionId]) return;
      if (state.index < game.questions.length - 1) {
        state.index += 1;
        showQuestion(game);
        focusHeading();
      } else if (isComplete(state.answers, game.questions)) {
        location.hash = `#/${game.id}/result`;
      } else {
        // 앞 질문에 빈 답이 남아 있으면 그 질문으로 이동한다.
        state.index = firstUnansweredIndex(state.answers, game.questions);
        showQuestion(game);
        focusHeading();
      }
    });

    form.querySelector('[data-action="prev"]').addEventListener('click', () => {
      if (state.index === 0) {
        location.hash = '#/';
        return;
      }
      state.index -= 1;
      showQuestion(game);
      focusHeading();
    });
  }

  function showResult(game) {
    root.innerHTML = renderResult(game, computeAxisTotals(game.questions, state.answers));
    root.querySelector('[data-action="review"]').addEventListener('click', () => {
      state.startFromFirst = true;
    });
    root.querySelector('[data-action="restart"]').addEventListener('click', () => {
      store.clear(game);
      state.answers = {};
      state.startFromFirst = true;
      location.hash = `#/${game.id}`;
    });
  }

  function render() {
    const route = parseRoute(location.hash);
    const game = route.gameId ? findGame(route.gameId, games) : null;

    if (route.name === 'home' || !game) {
      if (route.name !== 'home') history.replaceState(null, '', '#/');
      state.gameId = null;
      root.innerHTML = renderGameSelection(games);
    } else if (game.questions.length === 0) {
      root.innerHTML = renderEmpty(game);
    } else {
      enterGame(game);
      if (route.name === 'result') {
        if (!isComplete(state.answers, game.questions)) {
          history.replaceState(null, '', `#/${game.id}`);
          state.index = firstUnansweredIndex(state.answers, game.questions);
          showQuestion(game);
        } else {
          showResult(game);
        }
      } else {
        if (state.startFromFirst) {
          state.index = 0;
          state.startFromFirst = false;
        }
        showQuestion(game);
      }
    }
    focusHeading();
  }

  window.addEventListener('hashchange', render);
  render();
}
