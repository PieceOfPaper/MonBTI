// 결과를 한 장의 PNG로 그린다. 브라우저 전용(canvas).
// 아이콘은 사이트와 같은 출처의 파일이라 캔버스를 내보낼 때 막히지 않는다.
import { AXES } from '../core/axes.js';
import { FALLBACK_NICKNAME } from '../core/nickname.js';
import { RADAR_RINGS, radarPoint, radarPolygon } from './radar.js';

const WIDTH = 1080;
const HEIGHT = 1350;
const FONT = 'Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif';
const COLORS = {
  background: '#18231e',
  card: '#243529',
  cardStrong: '#304535',
  border: '#789151',
  text: '#f7f4ec',
  muted: '#a9b8ad',
  accent: '#c8da81',
  me: '#e3a68a',
  grid: '#3f5a43',
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

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function text(ctx, value, x, y, { size, weight = 400, color = COLORS.text, align = 'left' }) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

// 최대 너비를 넘으면 글자 크기를 줄여 한 줄에 맞춘다.
function fitText(ctx, value, x, y, maxWidth, options) {
  let { size } = options;
  ctx.font = `${options.weight ?? 400} ${size}px ${FONT}`;
  const width = ctx.measureText(value).width;
  if (width > maxWidth) size = Math.max(24, Math.floor(size * (maxWidth / width)));
  text(ctx, value, x, y, { ...options, size });
}

function drawIcon(ctx, image, weapon, x, y, size) {
  if (image) {
    ctx.drawImage(image, x, y, size, size);
    return;
  }
  text(ctx, weapon.weapon_name.slice(0, 1), x + size / 2, y + size / 2, { size: size * 0.5, weight: 700, align: 'center' });
}

function drawRadar(ctx, profile, weapon, cx, cy, radius) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.grid;
  for (const ring of RADAR_RINGS) {
    ctx.beginPath();
    AXES.forEach((_, i) => ctx.lineTo(...radarPoint(i, ring, cx, cy, radius)));
    ctx.closePath();
    ctx.stroke();
  }
  AXES.forEach((_, i) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(...radarPoint(i, 100, cx, cy, radius));
    ctx.stroke();
  });

  for (const [values, color] of [[weapon, COLORS.accent], [profile, COLORS.me]]) {
    const points = radarPolygon(values, cx, cy, radius);
    if (points.length === 0) continue;
    ctx.beginPath();
    points.forEach((point) => ctx.lineTo(...point));
    ctx.closePath();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 5;
    ctx.strokeStyle = color;
    ctx.stroke();
    for (const [x, y] of points) {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  AXES.forEach(({ short }, i) => {
    const [x, y] = radarPoint(i, 130, cx, cy, radius);
    text(ctx, short, x, y, { size: 38, weight: 700, align: 'center' });
  });
}

// result: { weapons, profile, nickname }. 차트는 1순위 무기와 비교한다.
export async function drawShareImage({ gameName, result, siteUrl }) {
  const who = result.nickname || FALLBACK_NICKNAME;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const [first, second, third] = result.weapons;
  const images = await Promise.all(result.weapons.map((weapon) => loadImage(weapon.icon)));

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  text(ctx, 'MONBTI · 몬BTI', 80, 90, { size: 32, weight: 700, color: COLORS.accent });
  text(ctx, gameName, WIDTH - 80, 90, { size: 30, color: COLORS.muted, align: 'right' });
  fitText(ctx, `${who}에게 어울리는 무기`, 80, 160, WIDTH - 160, { size: 64, weight: 800 });

  // 1순위: 가장 크게
  roundRect(ctx, 80, 220, 920, 260, 32);
  ctx.fillStyle = COLORS.cardStrong;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = COLORS.accent;
  ctx.stroke();
  drawIcon(ctx, images[0], first, 120, 250, 200);
  text(ctx, '1순위', 360, 300, { size: 36, weight: 700, color: COLORS.accent });
  text(ctx, first.weapon_name, 360, 385, { size: 88, weight: 800 });

  // 2·3순위
  [[second, images[1], 80], [third, images[2], 550]].forEach(([weapon, image, x], i) => {
    roundRect(ctx, x, 510, 450, 150, 24);
    ctx.fillStyle = COLORS.card;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.border;
    ctx.stroke();
    drawIcon(ctx, image, weapon, x + 25, 535, 100);
    text(ctx, `${i + 2}순위`, x + 150, 560, { size: 28, weight: 700, color: COLORS.muted });
    text(ctx, weapon.weapon_name, x + 150, 615, { size: 48, weight: 800 });
  });

  drawRadar(ctx, result.profile, first, WIDTH / 2, 965, 190);

  // 범례: 차트 아래 가운데. 이름 길이에 맞춰 항목 너비를 재서 가운데 정렬한다.
  ctx.font = `700 30px ${FONT}`;
  const legend = [[COLORS.me, who], [COLORS.accent, first.weapon_name]]
    .map(([color, label]) => ({ color, label, width: 50 + ctx.measureText(label).width }));
  const gap = 48;
  let x = (WIDTH - legend.reduce((sum, { width }) => sum + width, 0) - gap) / 2;
  for (const { color, label, width } of legend) {
    ctx.fillStyle = color;
    ctx.fillRect(x, 1237, 36, 16);
    text(ctx, label, x + 50, 1245, { size: 30, weight: 700 });
    x += width + gap;
  }
  text(ctx, siteUrl, WIDTH / 2, 1305, { size: 26, color: COLORS.muted, align: 'center' });

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
