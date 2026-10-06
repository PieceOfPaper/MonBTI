// 다섯 기준의 0~100 값을 오각형 방사형 차트로 그린다.
// 위치 계산은 화면용 SVG와 공유 이미지(캔버스)가 함께 사용한다.
import { AXES } from '../core/axes.js';

export const RADAR_RINGS = [25, 50, 75, 100];

// 첫 축을 위쪽에 두고 시계 방향으로 배치한다.
export function radarPoint(index, value, cx, cy, radius) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / AXES.length;
  const r = (radius * value) / 100;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

// 미측정(null) 축은 꼭짓점에서 빼고 측정된 축만 잇는다.
export function radarPolygon(values, cx, cy, radius) {
  return AXES.flatMap(({ id }, index) => (values[id] === null || values[id] === undefined
    ? []
    : [radarPoint(index, Math.max(0, Math.min(100, values[id])), cx, cy, radius)]));
}

const fmt = (n) => n.toFixed(1);
const pointsAttr = (points) => points.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ');

// series: [{ values, className }]. 뒤에 오는 계열이 위에 그려진다.
export function renderRadarSvg(series, { size = 320, label = '' } = {}) {
  const c = size / 2;
  const radius = size * 0.34;
  const rings = RADAR_RINGS.map((ring) => `<polygon class="radar__ring" points="${pointsAttr(AXES.map((_, i) => radarPoint(i, ring, c, c, radius)))}" />`).join('');
  const spokes = AXES.map((_, i) => {
    const [x, y] = radarPoint(i, 100, c, c, radius);
    return `<line class="radar__spoke" x1="${c}" y1="${c}" x2="${fmt(x)}" y2="${fmt(y)}" />`;
  }).join('');
  const labels = AXES.map(({ short }, i) => {
    const [x, y] = radarPoint(i, 136, c, c, radius);
    return `<text class="radar__label" x="${fmt(x)}" y="${fmt(y)}" text-anchor="middle" dominant-baseline="middle">${short}</text>`;
  }).join('');
  const shapes = series.map(({ values, className }) => {
    const points = radarPolygon(values, c, c, radius);
    if (points.length === 0) return '';
    const dots = points.map(([x, y]) => `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="3.5" />`).join('');
    return `<g class="radar__series ${className}"><polygon points="${pointsAttr(points)}" />${dots}</g>`;
  }).join('');

  return `<svg class="radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">${rings}${spokes}${shapes}${labels}</svg>`;
}
