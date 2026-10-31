import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pyeongToM2, requiredLumens, pendantCount, planRoom, planHome, won, wonRange, summaryText, PRICES,
} from '../lighting.js';

test('pyeongToM2: 평 → ㎡ (소수 첫째 자리)', () => {
  assert.equal(pyeongToM2(1), 3.3);
  assert.equal(pyeongToM2(6), 19.8);
  assert.equal(pyeongToM2(0), 0);
  assert.equal(pyeongToM2('abc'), 0);
});

test('requiredLumens: 조도 × 면적 ÷ 0.45, 100lm 반올림', () => {
  assert.equal(requiredLumens(200, 19.8), 8800);
  assert.equal(requiredLumens(200, 19.8, { highCeiling: true }), 10100);
  assert.equal(requiredLumens(0, 10), 0);
  assert.equal(requiredLumens(200, 0), 0);
});

test('pendantCount: 인원별 펜던트 수', () => {
  assert.equal(pendantCount(2), 1);
  assert.equal(pendantCount(4), 2);
  assert.equal(pendantCount(6), 3);
});

test('planRoom: 거실 6평 기본 → 거실등 1개', () => {
  const p = planRoom({ type: 'living', pyeong: 6 }, { mood: 'normal' });
  assert.equal(p.lux, 200);
  assert.equal(p.lumens, 8800);
  assert.equal(p.watts, 88);
  assert.equal(p.items[0].name, '거실등');
  assert.equal(p.items[0].qty, 1);
  assert.equal(p.alternative.qty, 9); // 다운라이트 1000lm × 9
  assert.deepEqual(p.product, PRICES.livingMain);
  assert.deepEqual(p.labor, PRICES.installSwap);
});

test('planRoom: 분위기 배율 반영 (아늑하게 0.7)', () => {
  const p = planRoom({ type: 'living', pyeong: 6 }, { mood: 'cozy' });
  assert.equal(p.lux, 140);
  assert.ok(p.lumens < 8800);
});

test('planRoom: 큰 거실은 거실등 여러 개', () => {
  const p = planRoom({ type: 'living', pyeong: 12 }, { mood: 'bright' });
  assert.ok(p.items[0].qty >= 2);
});

test('planRoom: 식탁은 인원으로 펜던트 수 결정, 다운라이트 대안 없음', () => {
  const p = planRoom({ type: 'dining', seats: 4 });
  assert.equal(p.items[0].name, '식탁 펜던트');
  assert.equal(p.items[0].qty, 2);
  assert.equal(p.alternative, null);
});

test('planRoom: 시공 없음이면 시공비 0, 신규 배선이면 신규 단가', () => {
  assert.deepEqual(planRoom({ type: 'bedroom', pyeong: 3, install: 'none' }).labor, [0, 0]);
  assert.deepEqual(planRoom({ type: 'bedroom', pyeong: 3, install: 'new' }).labor, PRICES.installNew);
});

test('planRoom: 카페·사무실 전용 배치', () => {
  const cafe = planRoom({ type: 'cafe', pyeong: 15 });
  assert.match(cafe.items[0].name, /레일/);
  const office = planRoom({ type: 'office', pyeong: 10 });
  assert.match(office.items[0].name, /평판등/);
  assert.ok(office.items[0].qty >= 2);
});

test('planRoom: 알 수 없는 유형은 null', () => {
  assert.equal(planRoom({ type: 'garage', pyeong: 3 }), null);
});

test('planHome: 여러 공간 합계', () => {
  const home = planHome([
    { type: 'living', pyeong: 6 },
    { type: 'bedroom', pyeong: 3 },
    { type: 'dining', seats: 4 },
  ], { mood: 'normal' });
  assert.equal(home.plans.length, 3);
  const sumLo = home.plans.reduce((a, p) => a + p.total[0], 0);
  assert.equal(home.total[0], sumLo);
  assert.ok(home.total[1] > home.total[0]);
});

test('planHome: 면적 0인 일반 공간은 제외', () => {
  const home = planHome([{ type: 'living', pyeong: 0 }, { type: 'bedroom', pyeong: 3 }]);
  assert.equal(home.plans.length, 1);
  assert.equal(home.plans[0].type, 'bedroom');
});

test('won / wonRange 표기', () => {
  assert.equal(won(8000), '8,000원');
  assert.equal(won(120000), '12만 원');
  assert.equal(won(125000), '12.5만 원');
  assert.equal(wonRange([0, 0]), '-');
  assert.equal(wonRange([80000, 250000]), '8만 원 ~ 25만 원');
});

test('summaryText: 문의용 요약에 공간·합계 포함', () => {
  const ctx = { mood: 'cozy', highCeiling: true };
  const home = planHome([{ type: 'living', pyeong: 6 }, { type: 'dining', seats: 4 }], ctx);
  const t = summaryText(home, ctx);
  assert.match(t, /노랑조명 조명 견적 요청/);
  assert.match(t, /아늑하게 · 천장 높음/);
  assert.match(t, /거실 6평/);
  assert.match(t, /식탁 펜던트 × 2/);
  assert.match(t, /총 예상 범위/);
});
