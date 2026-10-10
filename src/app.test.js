import { describe, expect, it } from 'vitest';
import {
  buildResult, createAnswerStore, parseRoute, shareParamToHash, shareUrl,
} from './app.js';
import { supportedGames } from './games/index.js';
import { renderGameSelection, renderGuide, renderNameForm, renderQuestion, renderResult } from './ui/views.js';
import { decodeShareCode } from './core/share.js';
import { decodeNickname, encodeNickname, normalizeNickname } from './core/nickname.js';
import { remainingWeapons } from './core/recommend.js';

const wilds = supportedGames[0];
// 화면·저장 테스트는 편집 가능한 원본 시트의 문항 ID·가중치와 분리한다.
const testGame = {
  ...wilds,
  questions: [{
    question_id: 'wilds_q001', question_order: 1, question_text: '테스트 질문',
    attack: 100, freedom: 0, complexity: 0, management: 0, counter: 0,
  }],
};

describe('작품 데이터', () => {
  it('현재 지원하는 작품은 와일즈뿐이다', () => {
    expect(supportedGames.map(({ id }) => id)).toEqual(['wilds']);
  });

  it('와일즈 질문 JSON은 question_order로 정렬되어 있고 무기 기준값은 0~100이다', () => {
    const orders = wilds.questions.map(({ question_order }) => question_order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    for (const weapon of wilds.weapons) {
      for (const axis of ['attack', 'freedom', 'complexity', 'management', 'counter']) {
        expect(weapon[axis]).toBeGreaterThanOrEqual(0);
        expect(weapon[axis]).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('라우팅', () => {
  it('해시를 화면으로 해석한다', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/')).toEqual({ name: 'home' });
    expect(parseRoute('#/wilds')).toEqual({ name: 'quiz', gameId: 'wilds' });
    expect(parseRoute('#/wilds/result')).toEqual({ name: 'result', gameId: 'wilds' });
    expect(parseRoute('#/wilds/guide')).toEqual({ name: 'guide', gameId: 'wilds' });
    expect(parseRoute('#/wilds/guide/x')).toEqual({ name: 'unknown' });
    expect(parseRoute('#/wilds/share/a.b.c.1.2.3.4.5')).toEqual({ name: 'share', gameId: 'wilds', code: 'a.b.c.1.2.3.4.5' });
    expect(parseRoute('#/wilds/share')).toEqual({ name: 'unknown' });
    expect(parseRoute('#/wilds/zzz')).toEqual({ name: 'unknown' });
    expect(parseRoute('#/wilds/result/x')).toEqual({ name: 'unknown' });
  });
});

describe('답변 저장', () => {
  const memory = () => {
    const data = new Map();
    return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
  };

  it('저장한 답변을 다시 읽고 초기화할 수 있다', () => {
    const store = createAnswerStore(memory());
    store.save(testGame, { wilds_q001: 5 });
    expect(store.load(testGame)).toEqual({ wilds_q001: 5 });
    store.clear(testGame);
    expect(store.load(testGame)).toEqual({});
  });

  it('질문 순서를 한 번 섞어 저장하고, 초기화하면 새로 섞는다', () => {
    const storage = memory();
    const game = { ...testGame, questions: ['a', 'b', 'c'].map((question_id) => ({ question_id })) };
    const first = createAnswerStore(storage, () => 0).loadOrder(game);
    expect(first).toEqual(['b', 'c', 'a']);
    // 새로고침 뒤에는 다른 난수에서도 저장한 순서를 유지한다.
    expect(createAnswerStore(storage, () => 0.99).loadOrder(game)).toEqual(first);
    const store = createAnswerStore(storage, () => 0.99);
    store.clear(game);
    expect(store.loadOrder(game)).toEqual(['a', 'b', 'c']);
  });

  it('이번 검사의 이름은 초기화하면 지운다', () => {
    const store = createAnswerStore(memory());
    expect(store.loadName(testGame)).toBe('');
    store.saveName(testGame, '종잇장');
    expect(store.loadName(testGame)).toBe('종잇장');
    store.clear(testGame);
    expect(store.loadName(testGame)).toBe('');
    expect(createAnswerStore(null).loadName(testGame)).toBe('');
  });

  it('저장소가 없거나 오류가 나도 빈 답변으로 진행한다', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
    expect(createAnswerStore(null).load(testGame)).toEqual({});
    expect(createAnswerStore(broken).load(testGame)).toEqual({});
    expect(() => createAnswerStore(broken).save(testGame, {})).not.toThrow();
  });
});

describe('화면', () => {
  it('작품 선택 화면은 와일즈 검사 링크를 제공한다', () => {
    expect(renderGameSelection(supportedGames)).toContain('href="#/wilds"');
  });

  it('검사 시작 링크는 새 검사로 표시하고, 답변 수정 링크는 이어 하기로 남긴다', () => {
    const result = buildResult(wilds, Object.fromEntries(wilds.questions.map(({ question_id }) => [question_id, 4])));
    expect(renderGameSelection(supportedGames)).toContain('href="#/wilds" data-game-id="wilds" data-start-quiz="wilds"');
    expect(renderGuide(wilds)).toContain('href="#/wilds" data-start-quiz="wilds"');
    expect(renderResult(wilds, result, { shared: true })).toContain('data-start-quiz="wilds"');
    const own = renderResult(wilds, result);
    expect(own).toContain('data-action="review"');
    expect(own).not.toContain('data-start-quiz');
  });

  it('작품 선택 화면은 검사 옆에 검사 설명 링크를 제공한다', () => {
    expect(renderGameSelection(supportedGames)).toContain('href="#/wilds/guide"');
  });

  it('작품 선택 화면 하단에 개발자와 채널 링크를 보여 준다', () => {
    const html = renderGameSelection(supportedGames);
    expect(html).toContain('종잇장');
    expect(html).toContain('href="https://github.com/PieceOfPaper"');
    expect(html).toContain('href="https://www.youtube.com/@lancer_owl"');
    expect(html).toContain('랜스하는 부엉이');
  });

  it('검사 설명 화면은 대상, 진행 방식, 다섯 기준과 검사 시작 링크를 보여 준다', () => {
    const html = renderGuide(wilds);
    expect(html).toContain('누구를 위한 검사인가요?');
    expect(html).toContain(`질문 ${wilds.questions.length}개`);
    expect(html).toContain(`${wilds.weapons.length}가지 무기`);
    for (const short of ['한방', '자유', '복잡', '관리', '반격']) expect(html).toContain(`<span class="guide__short">${short}</span>`);
    expect(html).toContain('href="#/wilds"');
    expect(html).toContain('href="#/"');
  });

  it('작품 선택 화면은 작품 이름 대신 로고를 보여 주고 이름은 대체 텍스트로 남긴다', () => {
    const html = renderGameSelection(supportedGames);
    expect(html).toMatch(/<img class="game-card__logo" src="[^"]*logo[^"]*\.webp" alt="몬스터헌터 와일즈"/);
    expect(html).not.toContain('<strong>몬스터헌터 와일즈</strong>');
    expect(renderGameSelection([{ id: 'x', name: '이름', description: '설명' }])).toContain('<strong>이름</strong>');
  });

  it('이름 입력 화면은 기본값을 채우고 HTML을 이스케이프한다', () => {
    expect(renderNameForm(testGame)).toContain('placeholder="이름을 입력해 주세요"');
    const html = renderNameForm(testGame, '<종잇장>');
    expect(html).toContain('name="nickname"');
    expect(html).toContain('maxlength="12"');
    expect(html).toContain('value="&lt;종잇장&gt;"');
    expect(html).toContain('href="#/"');
  });

  it('첫 질문의 이전 버튼은 이름 입력으로 돌아간다', () => {
    expect(renderQuestion(testGame, 0, {})).toContain('이름 바꾸기');
  });

  it('질문 화면은 공통 여섯 응답을 라디오 버튼으로 보여 준다', () => {
    const html = renderQuestion(testGame, 0, {});
    expect(html.match(/type="radio"/g)).toHaveLength(6);
    expect(html).toContain('전혀 그렇지 않다');
    expect(html).toContain('scale__end--low');
    expect(html).toContain('scale__end--high');
    expect(html).toContain('매우 그렇다');
    expect(html).toContain('disabled');
    expect(renderQuestion(testGame, 0, { wilds_q001: 4 })).toContain('value="4" checked');
  });

  const result = buildResult(testGame, { wilds_q001: 5 }, '종잇장');

  it('결과 화면은 입력한 이름으로 제목과 비교 대상을 표시한다', () => {
    const html = renderResult(testGame, result);
    expect(html).toContain('종잇장에게 어울리는 무기');
    expect(html).toContain(`종잇장 vs ${result.weapons[0].weapon_name}`);
    expect(html).not.toContain('나와 어울리는 무기');
    expect(renderResult(testGame, { ...result, nickname: '<b>' })).toContain('&lt;b&gt;에게 어울리는 무기');
  });

  it('결과 화면은 1~3순위 무기와 1순위 강조, 짧은 기준 이름을 보여 준다', () => {
    const html = renderResult(testGame, result);
    expect(html.match(/class="rank rank--/g)).toHaveLength(3);
    expect(html).toContain('rank--1');
    expect(html).toContain('aria-pressed="true"');
    for (const short of ['한방', '자유', '복잡', '관리', '반격']) expect(html).toContain(short);
    expect(html).not.toContain('axis__description');
  });

  it('결과 화면은 방사형 차트에 나와 무기를 함께 그리고 미측정 기준은 측정 안 됨으로 표시한다', () => {
    const html = renderResult(testGame, result);
    expect(html).toContain('radar__series--me');
    expect(html).toContain('radar__series--weapon');
    expect(html).toContain('측정 안 됨');
    // 응답 5 → attack 50 + 50 × 60/100 = 80
    expect(html).toContain('<td>80</td>');
  });

  it('결과 화면은 선택한 무기의 소개 영상과 두 가지 공유 버튼을 제공한다', () => {
    const html = renderResult(testGame, result, { selectedIndex: 1 });
    expect(html).toContain(`data-video-id="${result.weapons[1].videoId}"`);
    expect(html).toContain('data-action="share-image"');
    expect(html).toContain('data-action="share-link"');
    expect(html).toContain('data-action="restart"');
  });

  it('결과 화면은 그래프 아래에 제목 없이 공식 소개 문구 인용과 출처, 소개 영상을 한 영역으로 보여 준다', () => {
    const weapon = result.weapons[1];
    const html = renderResult(testGame, result, { selectedIndex: 1 });
    expect(html).toContain(`<blockquote>${weapon.description.join('<br />').replaceAll("'", '&#39;')}</blockquote>`);
    expect(html).toContain('출처: 몬스터헌터 와일즈 공식 사이트</figcaption>');
    expect(html).not.toContain('소개</h2>');
    expect(html).not.toContain('소개 영상</h2>');
    const order = ['id="compare-title"', 'class="quote"', 'class="video"'].map((mark) => html.indexOf(mark));
    expect(order[0]).toBeGreaterThan(-1);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    const intro = html.slice(html.indexOf('class="result__section intro"'));
    expect(intro.indexOf('class="video"')).toBeLessThan(intro.indexOf('</section>'));
  });

  it('결과 화면은 1~3순위 아래 접힌 나머지 무기 목록을 4순위부터 보여 주고 선택할 수 있다', () => {
    const others = remainingWeapons(testGame.weapons, result.profile, result.weapons);
    expect(others).toHaveLength(testGame.weapons.length - 3);
    const closed = renderResult(testGame, result, { others });
    expect(closed).toContain('data-action="toggle-others" aria-expanded="false"');
    expect(closed).toMatch(/id="other-weapons"[^>]* hidden>/);
    expect(closed).toContain('<span class="others__rank">4순위</span>');
    expect(closed.indexOf('class="ranking"')).toBeLessThan(closed.indexOf('class="others"'));
    const open = renderResult(testGame, result, { others, othersOpen: true, selectedIndex: 3 });
    expect(open).toContain('aria-expanded="true"');
    expect(open).not.toMatch(/id="other-weapons"[^>]* hidden>/);
    expect(open).toContain(`vs ${others[0].weapon_name}`);
    expect(open).toContain('data-select="3" aria-pressed="true"');
  });

  it('공유 결과 화면은 답변 수정 대신 검사 시작을 안내한다', () => {
    const html = renderResult(testGame, result, { shared: true });
    expect(html).toContain('나도 검사하기');
    expect(html).toContain('종잇장 vs');
    expect(html).not.toContain('친구');
    expect(html).not.toContain('data-action="restart"');
  });

  it('질문 문구의 HTML을 이스케이프한다', () => {
    const game = { ...testGame, questions: [{ ...testGame.questions[0], question_text: '<b>x</b>' }] };
    expect(renderQuestion(game, 0, {})).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('추천과 공유 링크', () => {
  it('와일즈 무기는 모두 아이콘과 소개 영상, 소개 문구를 가진다', () => {
    for (const weapon of wilds.weapons) {
      expect(weapon.icon, weapon.weapon_id).toBeTruthy();
      expect(weapon.videoId, weapon.weapon_id).toMatch(/^[\w-]{11}$/);
      expect(weapon.description?.length, weapon.weapon_id).toBeGreaterThan(0);
    }
  });

  it('같은 답변은 같은 서로 다른 무기 세 개를 추천하고, 답변을 수정하면 현재 답변으로 다시 계산한다', () => {
    const answers = Object.fromEntries(wilds.questions.map(({ question_id }) => [question_id, 4]));
    const first = buildResult(wilds, answers);
    expect(buildResult(wilds, { ...answers }).weapons).toEqual(first.weapons);
    expect(new Set(first.weapons.map(({ weapon_id }) => weapon_id)).size).toBe(3);
    // 축마다 양·음 문항이 균형을 이루면 모든 질문에 같은 답을 해도 결과가 같으므로,
    // 축별로 가중치 방향에 맞춰 답을 높이거나 낮춘 답변들을 비교한다.
    const picks = new Set();
    for (const axis of ['attack', 'freedom', 'complexity', 'management', 'counter']) {
      for (const high of [true, false]) {
        const changed = Object.fromEntries(wilds.questions.map((question) => {
          const weight = question[axis] ?? 0;
          if (!weight) return [question.question_id, 4];
          return [question.question_id, (weight > 0) === high ? 6 : 1];
        }));
        picks.add(buildResult(wilds, changed).weapons.map(({ weapon_id }) => weapon_id).join());
      }
    }
    expect(picks.size).toBeGreaterThan(1);
  });

  const answers = Object.fromEntries(wilds.questions.map(({ question_id }, i) => [question_id, (i % 6) + 1]));
  const own = buildResult(wilds, answers, '종잇장 Lv.3');
  const url = shareUrl(wilds, own, 'https://example.com/MonBTI/');

  it('공유 링크는 # 없이 인코딩되지 않는 문자만 사용한다', () => {
    expect(url.startsWith('https://example.com/MonBTI/?r=wilds.')).toBe(true);
    expect(url).not.toContain('#');
    expect(url.slice(url.indexOf('?r=') + 3)).toMatch(/^[A-Za-z0-9_.-]+$/);
    expect(encodeURIComponent(url.slice(url.indexOf('?r=') + 3))).toBe(url.slice(url.indexOf('?r=') + 3));
  });

  it('공유 링크로 같은 무기와 반올림한 기준값을 복원한다', () => {
    const hash = shareParamToHash(new URL(url).search);
    const route = parseRoute(hash);
    expect(route).toMatchObject({ name: 'share', gameId: 'wilds' });
    const decoded = decodeShareCode(route.code, wilds.weapons);
    expect(decoded.weapons).toEqual(own.weapons);
    expect(decoded.nickname).toBe('종잇장 Lv.3');
    for (const axis of ['attack', 'freedom', 'complexity', 'management', 'counter']) {
      expect(decoded.profile[axis]).toBe(own.profile[axis] === null ? null : Math.round(own.profile[axis]));
    }
  });

  it('공유 과정에서 인코딩된 주소도 같은 결과로 해석한다', () => {
    const hash = shareParamToHash(new URL(url).search);
    const encoded = hash.replaceAll('/', '%2F');
    expect(parseRoute(encoded)).toEqual(parseRoute(hash));
    expect(shareParamToHash(`?r=${encodeURIComponent(new URL(url).searchParams.get('r'))}`)).toBe(hash);
    expect(shareParamToHash('')).toBeNull();
    expect(shareParamToHash('?r=wilds')).toBeNull();
  });

  it('이름을 정리하고 공유 코드용으로 되돌릴 수 있게 바꾼다', () => {
    expect(normalizeNickname('  종잇장 \n  헌터\u0000 ')).toBe('종잇장 헌터');
    expect(normalizeNickname('가나다라마바사아자차카타파하')).toBe('가나다라마바사아자차카타');
    expect(normalizeNickname(null)).toBe('');
    for (const name of ['종잇장', 'a', '🐸 개구리', 'Lv.99_-?/+']) {
      const code = encodeNickname(name);
      expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(decodeNickname(code)).toBe(name);
    }
    expect(decodeNickname('')).toBeNull();
    expect(decodeNickname('a.b')).toBeNull();
    expect(decodeNickname(encodeNickname('  '))).toBeNull();
  });

  it('이름이 없는 예전 공유 링크는 대체 이름으로 연다', () => {
    expect(decodeShareCode('bow.lance.hammer.10.20.30.40.50', wilds.weapons).nickname).toBe('헌터');
  });

  it('잘못된 공유 코드는 거부한다', () => {
    expect(decodeShareCode('bow.lance.hammer.10.20.-.40.100', wilds.weapons).profile.complexity).toBeNull();
    for (const bad of [
      'bow.lance.1.2.3.4.5',
      'bow.bow.lance.1.2.3.4.5',
      'bow.lance.nope.1.2.3.4.5',
      'bow.lance.hammer.1.2.3.4',
      'bow.lance.hammer.1.2.3.4.101',
      'bow.lance.hammer.1.2.3.4.x',
      'bow.lance.hammer.1.2.3.4.5.!!',
      `bow.lance.hammer.1.2.3.4.5.${encodeNickname('종잇장')}.x`,
      '',
      undefined,
    ]) expect(decodeShareCode(bad, wilds.weapons), bad).toBeNull();
  });
});
