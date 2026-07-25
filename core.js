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

// 포모도로 기본 설정(초 단위). 25분 작업 · 5분 짧은 휴식 · 15분 긴 휴식.
export const POMODORO = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
  longBreakEvery: 4,
};

// 페이즈 이름 -> 지속 시간(초). 알 수 없는 페이즈는 0.
export function pomodoroDuration(phase) {
  switch (phase) {
    case 'work': return POMODORO.work;
    case 'short-break': return POMODORO.shortBreak;
    case 'long-break': return POMODORO.longBreak;
    default: return 0;
  }
}

// 현재 페이즈가 끝난 뒤의 다음 페이즈.
// 작업이 끝나면 workCount가 longBreakEvery의 배수일 때 긴 휴식, 그 외엔 짧은 휴식.
// 휴식이 끝나면 다시 작업으로.
export function pomodoroNextPhase(currentPhase, workCount) {
  if (currentPhase === 'work') {
    return workCount % POMODORO.longBreakEvery === 0 ? 'long-break' : 'short-break';
  }
  return 'work';
}

// 한 페이즈 종료 후의 다음 상태(페이즈·완료 작업 수·지속 시간)를 한 번에 계산.
// 작업이 끝나면 workCount를 1 증가시키고, 긴 휴식이 끝나면 다음 사이클을 위해 0으로 리셋.
export function pomodoroAdvanceState(currentPhase, workCount) {
  const nextCount = currentPhase === 'work' ? workCount + 1 : workCount;
  const phase = pomodoroNextPhase(currentPhase, nextCount);
  return {
    phase,
    workCount: currentPhase === 'long-break' ? 0 : nextCount,
    duration: pomodoroDuration(phase),
  };
}

// ---------- 프리셋 ----------
// 메인 화면 빠른 타이머 카드 6종. id는 안정적인 키, min은 분, kind로 집중/휴식 구분.
export const PRESETS = [
  { id: 'pomodoro',   min: 25, kind: 'focus', icon: '🍅' },
  { id: 'shortBreak', min: 5,  kind: 'break', icon: '☕' },
  { id: 'longBreak',  min: 15, kind: 'break', icon: '🧘' },
  { id: 'quick',      min: 10, kind: 'focus', icon: '💻' },
  { id: 'study',      min: 30, kind: 'focus', icon: '📚' },
  { id: 'deepWork',   min: 60, kind: 'focus', icon: '🎯' },
];

// ---------- 사용자 지정 시간 검증 ----------
export const MIN_DURATION = 1;            // 1초
export const MAX_DURATION = 24 * 60 * 60; // 24시간

// 총 초를 검증. 숫자가 아니거나 범위를 벗어나면 null. 유효하면 정수 초.
export function validateDuration(totalSeconds) {
  const n = Math.floor(Number(totalSeconds));
  if (!Number.isFinite(n)) return null;
  if (n < MIN_DURATION || n > MAX_DURATION) return null;
  return n;
}

// ---------- 날짜·통계 (로컬 스토리지 집계용, 순수) ----------
// epoch ms -> 로컬 'YYYY-MM-DD'. 같은 입력이면 항상 같은 결과.
export function dateKey(ms) {
  const d = new Date(ms);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 완료 세션 1건을 일자별 통계에 누적. stats는 { 'YYYY-MM-DD': { sessions, seconds } }.
// 원본을 변형하지 않고 새 객체를 반환한다.
export function addSession(stats, key, seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const day = stats[key] || { sessions: 0, seconds: 0 };
  return {
    ...stats,
    [key]: { sessions: day.sessions + 1, seconds: day.seconds + s },
  };
}

// 오늘(todayMs 기준)을 마지막으로 하는 최근 7일 배열을 오래된 날 → 오늘 순으로 반환.
// 각 항목: { key, sessions, seconds }. 기록이 없는 날은 0으로 채운다.
export function last7Days(stats, todayMs) {
  const out = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let i = 6; i >= 0; i--) {
    const key = dateKey(todayMs - i * dayMs);
    const day = stats[key] || { sessions: 0, seconds: 0 };
    out.push({ key, sessions: day.sessions, seconds: day.seconds });
  }
  return out;
}

// Human-readable duration. Default Korean; pass lang 'en' for English UI.
export function humanizeSeconds(totalSeconds, lang = 'ko') {
  const total = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (lang === 'en') {
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    return `${m} min`;
  }
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  return `${m}분`;
}

// ---------- 집중 세션 로그 (플랫폼 데이터 모델, 순수 집계) ----------
// 세션 레코드 형태: { id, date:'YYYY-MM-DD', start:ms, dur:sec, label:string, distractions:int }
// 아래 함수들은 세션 배열을 받아 파생 지표를 계산할 뿐, 저장/DOM에 의존하지 않는다.

export const NO_LABEL = '라벨 없음';
export const DEFAULT_GOAL = { type: 'sessions', target: 4 }; // 하루 집중 4세션

// 'YYYY-MM-DD'의 요일(0=일 ~ 6=토)을 로컬 기준으로 계산. UTC 파싱으로 인한 하루 밀림 방지.
export function weekdayOf(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).getDay();
}

// 특정 날짜의 요약(세션 수·초·방해 수).
export function daySummary(sessions, key) {
  let n = 0, sec = 0, dis = 0;
  for (const s of sessions) {
    if (s.date !== key) continue;
    n += 1; sec += Number(s.dur) || 0; dis += Number(s.distractions) || 0;
  }
  return { sessions: n, seconds: sec, distractions: dis };
}

// 오늘(todayMs)을 마지막으로 하는 최근 days일 시계열(오래된 → 오늘).
export function dailySeries(sessions, todayMs, days = 7) {
  const out = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let i = days - 1; i >= 0; i--) {
    const key = dateKey(todayMs - i * dayMs);
    out.push({ key, ...daySummary(sessions, key) });
  }
  return out;
}

// 라벨별 집계(초 기준 내림차순). sinceMs 이후 세션만(기본 전체).
export function labelBreakdown(sessions, sinceMs = 0) {
  const map = new Map();
  for (const s of sessions) {
    if ((Number(s.start) || 0) < sinceMs) continue;
    const label = (s.label && String(s.label).trim()) || NO_LABEL;
    const cur = map.get(label) || { label, sessions: 0, seconds: 0, distractions: 0 };
    cur.sessions += 1; cur.seconds += Number(s.dur) || 0; cur.distractions += Number(s.distractions) || 0;
    map.set(label, cur);
  }
  return [...map.values()].sort((a, b) => b.seconds - a.seconds);
}

// 요일별(0=일~6=토) 세션·방해 합계.
export function distractionByWeekday(sessions) {
  const arr = Array.from({ length: 7 }, () => ({ sessions: 0, distractions: 0 }));
  for (const s of sessions) {
    const wd = weekdayOf(s.date);
    arr[wd].sessions += 1; arr[wd].distractions += Number(s.distractions) || 0;
  }
  return arr;
}

// 전체 누적(세션·초·방해).
export function totals(sessions) {
  let sec = 0, dis = 0;
  for (const s of sessions) { sec += Number(s.dur) || 0; dis += Number(s.distractions) || 0; }
  return { sessions: sessions.length, seconds: sec, distractions: dis };
}

// 목표 진행도. daySummary 결과와 goal을 받아 현재값·목표·달성 여부·비율을 반환.
export function goalProgress(summary, goal) {
  const g = goal && goal.target ? goal : DEFAULT_GOAL;
  const target = Math.max(1, Math.floor(g.target));
  const current = g.type === 'minutes' ? Math.floor((summary.seconds || 0) / 60) : (summary.sessions || 0);
  return { current, target, met: current >= target, ratio: Math.min(1, current / target), type: g.type };
}

// 현재 연속 달성일(스트릭). 오늘 목표를 아직 못 채웠어도, 어제까지 이어졌다면 그 길이를 유지한다.
export function computeStreak(sessions, todayMs, goal) {
  const dayMs = 24 * 60 * 60 * 1000;
  const met = off => goalProgress(daySummary(sessions, dateKey(todayMs - off * dayMs)), goal).met;
  if (!met(0) && !met(1)) return 0;
  let off = met(0) ? 0 : 1;
  let streak = 0;
  while (met(off)) { streak += 1; off += 1; }
  return streak;
}
