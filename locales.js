// 다국어 문자열 + 헬퍼. DOM/브라우저 전역에 의존하지 않는다.

export const SUPPORTED_LANGS = ['ko', 'en', 'es', 'ja', 'zh'];

export const translations = {
  ko: {
    days: '일', hours: '시', minutes: '분', seconds: '초',
    setEvent: '이벤트 설정', share: '공유',
    eventName: '이벤트 이름', selectDateTime: '날짜 및 시간',
    save: '저장', cancel: '취소',
    expiredTitle: '시간이 되었습니다!', expiredMessage: '설정하신 이벤트 시간에 도달했습니다.',
    shareCopied: '공유 링크가 복사되었습니다',
    noEventPrompt: '시작하려면 이벤트를 설정하세요',
  },
  en: {
    days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds',
    setEvent: 'Set Event', share: 'Share',
    eventName: 'Event name', selectDateTime: 'Date & time',
    save: 'Save', cancel: 'Cancel',
    expiredTitle: 'Time is up!', expiredMessage: 'The event time has been reached.',
    shareCopied: 'Share link copied to clipboard',
    noEventPrompt: 'Set an event to get started',
  },
  es: {
    days: 'Días', hours: 'Horas', minutes: 'Minutos', seconds: 'Segundos',
    setEvent: 'Configurar evento', share: 'Compartir',
    eventName: 'Nombre del evento', selectDateTime: 'Fecha y hora',
    save: 'Guardar', cancel: 'Cancelar',
    expiredTitle: '¡Se acabó el tiempo!', expiredMessage: 'Se ha alcanzado la hora del evento.',
    shareCopied: 'Enlace de compartir copiado',
    noEventPrompt: 'Configura un evento para empezar',
  },
  ja: {
    days: '日', hours: '時間', minutes: '分', seconds: '秒',
    setEvent: 'イベントを設定', share: '共有',
    eventName: 'イベント名', selectDateTime: '日時',
    save: '保存', cancel: 'キャンセル',
    expiredTitle: '時間になりました！', expiredMessage: '設定したイベント時刻に到達しました。',
    shareCopied: '共有リンクをコピーしました',
    noEventPrompt: 'イベントを設定して開始',
  },
  zh: {
    days: '天', hours: '时', minutes: '分', seconds: '秒',
    setEvent: '设置事件', share: '分享',
    eventName: '事件名称', selectDateTime: '日期和时间',
    save: '保存', cancel: '取消',
    expiredTitle: '时间到了！', expiredMessage: '已到达您设置的事件时间。',
    shareCopied: '分享链接已复制',
    noEventPrompt: '设置一个事件即可开始',
  },
};

export function t(key, lang) {
  const dict = translations[lang] || translations.en;
  return dict[key] ?? translations.en[key] ?? key;
}
