// 다국어 문자열 + 헬퍼. DOM/브라우저 전역에 의존하지 않는다.

export const SUPPORTED_LANGS = ['ko', 'en', 'es', 'ja', 'zh'];

export const translations = {
  ko: {
    modeCountdown: '카운트다운', modeStopwatch: '스탑워치',
    start: '시작', pause: '일시정지', reset: '리셋',
    minutes: '분', seconds: '초', customInput: '직접 입력',
    timesUp: '시간 완료!',
  },
  en: {
    modeCountdown: 'Countdown', modeStopwatch: 'Stopwatch',
    start: 'Start', pause: 'Pause', reset: 'Reset',
    minutes: 'min', seconds: 'sec', customInput: 'Custom',
    timesUp: "Time's up!",
  },
  es: {
    modeCountdown: 'Cuenta atrás', modeStopwatch: 'Cronómetro',
    start: 'Iniciar', pause: 'Pausar', reset: 'Reiniciar',
    minutes: 'min', seconds: 'seg', customInput: 'Personalizado',
    timesUp: '¡Tiempo!',
  },
  ja: {
    modeCountdown: 'カウントダウン', modeStopwatch: 'ストップウォッチ',
    start: '開始', pause: '一時停止', reset: 'リセット',
    minutes: '分', seconds: '秒', customInput: 'カスタム',
    timesUp: '時間です！',
  },
  zh: {
    modeCountdown: '倒计时', modeStopwatch: '秒表',
    start: '开始', pause: '暂停', reset: '重置',
    minutes: '分', seconds: '秒', customInput: '自定义',
    timesUp: '时间到！',
  },
};

export function t(key, lang) {
  const dict = translations[lang] || translations.en;
  return dict[key] ?? translations.en[key] ?? key;
}
