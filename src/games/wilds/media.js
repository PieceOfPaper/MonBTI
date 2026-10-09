// 와일즈 무기별 아이콘과 소개 영상. 사이트에서만 쓰는 표시 자료라 원본 시트 대신 여기서 관리한다.
// 아이콘: 나무위키 '분류:몬스터 헌터 시리즈/무기'의 무기 아이콘을 내려받아 src/assets/weapons/wilds/<weapon_id>.webp로 저장
// 로고: 나무위키 '파일:와일즈로고.png'를 내려받아 src/assets/games/wilds/logo.webp로 저장
// 영상: 캡콤아시아 '몬스터헌터 와일즈 무기/액션 소개 시리즈' 재생목록의 무기별 소개 영상 ID
// 소개 문구: descriptions.js의 공식 사이트 무기 소개
import logo from '../../assets/games/wilds/logo.webp';
import { WILDS_DESCRIPTIONS, WILDS_DESCRIPTION_SOURCE } from './descriptions.js';

export const wildsLogo = logo;

const icons = import.meta.glob('../../assets/weapons/wilds/*.webp', { eager: true, query: '?no-inline', import: 'default' });

export const WILDS_VIDEOS = {
  great_sword: 'PujB28TOG-I',
  long_sword: 'mNxlPnWiSc8',
  sword_and_shield: 'gvTRSmsxJuY',
  dual_blades: 'rU2wZhScVHE',
  hammer: 'HRcIvE5ZCVs',
  hunting_horn: 'hPTC767wwCI',
  lance: '-K39DqEbG-w',
  gunlance: 'O8lQq-kVcDs',
  switch_axe: 'h7RNAEjNoTc',
  charge_blade: 'NLZ74Og1VZA',
  insect_glaive: 'IWwxlPrHPss',
  light_bowgun: 'fT-jHGFTrzs',
  heavy_bowgun: 'qEBf7ElYkbo',
  bow: 'WnSKSwF-g6Y',
};

export function wildsMedia(weaponId) {
  return {
    icon: icons[`../../assets/weapons/wilds/${weaponId}.webp`] ?? null,
    videoId: WILDS_VIDEOS[weaponId] ?? null,
    description: WILDS_DESCRIPTIONS[weaponId] ?? null,
    descriptionSource: WILDS_DESCRIPTION_SOURCE,
  };
}
