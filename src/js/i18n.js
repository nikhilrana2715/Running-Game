import { Save } from './save.js';

const DICT = {
  en: {},
  hi: {
    daily: 'रोज़ का इनाम', missions: 'आज के मिशन', close: 'बंद करो', claim: 'लो', day: 'दिन', comeBack: 'कल फिर आना!',
    webHint: '🕸️ हवा में JUMP दो बार दबाओ = वेब स्विंग!', score: 'स्कोर', jump: 'कूदो', miniGame: 'मिनी गेम', play: 'खेलो', endless: 'एंडलेस रन', store: 'दुकान',
    hint: '← → / A D चलो · Space / ↑ / क्लिक = कूदो · P = रोको', selectLevel: 'लेवल चुनो', skins: 'स्किन', powerups: 'पावर-अप',
    settings: 'सेटिंग्स', music: 'संगीत', sfx: 'आवाज़', vibration: 'वाइब्रेशन', on: 'चालू', off: 'बंद', dayNight: 'दिन / रात',
    auto: 'ऑटो', buttons: 'स्क्रीन बटन', show: 'दिखाओ', hide: 'छुपाओ', btnSize: 'बटन साइज़', language: 'भाषा',
    resetProgress: 'प्रोग्रेस रीसेट', reset: 'रीसेट', trophies: 'ट्रॉफी', paused: 'रुका हुआ', resume: 'जारी रखो', restart: 'फिर से',
    home: 'होम', gameOver: 'गेम ओवर', distance: 'दूरी', best: 'बेस्ट', retry: 'फिर खेलो', levelComplete: 'लेवल पूरा!',
    coins: 'सिक्के', stars: 'तारे', time: 'समय', next: 'अगला', rotate: 'बेहतर मज़े के लिए फ़ोन घुमाओ',
    keysHelp: 'कीबोर्ड: ← → / A D चलो · Space / W / ↑ कूदो · P / Esc रोको। माउस: कहीं भी क्लिक = कूदो। गेमपैड भी चलेगा।',
    nightFalls: '🌙 रात हो गई!', dayBreaks: '☀️ सुबह हो गई!', checkpoint: 'चेकपॉइंट!', revive: 'जीवित करो', equip: 'पहनो', equipped: 'पहना हुआ',
    owned: 'आपका', buy: 'खरीदो', confirmReset: 'पक्का? फिर दबाओ', notEnough: 'सिक्के कम हैं!', world: 'दुनिया',
  },
};
const EN = {
  nightFalls: '🌙 Night falls!', dayBreaks: '☀️ Good morning!', checkpoint: 'Checkpoint!', revive: 'Revive', equip: 'Equip', equipped: 'Equipped',
  owned: 'Owned', buy: 'Buy', confirmReset: 'Sure? Tap again', notEnough: 'Not enough coins!', world: 'World',
};

export function t(key, fallback) {
  const lang = Save.data.settings.lang;
  return (DICT[lang] && DICT[lang][key]) || EN[key] || fallback || key;
}

export function applyI18n(root = document) {
  const lang = Save.data.settings.lang;
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    if (!el.dataset.en) el.dataset.en = el.textContent;
    el.textContent = (DICT[lang] && DICT[lang][el.dataset.i18n]) || el.dataset.en;
  });
}
