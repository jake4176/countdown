// 모든 페이지 공통 동작(점진적 향상). 실제 콘텐츠·내비게이션은 HTML에 이미 들어 있어
// JS가 없어도 사이트가 완전히 동작합니다. 여기서는 편의 기능만 담당합니다.
(function () {
  'use strict';

  // ---- 모바일 햄버거 메뉴 ----
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('primary-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  // ---- 푸터 연도 ----
  var yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---- Google Analytics (설정된 경우에만) ----
  var cfg = window.SITE_CONFIG || {};
  if (cfg.gaId) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.gaId);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', cfg.gaId);
  }
})();
