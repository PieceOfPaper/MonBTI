// 다섯 기준의 0~100 값을 오각형 방사형 차트로 그린다.
// 위치 계산은 화면용 SVG와 공유 이미지(캔버스)가 함께 사용한다. axes는 작품의 축 모델 축 목록이며 꼭짓점 순서다.
import { AXES } from '../core/axes.js';

export const RADAR_RINGS = [25, 50, 75, 100];

// 첫 축을 위쪽에 두고 시계 방향으로 배치한다.
export function radarPoint(index, value, cx, cy, radius, count = AXES.length) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
  const r = (radius * value) / 100;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

// 미측정(null) 축은 꼭짓점에서 빼고 측정된 축만 잇는다.
export function radarPolygon(values, cx, cy, radius, axes = AXES) {
  return axes.flatMap(({ id }, index) => (values[id] === null || values[id] === undefined
    ? []
    : [radarPoint(index, Math.max(0, Math.min(100, values[id])), cx, cy, radius, axes.length)]));
}

const fmt = (n) => n.toFixed(1);
const pointsAttr = (points) => points.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ');

// series: [{ values, className }]. 뒤에 오는 계열이 위에 그려진다.
export function renderRadarSvg(series, { size = 320, label = '', axes = AXES } = {}) {
  const c = size / 2;
  const radius = size * 0.34;
  const point = (i, value) => radarPoint(i, value, c, c, radius, axes.length);
  const rings = RADAR_RINGS.map((ring) => `<polygon class="radar__ring" points="${pointsAttr(axes.map((_, i) => point(i, ring)))}" />`).join('');
  const spokes = axes.map((_, i) => {
    const [x, y] = point(i, 100);
    return `<line class="radar__spoke" x1="${c}" y1="${c}" x2="${fmt(x)}" y2="${fmt(y)}" />`;
  }).join('');
  const labels = axes.map(({ short }, i) => {
    const [x, y] = point(i, 136);
    return `<text class="radar__label" x="${fmt(x)}" y="${fmt(y)}" text-anchor="middle" dominant-baseline="middle">${short}</text>`;
  }).join('');
  const shapes = series.map(({ values, className }) => {
    const points = radarPolygon(values, c, c, radius, axes);
    if (points.length === 0) return '';
    const dots = points.map(([x, y]) => `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="3.5" />`).join('');
    return `<g class="radar__series ${className}"><polygon points="${pointsAttr(points)}" />${dots}</g>`;
  }).join('');

  return `<svg class="radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">${rings}${spokes}${shapes}${labels}</svg>`;
}
