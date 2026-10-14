// 결과를 한 장의 PNG로 그린다. 브라우저 전용(canvas).
// 결과 화면과 같은 내용(result-content.js의 shareContent)을 같은 순서로 그린다:
// 1순위 무기(배경 캐릭터·아이콘·이름·입문 난이도·소개 문구) → 왜 이 무기인가요? → 무기별 기준 비교(순위 버튼·차트·표).
// 순위 버튼은 화면처럼 1~3순위(부담이 적은 대안을 쓰는 검사는 네 번째 버튼까지)이며 대안에는 추천 표시를 붙인다.
// 영상·버튼처럼 눌러서 쓰는 요소만 뺀다. 내용 길이에 따라 세로 길이가 달라진다.
// 아이콘·캐릭터 이미지는 사이트와 같은 출처의 파일이라 캔버스를 내보낼 때 막히지 않는다.
import { RADAR_RINGS, radarPoint, radarPolygon } from './radar.js';
import { shareContent } from './result-content.js';

const WIDTH = 1080;
const PAD = 72;
const INNER = WIDTH - PAD * 2;
// 내용이 아무리 길어도 넘지 않는 작업 캔버스 높이. 다 그린 뒤 실제 높이로 잘라 낸다.
const MAX_HEIGHT = 8000;
const FONT = 'Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif';
// 결과 화면(styles.css)과 같은 색.
const COLORS = {
  background: '#18231e',
  text: '#f7f4ec',
  body: '#d5ddd7',
  quote: '#e8eee9',
  muted: '#a9b8ad',
  accent: '#c8da81',
  highlight: '#d8ef86',
  me: '#e3a68a',
  line: '#304535',
  grid: '#3f5a43',
  part: '#243529',
  partBorder: '#3f5640',
  rank: '#1f2d25',
  rankSelected: '#2a3d2e',
  shadow: '#172119',
  badge: '#f2c14e',
};

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

// 상단 사이트 표시 앞의 MonBTI 아이콘. public/에 있는 파비콘용 아이콘을 배포 경로 기준으로 불러온다.
const SITE_ICON = `${import.meta.env.BASE_URL}icon-192x192.png`;
const SITE_ICON_SIZE = 56;

const setFont = (ctx, size, weight = 400) => { ctx.font = `${weight} ${size}px ${FONT}`; };

function text(ctx, value, x, y, { size, weight = 400, color = COLORS.text, align = 'left', shadow = false }) {
  setFont(ctx, size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (shadow) {
    ctx.shadowColor = COLORS.shadow;
    ctx.shadowBlur = 18;
  }
  ctx.fillText(value, x, y);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

// 최대 너비를 넘으면 글자 크기를 줄여 한 줄에 맞춘다.
function fitText(ctx, value, x, y, maxWidth, options) {
  let { size } = options;
  setFont(ctx, size, options.weight);
  const width = ctx.measureText(value).width;
  if (width > maxWidth) size = Math.max(20, Math.floor(size * (maxWidth / width)));
  text(ctx, value, x, y, { ...options, size });
}

// 화면의 word-break: keep-all처럼 띄어쓰기 단위로 줄을 바꾸고, 한 낱말이 너무 길면 글자 단위로 나눈다.
function wrapLines(ctx, value, maxWidth, size, weight) {
  setFont(ctx, size, weight);
  const fits = (line) => ctx.measureText(line).width <= maxWidth;
  const lines = [];
  let line = '';
  for (const word of value.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (fits(next)) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    for (const ch of word) {
      if (line && !fits(line + ch)) {
        lines.push(line);
        line = '';
      }
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// 여러 줄 글. 첫 줄 위쪽이 y이며 다 그린 뒤의 아래쪽 y를 돌려준다.
function paragraph(ctx, value, x, y, maxWidth, { size, weight = 400, color, align = 'left', lineHeight = 1.7, shadow = false }) {
  const step = size * lineHeight;
  const lines = wrapLines(ctx, value, maxWidth, size, weight);
  lines.forEach((line, i) => text(ctx, line, x, y + step * (i + 0.5), { size, weight, color, align, shadow }));
  return y + step * lines.length;
}

const paragraphHeight = (ctx, value, maxWidth, { size, weight = 400, lineHeight = 1.7 }) => (
  wrapLines(ctx, value, maxWidth, size, weight).length * size * lineHeight);

function roundRect(ctx, x, y, w, h, r, { fill, stroke, lineWidth = 2 }) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function hr(ctx, y) {
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(PAD, y, INNER, 2);
}

function drawIcon(ctx, image, weapon, x, y, size) {
  if (image) {
    ctx.drawImage(image, x, y, size, size);
    return;
  }
  text(ctx, weapon.weapon_name.slice(0, 1), x + size / 2, y + size / 2, { size: size * 0.5, weight: 800, align: 'center' });
}

// 1순위 무기 뒤의 캐릭터 이미지. 화면처럼 불투명도 30%, 약간의 채도 감소, 타원형 가장자리 사라짐을 적용한다.
function drawCharacterArt(ctx, characters, images, top, height) {
  if (!characters.length) return;
  const area = document.createElement('canvas');
  area.width = WIDTH;
  area.height = height;
  const art = area.getContext('2d');
  const frameWidth = WIDTH;
  const frameHeight = (frameWidth * 1000) / 709;
  const frameX = (WIDTH - frameWidth) / 2;
  const frameY = (height - frameHeight) / 2;
  art.filter = 'grayscale(0.3)';
  characters.forEach(({ top: t, left, width }, i) => {
    const image = images[i];
    if (!image) return;
    const w = (frameWidth * width) / 100;
    art.drawImage(image, frameX + (frameWidth * left) / 100, frameY + (frameHeight * t) / 100, w, (w * image.naturalHeight) / image.naturalWidth);
  });
  art.filter = 'none';
  // radial-gradient(ellipse 60% 55% at 50% 45%, #000 45%, transparent 100%)
  art.globalCompositeOperation = 'destination-in';
  art.save();
  art.translate(WIDTH / 2, height * 0.45);
  art.scale(WIDTH * 0.6, height * 0.55);
  const mask = art.createRadialGradient(0, 0, 0, 0, 0, 1);
  mask.addColorStop(0.45, '#000');
  mask.addColorStop(1, 'rgba(0, 0, 0, 0)');
  art.fillStyle = mask;
  art.fillRect(-2, -2, 4, 4);
  art.restore();
  ctx.globalAlpha = 0.3;
  ctx.drawImage(area, 0, top);
  ctx.globalAlpha = 1;
}

const ICON = 240;
const QUOTE = { size: 32, lineHeight: 1.85 };
const MARK = 88;

function winnerHeight(ctx, winner) {
  let height = 24 + ICON + 20 + 130 + 12 + 50;
  if (winner.quote) {
    height += 24 + MARK;
    for (const line of winner.quote.lines) height += paragraphHeight(ctx, line, INNER - 40, QUOTE);
    height += MARK + (winner.quote.credit ? 40 : 0);
  }
  return height + 40;
}

// 결과 화면의 .winner__badge와 같은 기울어진 물음표 원. (x, y)는 원의 중심이다.
function drawBadge(ctx, badge, x, y) {
  const radius = 38;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((14 * Math.PI) / 180);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.badge;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 5;
  ctx.strokeStyle = COLORS.background;
  ctx.stroke();
  text(ctx, badge.mark, 0, 2, { size: 54, weight: 900, color: COLORS.background, align: 'center' });
  ctx.restore();
}

function drawWinner(ctx, winner, assets, top) {
  const { weapon, difficulty, quote } = winner;
  const height = winnerHeight(ctx, winner);
  drawCharacterArt(ctx, weapon.characters ?? [], assets.characters, top - 40, height + 40);
  const cx = WIDTH / 2;
  let y = top + 24;

  const glow = ctx.createRadialGradient(cx, y + ICON / 2, 0, cx, y + ICON / 2, ICON * 0.72);
  glow.addColorStop(0, 'rgba(216, 239, 134, 0.28)');
  glow.addColorStop(0.55 / 0.72, 'rgba(216, 239, 134, 0.08)');
  glow.addColorStop(1, 'rgba(216, 239, 134, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - ICON, y - ICON / 2, ICON * 2, ICON * 2);
  drawIcon(ctx, assets.icons[0], weapon, cx - ICON / 2 + 24, y + 24, ICON - 48);
  if (winner.badge) drawBadge(ctx, winner.badge, cx + ICON / 2 - 46, y + ICON - 46);
  y += ICON + 20;

  fitText(ctx, winner.name, cx, y + 65, INNER, { size: 124, weight: 800, color: COLORS.highlight, align: 'center', shadow: true });
  y += 130 + 12;

  // 입문 난이도: '입문 난이도' + 별표를 가운데 한 줄로.
  setFont(ctx, 30, 700);
  const labelWidth = ctx.measureText(difficulty.title).width;
  setFont(ctx, 40, 400);
  const starsWidth = ctx.measureText(difficulty.label).width;
  const gap = 20;
  const start = cx - (labelWidth + gap + starsWidth) / 2;
  text(ctx, difficulty.title, start, y + 25, { size: 30, weight: 700, color: COLORS.body, shadow: true });
  text(ctx, difficulty.label, start + labelWidth + gap, y + 25, { size: 40, color: COLORS.highlight, shadow: true });
  y += 50;

  if (quote) {
    y += 24;
    text(ctx, '“', cx, y + MARK / 2, { size: 100, color: COLORS.accent, align: 'center' });
    y += MARK;
    for (const line of quote.lines) {
      y = paragraph(ctx, line, cx, y, INNER - 40, { ...QUOTE, color: COLORS.quote, align: 'center', shadow: true });
    }
    text(ctx, '”', cx, y + MARK / 2, { size: 100, color: COLORS.accent, align: 'center' });
    y += MARK;
    if (quote.credit) {
      text(ctx, quote.credit, cx, y + 20, { size: 22, color: COLORS.muted, align: 'center' });
      y += 40;
    }
  }
  return top + height;
}

function drawReason(ctx, reason, top) {
  if (!reason) return top;
  let y = top;
  hr(ctx, y);
  y += 48;
  // 중앙형 특별 결과의 제목처럼 긴 제목은 화면처럼 여러 줄로 나눈다.
  y = paragraph(ctx, reason.title, PAD, y, INNER, { size: 46, weight: 800, color: COLORS.text, lineHeight: 52 / 46 }) + 32;
  y = paragraph(ctx, reason.lead, PAD, y, INNER, { size: 36, weight: 700, color: COLORS.text });
  const padding = 36;
  for (const part of reason.parts) {
    y += 28;
    const bodyWidth = INNER - padding * 2;
    const height = padding * 2 + 46
      + part.lines.reduce((sum, line) => sum + paragraphHeight(ctx, line, bodyWidth, { size: 32 }), 0);
    roundRect(ctx, PAD, y, INNER, height, 36, { fill: COLORS.part, stroke: COLORS.partBorder });
    text(ctx, part.title, PAD + padding, y + padding + 18, { size: 32, weight: 800, color: COLORS.accent });
    let lineY = y + padding + 46;
    for (const line of part.lines) lineY = paragraph(ctx, line, PAD + padding, lineY, bodyWidth, { size: 32, color: COLORS.body });
    y += height;
  }
  return y + 56;
}

// axes는 결과 화면 차트와 같은 축 목록(shareContent의 comparison.axes)이다.
function drawRadar(ctx, axes, profile, weapon, cx, cy, radius) {
  const point = (i, value) => radarPoint(i, value, cx, cy, radius, axes.length);
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.grid;
  for (const ring of RADAR_RINGS) {
    ctx.beginPath();
    axes.forEach((_, i) => ctx.lineTo(...point(i, ring)));
    ctx.closePath();
    ctx.stroke();
  }
  axes.forEach((_, i) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(...point(i, 100));
    ctx.stroke();
  });

  // 화면과 같이 무기를 먼저, 사용자를 위에 그린다.
  for (const [values, color] of [[weapon, COLORS.accent], [profile, COLORS.me]]) {
    const points = radarPolygon(values, cx, cy, radius, axes);
    if (points.length === 0) continue;
    ctx.beginPath();
    points.forEach((point) => ctx.lineTo(...point));
    ctx.closePath();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 5;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  axes.forEach(({ short }, i) => {
    const [x, y] = point(i, 128);
    text(ctx, short, x, y, { size: 32, weight: 700, align: 'center' });
  });
}

function drawComparison(ctx, comparison, assets, top) {
  let y = top;
  hr(ctx, y);
  y += 48;
  text(ctx, comparison.title, PAD, y + 26, { size: 46, weight: 800 });
  y += 52 + 32;

  // 순위 버튼: 화면의 같은 크기 버튼. 처음 상태처럼 1순위가 선택되어 있다.
  // 부담이 적은 대안 버튼은 화면처럼 위 테두리 가운데에 차분한 색의 ‘가벼운 추천’ 표시를 붙인다(1~3순위보다 돋보이게 하지 않는다).
  const count = comparison.ranking.length;
  const gap = count === 4 ? 20 : 28;
  const cardWidth = (INNER - gap * (count - 1)) / count;
  const cardHeight = 236;
  if (comparison.ranking.some(({ badge }) => badge)) y += 24;
  comparison.ranking.forEach(({ weapon, label, selected, badge }, i) => {
    const x = PAD + i * (cardWidth + gap);
    roundRect(ctx, x, y, cardWidth, cardHeight, 36, {
      fill: selected ? COLORS.rankSelected : COLORS.rank,
      stroke: selected ? COLORS.accent : COLORS.grid,
      lineWidth: selected ? 3 : 2,
    });
    if (badge) {
      setFont(ctx, 24, 700);
      const badgeWidth = ctx.measureText(badge.text).width + 32;
      roundRect(ctx, x + (cardWidth - badgeWidth) / 2, y - 20, badgeWidth, 40, 20, { fill: COLORS.background, stroke: COLORS.grid });
      text(ctx, badge.text, x + cardWidth / 2, y + 1, { size: 24, weight: 700, color: COLORS.muted, align: 'center' });
    }
    text(ctx, label, x + cardWidth / 2, y + 40, { size: 26, weight: 700, color: COLORS.muted, align: 'center' });
    drawIcon(ctx, assets.icons[i], weapon, x + cardWidth / 2 - 50, y + 64, 100);
    fitText(ctx, weapon.weapon_name, x + cardWidth / 2, y + 198, cardWidth - 32, { size: 36, weight: 800, align: 'center' });
  });
  y += cardHeight + 48;

  fitText(ctx, comparison.subtitle, PAD, y + 24, INNER, { size: 40, weight: 800 });
  y += 48 + 40;

  // 차트(왼쪽)와 표(오른쪽): 화면의 넓은 배치와 같다.
  const chartWidth = Math.round(INNER * 0.55);
  const radius = 170;
  const cy = y + 40 + radius * 1.28;
  drawRadar(ctx, comparison.axes, comparison.profile, comparison.weapon, PAD + chartWidth / 2, cy, radius);
  const legendY = cy + radius * 1.28 + 64;
  setFont(ctx, 28, 700);
  const legend = [[COLORS.me, comparison.legend[0]], [COLORS.accent, comparison.legend[1]]]
    .map(([color, label]) => ({ color, label, width: 46 + Math.min(ctx.measureText(label).width, chartWidth / 2 - 60) }));
  const legendGap = 40;
  let lx = PAD + (chartWidth - legend.reduce((sum, { width }) => sum + width, 0) - legendGap) / 2;
  for (const { color, label, width } of legend) {
    roundRect(ctx, lx, legendY - 7, 34, 16, 5, { fill: color });
    fitText(ctx, label, lx + 46, legendY, width - 46, { size: 28, weight: 700 });
    lx += width + legendGap;
  }

  const tableX = PAD + chartWidth + 40;
  const tableWidth = INNER - chartWidth - 40;
  const rowHeight = 72;
  const tableTop = cy - (rowHeight * (comparison.rows.length + 1)) / 2;
  const columns = [tableX, tableX + tableWidth * 0.68, tableX + tableWidth];
  const header = ['기준', comparison.legend[0], comparison.legend[1]];
  header.forEach((label, i) => {
    const x = i === 0 ? columns[0] : columns[i];
    fitText(ctx, label, x, tableTop + rowHeight / 2, i === 0 ? tableWidth * 0.3 : tableWidth * 0.34, {
      size: 24, weight: 700, color: COLORS.muted, align: i === 0 ? 'left' : 'right',
    });
  });
  comparison.rows.forEach(({ short, me, weapon }, row) => {
    const rowY = tableTop + rowHeight * (row + 1);
    ctx.fillStyle = COLORS.line;
    ctx.fillRect(tableX, rowY, tableWidth, 2);
    const mid = rowY + rowHeight / 2;
    text(ctx, short, columns[0], mid, { size: 30, weight: 700 });
    text(ctx, me, columns[1], mid, { size: 30, weight: 700, color: COLORS.me, align: 'right' });
    text(ctx, weapon, columns[2], mid, { size: 30, weight: 700, color: COLORS.accent, align: 'right' });
  });
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(tableX, tableTop + rowHeight * (comparison.rows.length + 1), tableWidth, 2);

  return Math.max(legendY + 40, tableTop + rowHeight * (comparison.rows.length + 1)) + 56;
}

// gameName·result·reason은 결과 화면과 같은 값을 받는다. weapons는 입문 난이도 계산에 쓰는 작품 전체 무기,
// axisModel은 작품의 축 모델이다.
// others는 결과 화면과 같은 1~3순위 이후 무기 순위다.
export async function drawShareImage({ gameName, result, reason, weapons, others, axisModel, siteUrl }) {
  const content = shareContent({ gameName, result, reason, weapons, others, axisModel });
  const characters = content.winner.weapon.characters ?? [];
  // icons는 순위 버튼 순서다. 첫 번째가 1순위라 상단 1순위 아이콘으로도 쓴다.
  const [icons, characterImages, siteIcon] = await Promise.all([
    Promise.all(content.comparison.ranking.map(({ weapon }) => loadImage(weapon.icon))),
    Promise.all(characters.map(({ src }) => loadImage(src))),
    loadImage(SITE_ICON),
  ]);
  const assets = { icons, characters: characterImages };

  const work = document.createElement('canvas');
  work.width = WIDTH;
  work.height = MAX_HEIGHT;
  const ctx = work.getContext('2d');
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WIDTH, MAX_HEIGHT);

  // 아이콘을 불러오지 못하면 글자만 원래 자리에 둔다.
  if (siteIcon) ctx.drawImage(siteIcon, PAD, 74 - SITE_ICON_SIZE / 2, SITE_ICON_SIZE, SITE_ICON_SIZE);
  text(ctx, 'MONBTI · 몬BTI', siteIcon ? PAD + SITE_ICON_SIZE + 14 : PAD, 84, { size: 30, weight: 700, color: COLORS.accent });
  // 검사 이름이 길어도 왼쪽 사이트 이름과 겹치지 않게 줄인다.
  fitText(ctx, content.gameName, WIDTH - PAD, 84, 560, { size: 28, color: COLORS.muted, align: 'right' });
  fitText(ctx, content.title, PAD, 160, INNER, { size: 60, weight: 800 });

  let y = drawWinner(ctx, content.winner, assets, 220);
  y = drawReason(ctx, content.reason, y);
  y = drawComparison(ctx, content.comparison, assets, y);
  hr(ctx, y);
  text(ctx, siteUrl, WIDTH / 2, y + 56, { size: 26, color: COLORS.muted, align: 'center' });
  const height = Math.ceil(y + 112);

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = height;
  canvas.getContext('2d').drawImage(work, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
