import './styles.css';

export const supportedGames = [
  {
    id: 'wilds',
    name: '몬스터헌터 와일즈',
    description: '나의 플레이 취향에 어울리는 무기를 찾아보세요.',
  },
];

export function createGameSelection(games = supportedGames) {
  const choices = games
    .map(({ id, name, description }) => `
      <li><button class="game-card" type="button" data-game-id="${id}">
        <span class="game-card__label">현재 검사 가능</span>
        <strong>${name}</strong><span>${description}</span>
      </button></li>`)
    .join('');

  return `<section class="hero" aria-labelledby="page-title">
    <p class="eyebrow">MONBTI</p><h1 id="page-title">어떤 무기가 나와 잘 맞을까?</h1>
    <p>어려운 게임 용어 없이, 나의 플레이 취향부터 알아봅니다.</p>
    <ul class="game-list" aria-label="검사할 작품 선택">${choices}</ul>
  </section>`;
}

export function mountGameSelection(root, games = supportedGames) {
  root.innerHTML = createGameSelection(games);
  root.querySelectorAll('[data-game-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const game = games.find(({ id }) => id === button.dataset.gameId);
      if (!game) return;
      root.innerHTML = `<section class="hero"><p class="eyebrow">${game.name}</p><h1>검사를 준비하고 있어요.</h1><p>질문과 추천 기준을 검토한 뒤 이곳에서 시작할 수 있습니다.</p><button class="back-button" type="button">작품 선택으로 돌아가기</button></section>`;
      root.querySelector('.back-button').addEventListener('click', () => mountGameSelection(root, games));
    });
  });
}

if (typeof document !== 'undefined') {
  mountGameSelection(document.querySelector('#app'));
}
