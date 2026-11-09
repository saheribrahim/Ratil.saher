// ============================================================================
// Ratil.saher - Final Stable & Responsive Recognition Engine
// ============================================================================

let recognition = null;
window.isListeningActive = false;

function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("متصفحك لا يدعم التعرف الصوتي.");
    const msg = document.getElementById("msg");
    if (msg) msg.textContent = "يرجى استخدام متصفح Google Chrome لتعمل التلاوة الصوتية بشكل سليم.";
    return;
  }

  if (recognition) {
    try { recognition.stop(); } catch (e) {}
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "ar-SA";

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript + " ";
    }
    if (transcript.trim()) {
      processSpokenText(transcript.trim());
    }
  };

  recognition.onerror = (event) => {
    console.warn("ملاحظة التعرف الصوتي:", event.error);
    if (event.error === 'not-allowed') {
      const msg = document.getElementById("msg");
      if (msg) msg.textContent = "الرجاء السماح للمتصفح بالوصول إلى الميكروفون (رمز القفل بجانب الرابط).";
    }
  };

  recognition.onend = () => {
    // إعادة التشغيل تلقائياً إذا كانت التلاوة نشطة
    if (window.isListeningActive) {
      setTimeout(() => {
        try { recognition.start(); } catch (e) {}
      }, 300);
    }
  };
}

// دالة مطابقة الكلمات والانتقال الفوري للكلمة التالية
function processSpokenText(spokenText) {
  if (typeof words === "undefined" || !words.length) return;
  
  const spokenWords = spokenText.split(/\s+/);
  let currentPos = typeof pos !== "undefined" ? pos : 0;
  const startPoint = typeof basePos !== "undefined" ? basePos : 0;

  for (let sw of spokenWords) {
    let cleanSpoken = normalizeArabicText(sw);
    if (!cleanSpoken) continue;
    
    // البحث في الكلمات القادمة بدقة وسرعة
    for (let j = currentPos; j < Math.min(currentPos + 5, words.length); j++) {
      let cleanTarget = normalizeArabicText(words[j].n);
      
      if (cleanSpoken === cleanTarget || cleanTarget.includes(cleanSpoken) || cleanSpoken.includes(cleanTarget)) {
        if (typeof st !== "undefined") {
          st[j] = "ok";
        }
        currentPos = j + 1; // الانتقال الفوري للكلمة التالية
        break;
      }
    }
  }

  if (typeof pos !== "undefined") pos = currentPos;
  if (typeof render === "function") render();
}

// تنظيف النصوص العربية لضمان المطابقة الصحيحة
function normalizeArabicText(str) {
  if (!str) return "";
  return str.replace(/[\u064B-\u065F\u0670]/g, "") // إزالة التشكيل
             .replace(/[إأآٱاىوؤيئ]/g, m => ({'إ':'ا','أ':'ا','آ':'ا','ٱ':'ا','ى':'ا','و':'و','ؤ':'و','ي':'ي','ئ':'ي'}[m]))
             .replace(/ة/g, "ه")
             .trim();
}

// التشغيل التلقائي عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
  initRecognition();
  window.isListeningActive = true;
  
  setTimeout(() => {
    try {
      recognition.start();
      const msg = document.getElementById("msg");
      if (msg) msg.textContent = "جاري الاستماع.. ابدأ التلاوة الآن وسيتم التتبع تلقائياً.";
    } catch (e) {
      console.warn("تعذر البدء التلقائي للميكروفون:", e);
    }
  }, 1000);
});
