// 결과 상단 1순위 무기 뒤에 흐리게 까는 캐릭터 이미지 배치.
// 이미지: 몬스터헌터 와일즈 공식 사이트 무기 소개 페이지(https://www.monsterhunter.com/wilds/ko-kr/hunting/weapon/)의
// 무기별 캐릭터 이미지(slider/<번호>_a.png·_b.png)를 가로 640px webp로 줄여 src/assets/characters/wilds/<weapon_id>_<a|b>.webp로 저장했다.
// 배치: 같은 페이지에서 캐릭터 영역 폭 709px일 때 계산된 위치를 그대로 옮긴 값이다(단위 px, 기준점은 영역 왼쪽 위).
// top·left·width를 기준 틀(CHARACTER_FRAME)에 대한 비율로 바꿔 화면 폭에 맞춰 늘이고 줄인다.
// a는 앞(z 2), b는 뒤(z 1)에 놓는다.
export const CHARACTER_FRAME = { width: 709, top: -560, height: 1000 };

export const WILDS_CHARACTER_LAYOUT = {
  great_sword: { a: [-224.64, 83.2, 657.27], b: [-640.64, -299.52, 707.2] },
  long_sword: { a: [-183.04, -74.88, 898.56], b: [-224.64, -307.84, 798.72] },
  sword_and_shield: { a: [-208, 183.04, 532.48], b: [-282.88, -49.92, 332.8] },
  dual_blades: { a: [-216.32, 0, 524.16], b: [-291.2, 407.68, 382.72] },
  hammer: { a: [-149.76, 58.24, 690.56], b: [-266.24, -24.96, 407.68] },
  hunting_horn: { a: [-166.4, -216.32, 807.04], b: [-391.04, 141.44, 715.52] },
  lance: { a: [-149.76, 41.6, 740.48], b: [-507.52, -24.96, 981.76] },
  gunlance: { a: [-141.44, -58.24, 848.63], b: [-449.28, -58.24, 807.04] },
  switch_axe: { a: [-133.12, -16.64, 673.91], b: [-332.8, -74.88, 832] },
  charge_blade: { a: [-199.68, -166.4, 881.91], b: [-299.52, 41.6, 673.91] },
  insect_glaive: { a: [-391.04, -299.52, 956.8], b: [-224.64, 133.12, 748.8] },
  light_bowgun: { a: [-266.24, -33.28, 565.76], b: [-216.32, 366.08, 615.68] },
  heavy_bowgun: { a: [-99.84, 16.64, 856.95], b: [-282.88, 16.64, 690.56] },
  bow: { a: [-432.64, 158.08, 998.4], b: [-449.28, -124.8, 474.23] },
};

const percent = (value) => Math.round(value * 10000) / 100;

// 무기 하나의 캐릭터 이미지 목록. 뒤(b)부터 그리도록 정렬한다. 배치나 이미지가 없으면 빈 배열이다.
export function characterArt(layout, images, weaponId) {
  const entry = layout[weaponId];
  if (!entry) return [];
  return ['b', 'a'].flatMap((key) => {
    const src = images[key];
    if (!entry[key] || !src) return [];
    const [top, left, width] = entry[key];
    return [{
      src,
      top: percent((top - CHARACTER_FRAME.top) / CHARACTER_FRAME.height),
      left: percent(left / CHARACTER_FRAME.width),
      width: percent(width / CHARACTER_FRAME.width),
    }];
  });
}
