// 검사 시작 시 입력받는 표시 이름. 결과 제목·비교 차트·공유 이미지·공유 링크에 그대로 쓴다.
export const NICKNAME_MAX_LENGTH = 12;

// 이름 입력 칸의 기본값이자, 이름 없이 만든 예전 공유 링크를 열 때 대신 쓰는 이름
export const FALLBACK_NICKNAME = '헌터';

// 제어 문자를 빼고 연속 공백을 하나로 줄인 뒤 앞뒤 공백을 지우고 최대 길이(문자 단위)로 자른다.
export function normalizeNickname(value) {
  const cleaned = String(value ?? '')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(cleaned).slice(0, NICKNAME_MAX_LENGTH).join('').trim();
}

// 공유 코드에 담기 위해 UTF-8 바이트를 base64url(영문·숫자·'-'·'_')로 바꾼다.
export function encodeNickname(nickname) {
  const binary = Array.from(new TextEncoder().encode(nickname), (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

// 잘못된 값이거나 정리 후 빈 이름이면 null.
export function decodeNickname(code) {
  if (!/^[A-Za-z0-9_-]+$/.test(code ?? '')) return null;
  try {
    const binary = atob(code.replaceAll('-', '+').replaceAll('_', '/'));
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
    const nickname = normalizeNickname(text);
    return nickname && nickname === text ? nickname : null;
  } catch {
    return null;
  }
}
