// 해시 라우팅과 화면 상태. GitHub Pages 하위 경로(/MonBTI/)에서도 새로고침이 동작하도록
// 경로 대신 #/<작품 ID>, #/<작품 ID>/guide, #/<작품 ID>/result, #/<작품 ID>/share/<코드> 형식을 사용한다.
// 외부로 공유하는 링크만 ?r=<작품 ID>.<코드> 형식이며, 열면 내부 해시 주소로 바꾼다(core/share.js).
import { AXIS_IDS } from './core/axes.js';
import { recommendWeapons } from './core/recommend.js';
import {
  computeAxisProfile, computeAxisTotals, firstUnansweredIndex, isComplete, sanitizeAnswers, setAnswer,
} from './core/scoring.js';
import { orderQuestions, resolveQuestionOrder } from './core/order.js';
import {
  SHARE_PARAM, decodeShareCode, encodeShareCode, parseShareParam, shareHash,
} from './core/share.js';
import { findGame, supportedGames } from './games/index.js';
import {
  renderEmpty, renderGameSelection, renderGuide, renderQuestion, renderResult, renderVideoPlayer,
} from './ui/views.js';

function safeDecode(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export function parseRoute(hash) {
  // 메신저 등에서 인코딩된 주소(%2F 등)도 같은 화면으로 해석한다.
  const [gameId, page, ...rest] = safeDecode(hash).replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!gameId) return { name: 'home' };
  if (page === 'share' && rest.length === 1) return { name: 'share', gameId, code: rest[0] };
  if (rest.length) return { name: 'unknown' };
  if (!page) return { name: 'quiz', gameId };
  if (page === 'result') return { name: 'result', gameId };
  if (page === 'guide') return { name: 'guide', gameId };
  return { name: 'unknown' };
}

// 외부 공유 링크(?r=…)를 내부 해시 주소로 바꾼다. 해당하지 않으면 null.
export function shareParamToHash(search) {
  const shared = parseShareParam(new URLSearchParams(search).get(SHARE_PARAM));
  return shared ? shareHash(shared.gameId, shared.code) : null;
}

// 완료한 답변으로 결과를 만든다. 무기 순위는 사용자 점수와 무기 기준값의 적합도로 정한다(core/recommend.js).
export function buildResult(game, answers) {
  const profile = computeAxisProfile(computeAxisTotals(game.questions, answers));
  return { weapons: recommendWeapons(game.weapons, profile), profile };
}

// 공유 링크. 축 값은 0~100 정수로 반올림해 담는다. # 없이 쿼리 하나만 써서 공유 과정의 변형을 피한다.
export function shareUrl(game, result, base = `${location.origin}${location.pathname}`) {
  const code = encodeShareCode({
    weaponIds: result.weapons.map(({ weapon_id }) => weapon_id),
    profile: Object.fromEntries(AXIS_IDS.map((axis) => [axis, result.profile[axis]])),
  });
  return `${base}?${SHARE_PARAM}=${game.id}.${code}`;
}

const storageKey = (gameId) => `monbti:answers:${gameId}`;
const orderKey = (gameId) => `monbti:order:${gameId}`;

// 진행 중인 답변과 질문 표시 순서는 새로고침 후에도 이어 하도록 세션 저장소에 둔다.
// 저장소를 쓸 수 없어도 검사는 진행된다.
export function createAnswerStore(storage, random = Math.random) {
  const read = (key) => {
    try {
      return JSON.parse(storage?.getItem(key) ?? 'null');
    } catch {
      return null;
    }
  };
  const write = (key, value) => {
    try {
      storage?.setItem(key, JSON.stringify(value));
    } catch {
      // 저장 실패는 무시한다.
    }
  };
  return {
    load(game) {
      return sanitizeAnswers(read(storageKey(game.id)), game.questions);
    },
    save(game, answers) {
      write(storageKey(game.id), answers);
    },
    // 저장한 순서가 현재 질문 집합과 맞지 않으면 새로 섞어 저장한다.
    loadOrder(game) {
      const saved = read(orderKey(game.id));
      const order = resolveQuestionOrder(saved, game.questions, random);
      if (order !== saved) write(orderKey(game.id), order);
      return order;
    },
    clear(game) {
      try {
        storage?.removeItem(storageKey(game.id));
        storage?.removeItem(orderKey(game.id));
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

export function startApp(root, { games = supportedGames, storage = safeSessionStorage(), random = Math.random } = {}) {
  const store = createAnswerStore(storage, random);
  // quiz는 질문을 표시 순서로 정렬한 작품 데이터다. 점수 계산은 순서와 관계없다.
  const state = { gameId: null, quiz: null, answers: {}, index: 0, startFromFirst: false };

  const focusHeading = () => root.querySelector('h1')?.focus({ preventScroll: false });

  function enterGame(game) {
    if (state.gameId === game.id) return;
    state.gameId = game.id;
    state.quiz = { ...game, questions: orderQuestions(game.questions, store.loadOrder(game)) };
    state.answers = store.load(game);
    state.index = Math.min(firstUnansweredIndex(state.answers, state.quiz.questions), game.questions.length - 1);
  }

  // game에는 표시 순서로 정렬한 state.quiz를 넘긴다.
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

  function showResult(game, result, { shared = false, selectedIndex = 0 } = {}) {
    root.innerHTML = renderResult(game, result, { selectedIndex, shared });
    const status = root.querySelector('.share__status');
    const say = (message) => { status.textContent = message; };

    root.querySelectorAll('[data-select]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.select);
        if (index === selectedIndex) return;
        showResult(game, result, { shared, selectedIndex: index });
        root.querySelector(`[data-select="${index}"]`)?.focus();
      });
    });

    root.querySelector('[data-action="play-video"]')?.addEventListener('click', (event) => {
      const box = event.currentTarget.closest('.video');
      box.innerHTML = renderVideoPlayer(box.dataset.videoId, `${result.weapons[selectedIndex].weapon_name} 소개 영상`);
    });

    root.querySelector('[data-action="share-link"]').addEventListener('click', async () => {
      const url = shareUrl(game, result);
      try {
        if (navigator.share) {
          // text를 함께 넘기면 일부 공유 대상에서 문구와 주소가 한 줄로 합쳐지므로 주소만 보낸다.
          await navigator.share({ title: '몬BTI 결과', url });
          return;
        }
        await navigator.clipboard.writeText(url);
        say('링크를 복사했어요.');
      } catch (error) {
        if (error?.name === 'AbortError') return;
        say(`링크를 복사하지 못했어요. 주소를 직접 복사해 주세요: ${url}`);
      }
    });

    root.querySelector('[data-action="share-image"]').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      say('이미지를 만드는 중이에요…');
      try {
        // 캔버스 코드는 공유할 때만 불러온다.
        const { drawShareImage } = await import('./ui/share-image.js');
        const siteUrl = `${location.host}${location.pathname}`;
        const blob = await drawShareImage({ gameName: game.name, result, siteUrl, shared });
        const file = new File([blob], 'monbti-result.png', { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          say('');
          await navigator.share({ files: [file], title: '몬BTI 결과' });
        } else {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = file.name;
          link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 1000);
          say('결과 이미지를 저장했어요.');
        }
      } catch (error) {
        say(error?.name === 'AbortError' ? '' : '이미지를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        button.disabled = false;
      }
    });

    if (shared) return;
    root.querySelector('[data-action="review"]').addEventListener('click', () => {
      state.startFromFirst = true;
    });
    root.querySelector('[data-action="restart"]').addEventListener('click', () => {
      store.clear(game);
      // 다음 검사에서 질문 순서를 새로 섞는다.
      state.gameId = null;
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
    } else if (route.name === 'guide') {
      root.innerHTML = renderGuide(game);
    } else if (route.name === 'share') {
      const shared = decodeShareCode(route.code, game.weapons);
      if (shared) {
        showResult(game, shared, { shared: true });
      } else {
        // 잘못된 공유 링크는 검사 화면으로 보낸다.
        history.replaceState(null, '', `#/${game.id}`);
        render();
        return;
      }
    } else if (game.questions.length === 0) {
      root.innerHTML = renderEmpty(game);
    } else {
      enterGame(game);
      if (route.name === 'result') {
        if (!isComplete(state.answers, game.questions)) {
          history.replaceState(null, '', `#/${game.id}`);
          state.index = firstUnansweredIndex(state.answers, state.quiz.questions);
          showQuestion(state.quiz);
        } else {
          showResult(game, buildResult(game, state.answers));
        }
      } else {
        if (state.startFromFirst) {
          state.index = 0;
          state.startFromFirst = false;
        }
        showQuestion(state.quiz);
      }
    }
    focusHeading();
  }

  // 공유 링크로 들어오면 쿼리를 지우고 내부 해시 주소로 바꾼다. 새로고침해도 같은 결과가 유지된다.
  const sharedHash = shareParamToHash(location.search);
  if (sharedHash) history.replaceState(null, '', `${location.pathname}${sharedHash}`);

  window.addEventListener('hashchange', render);
  render();
}
