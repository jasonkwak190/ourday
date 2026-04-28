/**
 * 한국어 이름 가운데 마스킹
 *
 * 공개 페이지에서 다른 하객의 이름을 부분적으로만 노출 (프라이버시).
 * 인증된 커플 페이지(dashboard, guests)에서는 원본 이름 사용.
 *
 * 규칙:
 *  1글자: 그대로 (이미 minLen=2로 들어옴, 안전장치)
 *  2글자: "김수" → "김*"
 *  3글자: "김철수" → "김*수"
 *  4글자+: 첫·끝만 보이고 가운데 모두 *
 */
export function maskName(name) {
  if (!name) return '';
  const str = String(name).trim();
  if (str.length < 2) return str;
  if (str.length === 2) return str[0] + '*';
  if (str.length === 3) return str[0] + '*' + str[2];
  return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
}
