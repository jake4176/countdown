// 순수 로직: 시간 분해 + 공유 인코딩. DOM/브라우저 전역에 의존하지 않는다.

export function breakdownRemaining(ms) {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export function encodeEvent(event) {
  // 유니코드(한글 등)를 안전하게 위해 먼저 encodeURIComponent 후 Base64.
  const json = JSON.stringify(event);
  return btoa(encodeURIComponent(json));
}

export function decodeEvent(str) {
  if (!str) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(atob(str)));
    if (!obj || typeof obj.name !== 'string' || typeof obj.targetISO !== 'string') return null;
    return { name: obj.name, targetISO: obj.targetISO };
  } catch {
    return null;
  }
}
