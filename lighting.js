// lighting.js — 노랑조명 조명 견적·설계 계산기의 순수 로직.
// DOM/브라우저 전역에 의존하지 않으며 tests/lighting.test.mjs의 테스트 대상이다.
//
// 계산 원리(광속법 간이식):
//   필요 광속(lm) = 목표 조도(lux) × 면적(m²) ÷ (조명률 × 보수율)
//   주거·소형 상업 공간의 평균값으로 조명률 0.5, 보수율 0.9 → 0.45를 쓴다.
//   천장이 높으면 바닥까지 닿는 빛이 줄어 15% 더 필요하다고 본다.

export const PYEONG_M2 = 3.3058;
export const LED_LM_PER_W = 100; // 일반 LED 조명의 대략적인 효율
const UTILIZATION = 0.45;
const HIGH_CEILING_FACTOR = 1.15;

// 제품 가격: 노랑조명 자사몰(ylt67.com) 판매가 기준, 2026-10-31 확인. [최소, 최대] 원 단위.
// 시공비(installSwap·installNew)는 자사몰·스토어에 공개된 금액이 없어 대표 확인이 필요하다.
export const PRICES = {
  livingMain: [199000, 490000],  // 거실등 100~200W (모니카 미니·더블링 199,000 ~ 그라나다 490,000)
  roomMain: [51200, 149000],     // 방등 50~60W (스텔라 51,200 ~ 스웨그 149,000)
  kitchenMain: [17700, 140000],  // 주방등 (시스템 프리미엄 17,700 ~ 에코 인테리어 라인 140,000)
  downlight: [3800, 31500],      // 다운라이트 4인치 (YM 홀컵 3,800 ~ 라우드 COB 31,500)
  pendant: [32000, 254000],      // 식탁 펜던트 (와이즈 32,000 ~ 카이져 254,000)
  track: [25000, 77000],         // 레일 조명 세트 1.5~2M (원통 4등 25,000 ~ 사각레일 5구 77,000)
  officeFlat: [35900, 51400],    // LED 엣지 평판등 (640 35,900 / 1285 51,400)
  installSwap: [20000, 40000],   // [확인 필요] 기존 자리 교체 시공(개당)
  installNew: [30000, 50000],    // [확인 필요] 다운라이트 타공·신규 배선(개당)
};

// 공간 유형별 기본값.
//  lux: 목표 평균 조도(기본 분위기 기준)
//  kelvin: 추천 색온도 범위
//  mode: 기본 배치 방식
export const SPACES = {
  living:  { label: '거실',        lux: 200, kelvin: '4000K (아늑하게는 3000K)', mainKey: 'livingMain', mainLm: 10000, mainName: '거실등' },
  bedroom: { label: '침실·방',     lux: 120, kelvin: '3000K 전구색',            mainKey: 'roomMain',   mainLm: 5000,  mainName: '방등' },
  kitchen: { label: '주방',        lux: 300, kelvin: '4000~5000K',              mainKey: 'kitchenMain', mainLm: 5000, mainName: '주방등' },
  dining:  { label: '식탁',        lux: 200, kelvin: '3000K 전구색',            pendant: true },
  oneroom: { label: '원룸·오피스텔', lux: 200, kelvin: '4000K + 무드등 3000K',   mainKey: 'roomMain',   mainLm: 5000,  mainName: '메인등' },
  study:   { label: '공부방·서재',  lux: 400, kelvin: '5000K 주백색',            mainKey: 'roomMain',   mainLm: 5000,  mainName: '방등' },
  cafe:    { label: '카페·매장',    lux: 300, kelvin: '2700~3000K',              track: true },
  office:  { label: '사무실',      lux: 500, kelvin: '4000~5000K',              office: true },
};

export const MOODS = {
  cozy:   { label: '아늑하게', factor: 0.7 },
  normal: { label: '기본',     factor: 1.0 },
  bright: { label: '밝게',     factor: 1.3 },
};

export const DOWNLIGHT_LM = 1000;   // 4인치 8~10W급
export const OFFICE_FLAT_LM = 3500; // 엣지 평판 640·1285 평균
export const TRACK_SPOT_LM = 1200;  // 레일 스포트 1개 (PAR30·COB 15W급)
export const SPOTS_PER_TRACK_SET = 4; // 1.5~2M 레일 세트 3~5구

export function pyeongToM2(pyeong) {
  const p = Number(pyeong);
  if (!Number.isFinite(p) || p <= 0) return 0;
  return Math.round(p * PYEONG_M2 * 10) / 10;
}

// 목표 조도와 면적으로 필요한 광속(lm)을 계산한다. 100lm 단위로 반올림.
export function requiredLumens(lux, m2, opts = {}) {
  const l = Number(lux), a = Number(m2);
  if (!(l > 0) || !(a > 0)) return 0;
  let lm = (l * a) / UTILIZATION;
  if (opts.highCeiling) lm *= HIGH_CEILING_FACTOR;
  return Math.round(lm / 100) * 100;
}

// 식탁 펜던트 개수: 식탁 폭 기준(1인당 약 60cm, 펜던트 1개가 약 60~70cm를 비춘다).
export function pendantCount(seats) {
  const s = Math.floor(Number(seats) || 0);
  if (s <= 2) return 1;
  if (s <= 4) return 2;
  return 3;
}

const range = (key, qty) => {
  const [lo, hi] = PRICES[key];
  return [lo * qty, hi * qty];
};

// 공간 하나에 대한 설계안.
// room = { type, pyeong, seats?(식탁), install?('swap'|'new'|'none') }
// ctx  = { mood, highCeiling }
export function planRoom(room, ctx = {}) {
  const sp = SPACES[room && room.type];
  if (!sp) return null;
  const mood = MOODS[ctx.mood] || MOODS.normal;
  const pyeong = Number(room.pyeong) || 0;
  const m2 = pyeongToM2(pyeong);
  const lux = Math.round(sp.lux * mood.factor);
  const lumens = requiredLumens(lux, m2, { highCeiling: !!ctx.highCeiling });
  const install = room.install || 'swap';
  const items = [];

  if (sp.pendant) {
    const n = pendantCount(room.seats);
    items.push({ name: '식탁 펜던트', qty: n, priceKey: 'pendant', note: '식탁 위 70~80cm 높이' });
  } else if (sp.track) {
    const spots = Math.max(1, Math.ceil(lumens / TRACK_SPOT_LM));
    const sets = Math.max(1, Math.ceil(spots / SPOTS_PER_TRACK_SET));
    items.push({ name: `레일 + 스포트 세트 (스포트 ${spots}개)`, qty: sets, priceKey: 'track', note: '테이블·메뉴판·포토존에 빛을 모아 줍니다. 전구 포함 여부는 제품마다 다릅니다' });
  } else if (sp.office) {
    const n = Math.max(1, Math.ceil(lumens / OFFICE_FLAT_LM));
    items.push({ name: 'LED 엣지 평판등', qty: n, priceKey: 'officeFlat', note: '눈부심 적은 면조명. 640·1285 규격' });
  } else {
    const n = Math.max(1, Math.ceil(lumens / sp.mainLm));
    items.push({ name: sp.mainName, qty: n, priceKey: sp.mainKey, note: `약 ${Math.round(sp.mainLm / LED_LM_PER_W)}W급` });
  }

  // 대안: 메인등 없이 다운라이트로 분산(펜던트·사무실은 제외)
  let alternative = null;
  if (!sp.pendant && !sp.office && lumens > 0) {
    const dl = Math.max(1, Math.ceil(lumens / DOWNLIGHT_LM));
    alternative = { name: '다운라이트 4인치', qty: dl, priceKey: 'downlight', note: '8~10W급. 천장 타공 필요. 메인등 없이 깔끔한 분산 배치' };
  }

  // 견적 범위
  let product = [0, 0], labor = [0, 0], fixtureCount = 0;
  for (const it of items) {
    const [lo, hi] = range(it.priceKey, it.qty);
    product = [product[0] + lo, product[1] + hi];
    fixtureCount += it.qty;
  }
  if (install !== 'none' && fixtureCount > 0) {
    labor = range(install === 'new' ? 'installNew' : 'installSwap', fixtureCount);
  }

  return {
    type: room.type,
    label: sp.label,
    pyeong,
    m2,
    lux,
    lumens,
    watts: Math.round(lumens / LED_LM_PER_W),
    kelvin: sp.kelvin,
    items,
    alternative,
    product,
    labor,
    total: [product[0] + labor[0], product[1] + labor[1]],
  };
}

// 여러 공간을 한 번에 계산하고 합계를 낸다.
export function planHome(rooms, ctx = {}) {
  const plans = (rooms || []).map(r => planRoom(r, ctx)).filter(p => p && (p.type === 'dining' || p.lumens > 0));
  const sum = (sel) => plans.reduce((acc, p) => [acc[0] + sel(p)[0], acc[1] + sel(p)[1]], [0, 0]);
  return {
    plans,
    product: sum(p => p.product),
    labor: sum(p => p.labor),
    total: sum(p => p.total),
    totalLumens: plans.reduce((a, p) => a + p.lumens, 0),
  };
}

// 원 → "12만 원" / "12.5만 원" (1만 원 미만은 "8,000원")
export function won(n) {
  const v = Math.round(Number(n) || 0);
  if (v < 10000) return `${v.toLocaleString('ko-KR')}원`;
  const man = Math.round(v / 1000) / 10;
  return `${man.toLocaleString('ko-KR')}만 원`;
}

export function wonRange([lo, hi]) {
  if (!lo && !hi) return '-';
  return `${won(lo)} ~ ${won(hi)}`;
}

// 상담 문의용 요약 텍스트(톡톡·DM에 붙여넣기).
export function summaryText(home, ctx = {}) {
  const mood = (MOODS[ctx.mood] || MOODS.normal).label;
  const lines = ['[노랑조명 조명 견적 요청]', `분위기: ${mood}${ctx.highCeiling ? ' · 천장 높음' : ''}`, ''];
  for (const p of home.plans) {
    const head = p.type === 'dining' ? `■ ${p.label}` : `■ ${p.label} ${p.pyeong}평 (${p.m2}㎡)`;
    lines.push(head);
    if (p.lumens) lines.push(`  필요 밝기 약 ${p.lumens.toLocaleString('ko-KR')}lm · ${p.kelvin}`);
    for (const it of p.items) lines.push(`  - ${it.name} × ${it.qty}`);
    lines.push(`  예상 ${wonRange(p.total)}`);
  }
  lines.push('', `총 예상 범위: ${wonRange(home.total)}`, '정확한 견적 부탁드립니다.');
  return lines.join('\n');
}
