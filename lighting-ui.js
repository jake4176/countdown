// lighting-ui.js — /lighting/ 조명 견적·설계 계산기 화면 연결. 계산은 lighting.js에 위임.
import { SPACES, MOODS, PRICES, planHome, wonRange, summaryText } from './lighting.js';

// ▼ 노랑조명 연락 채널 — 실제 주소로 채우면 버튼이 나타납니다. 비워두면 숨김.
const NORANG = {
  talktalk: '', // 네이버 톡톡 URL (예: https://talk.naver.com/...)
  store: '',    // 스마트스토어 URL
  tel: '',      // 매장 전화번호 (예: 051-000-0000)
  place: '',    // 네이버 플레이스(지도) URL
};

const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = {
  mood: 'normal',
  highCeiling: false,
  rooms: [
    { type: 'living', pyeong: 6, seats: 4, install: 'swap' },
    { type: 'bedroom', pyeong: 3, seats: 4, install: 'swap' },
    { type: 'dining', pyeong: 0, seats: 4, install: 'swap' },
  ],
};

const typeOptions = cur => Object.entries(SPACES)
  .map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${v.label}</option>`).join('');

function roomRow(r, i) {
  const isDining = r.type === 'dining';
  const sizeField = isDining
    ? `<label class="lf"><span>식탁 인원</span><select data-k="seats">${[2, 4, 6, 8].map(n => `<option value="${n}"${+r.seats === n ? ' selected' : ''}>${n}인</option>`).join('')}</select></label>`
    : `<label class="lf"><span>면적 (평)</span><input type="number" data-k="pyeong" min="0" max="200" step="0.5" inputmode="decimal" value="${r.pyeong}"></label>`;
  return `<div class="room" data-i="${i}">
    <label class="lf"><span>공간</span><select data-k="type">${typeOptions(r.type)}</select></label>
    ${sizeField}
    <label class="lf"><span>시공</span><select data-k="install">
      <option value="swap"${r.install === 'swap' ? ' selected' : ''}>기존 자리 교체</option>
      <option value="new"${r.install === 'new' ? ' selected' : ''}>신규 배선·타공</option>
      <option value="none"${r.install === 'none' ? ' selected' : ''}>직접 설치</option>
    </select></label>
    <button type="button" class="rm" data-rm="${i}" aria-label="${esc(SPACES[r.type].label)} 삭제">✕</button>
  </div>`;
}

function renderRooms() {
  $('#rooms').innerHTML = state.rooms.map(roomRow).join('');
}

function itemLine(it) {
  return `<li><b>${esc(it.name)}</b> × ${it.qty}<span class="sub">${esc(it.note)} · 개당 ${wonRange(PRICES[it.priceKey])}</span></li>`;
}

function renderResult() {
  const ctx = { mood: state.mood, highCeiling: state.highCeiling };
  const home = planHome(state.rooms, ctx);
  const out = $('#result');
  if (!home.plans.length) {
    out.innerHTML = '<p class="hint">공간과 면적을 입력하면 필요한 조명과 예상 비용이 나옵니다.</p>';
    $('#total').hidden = true;
    return home;
  }
  out.innerHTML = home.plans.map(p => `
    <article class="plan">
      <header><h3>${esc(p.label)}</h3>${p.type === 'dining' ? '' : `<span class="tag">${p.pyeong}평 · ${p.m2}㎡</span>`}</header>
      ${p.lumens ? `<div class="metrics">
        <div><b>${p.lumens.toLocaleString('ko-KR')}</b><span>필요 밝기 (lm)</span></div>
        <div><b>${p.watts}W</b><span>LED 기준</span></div>
        <div><b>${p.lux}</b><span>목표 조도 (lux)</span></div>
      </div>` : ''}
      <p class="kelvin">추천 색온도 <b>${esc(p.kelvin)}</b></p>
      <ul class="items">${p.items.map(itemLine).join('')}</ul>
      ${p.alternative ? `<details class="alt"><summary>다른 방법: ${esc(p.alternative.name)} ${p.alternative.qty}개</summary><p>${esc(p.alternative.note)}. 개당 ${wonRange(PRICES[p.alternative.priceKey])}, 시공은 신규 타공 기준입니다.</p></details>` : ''}
      <dl class="cost">
        <div><dt>제품</dt><dd>${wonRange(p.product)}</dd></div>
        <div><dt>시공</dt><dd>${wonRange(p.labor)}</dd></div>
        <div class="sum"><dt>소계</dt><dd>${wonRange(p.total)}</dd></div>
      </dl>
    </article>`).join('');
  $('#total').hidden = false;
  $('#total-range').textContent = wonRange(home.total);
  $('#total-detail').textContent = `제품 ${wonRange(home.product)} · 시공 ${wonRange(home.labor)}`;
  return home;
}

let lastHome = null;
function update() { lastHome = renderResult(); }

function bind() {
  // 분위기
  $('#mood').innerHTML = Object.entries(MOODS).map(([k, v]) =>
    `<button type="button" role="radio" aria-checked="${k === state.mood}" data-mood="${k}">${v.label}</button>`).join('');
  $('#mood').addEventListener('click', e => {
    const b = e.target.closest('[data-mood]'); if (!b) return;
    state.mood = b.dataset.mood;
    $('#mood').querySelectorAll('[data-mood]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    update();
  });
  $('#ceiling').addEventListener('change', e => { state.highCeiling = e.target.checked; update(); });

  // 공간 목록
  const rooms = $('#rooms');
  const onField = e => {
    const row = e.target.closest('.room'); const k = e.target.dataset.k;
    if (!row || !k) return;
    const r = state.rooms[+row.dataset.i];
    r[k] = k === 'pyeong' || k === 'seats' ? Number(e.target.value) || 0 : e.target.value;
    if (k === 'type') renderRooms();
    update();
  };
  rooms.addEventListener('input', onField);
  rooms.addEventListener('change', onField);
  rooms.addEventListener('click', e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    state.rooms.splice(+b.dataset.rm, 1);
    renderRooms(); update();
  });
  $('#add').addEventListener('click', () => {
    state.rooms.push({ type: 'bedroom', pyeong: 3, seats: 4, install: 'swap' });
    renderRooms(); update();
    const last = rooms.lastElementChild; if (last) $('select', last).focus();
  });

  // 견적 복사
  $('#copy').addEventListener('click', async () => {
    if (!lastHome || !lastHome.plans.length) return;
    const text = summaryText(lastHome, { mood: state.mood, highCeiling: state.highCeiling });
    const msg = $('#copy-msg');
    try {
      await navigator.clipboard.writeText(text);
      msg.textContent = '복사했어요. 톡톡이나 DM 창에 붙여넣기만 하면 됩니다.';
    } catch {
      $('#copy-fallback').value = text; $('#copy-fallback').hidden = false; $('#copy-fallback').select();
      msg.textContent = '자동 복사가 막혀 있어요. 아래 내용을 길게 눌러 복사해 주세요.';
    }
  });

  // 연락 채널 버튼
  const links = [];
  if (NORANG.talktalk) links.push(`<a class="btn primary" href="${esc(NORANG.talktalk)}" target="_blank" rel="noopener">네이버 톡톡으로 견적 받기</a>`);
  if (NORANG.tel) links.push(`<a class="btn" href="tel:${esc(NORANG.tel.replace(/[^0-9+]/g, ''))}">전화 상담 ${esc(NORANG.tel)}</a>`);
  if (NORANG.store) links.push(`<a class="btn" href="${esc(NORANG.store)}" target="_blank" rel="noopener">스마트스토어에서 제품 보기</a>`);
  if (NORANG.place) links.push(`<a class="btn" href="${esc(NORANG.place)}" target="_blank" rel="noopener">매장 위치 보기</a>`);
  $('#cta-links').innerHTML = links.join('');
}

renderRooms();
bind();
update();
