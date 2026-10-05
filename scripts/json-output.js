import { isDeepStrictEqual } from 'node:util';

// 다운로드·변환 시각만 달라졌다면 기존 JSON과 그 시각을 보존한다.
export function sameSheetData(current, next) {
  const comparable = ({ meta, ...data }) => {
    const { exported_at, converted_at, ...stableMeta } = meta ?? {};
    return { ...data, meta: stableMeta };
  };
  return isDeepStrictEqual(comparable(current), comparable(next));
}
