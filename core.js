// 순수 로직: 시간 포맷·파싱. DOM/브라우저 전역에 의존하지 않는다.

// 초를 시/분/초로 분해. 음수는 0으로 클램프.
export function breakdownTime(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0;
  totalSeconds = Math.floor(totalSeconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { h, m, s };
}

// 표시용 문자열. 1시간 미만은 MM:SS, 이상은 HH:MM:SS.
export function formatTime(totalSeconds) {
  const { h, m, s } = breakdownTime(totalSeconds);
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// 분·초 입력을 총 초로 변환. 잘못된 값은 0, 음수는 0으로 클램프.
export function parseDuration(minutes, seconds) {
  const m = Math.max(0, Math.floor(Number(minutes) || 0));
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  return m * 60 + s;
}
