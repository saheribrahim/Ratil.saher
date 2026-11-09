// ============================================================================
// Ratil.saher - Robust & Continuous Recognition Engine
// ============================================================================

let recognition = null;
window.isListeningActive = false;
let restartTimeout = null;

function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("متصفحك لا يدعم التعرف الصوتي المباشر.");
    const msg = document.getElementById("msg");
    if (msg) msg.textContent = "متصفحك لا يدعم التعرف الصوتي. يجدر استخدام متصفح Google Chrome.";
    return;
  }

  // منع إنشاء أكثر من نسخة
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
      if (event.results[i].isFinal || event.results[i][0].confidence > 0.4) {
        transcript += event.results[i][0].transcript + " ";
      }
    }
    
    if (transcript.trim()) {
      processSpokenText(transcript.trim());
    }
  };

  recognition.onerror = (event) => {
    console.warn("خطأ في التعرف الصوتي:", event.error);
    // بعض الأخطاء مثل 'not-allowed' تمنع إعادة التشغيل الفوري
    if (event.error === 'not-allowed') {
      window.isListeningActive = false;
      const msg = document.getElementById("msg");
      if (msg) msg.textContent = "يرجى السماح باستخدام الميكروفون لبدء التلاوة.";
    }
  };

  recognition.onend = () => {
    // إعادة التشغيل تلقائياً فوراً إذا كانت التلاوة نشطة لضمان عدم التوقف أبداً
    if (window.isListeningActive) {
      clearTimeout(restartTimeout);
      restartTimeout = setTimeout(() => {
        try {
          recognition.start();
          console. تم إعادة تشغيل الميكروفون في الخلفية بنجاح.");
        } catch (e) {
          // محاولة أخرى بعد ثانية في حال حدوث تداخل
          setTimeout(() => {
            try { recognition.start(); } catch (err) {}
          }, 1000);
        }
      }, 300);
    }
  };
}

// دالة مطابقة الكلمات والانتقال للكلمة التالية فوراً وبدقة
function processSpokenText(spokenText) {
  if (typeof words === "undefined" || !words.length) return;
  
  const spokenWords = spokenText.split(/\s+/);
  let currentPos = typeof pos !== "undefined" ? pos : 0;
  const startPoint = typeof basePos !== "undefined" ? basePos : 0;

  for (let sw of spokenWords) {
    let cleanSpoken = normalizeArabicText(sw);
    if (!cleanSpoken) continue;
    
    // البحث في الكلمات القادمة (نطاق 5 كلمات لضمان سرعة الاستجابة)
    for (let j = currentPos; j < Math.min(currentPos + 5, words.length); j++) {
      let cleanTarget = normalizeArabicText(words[j].n);
      
      // مطابقة ذكية ودقيقة
      if (cleanSpoken === cleanTarget || cleanTarget.includes(cleanSpoken) || cleanSpoken.includes(cleanTarget)) {
        if (typeof st !== "undefined") {
          st[j] = "ok";
        }
        // الانتقال الفوري للكلمة التالية
        currentPos = j + 1;
        break;
      }
    }
  }

  if (typeof pos !== "undefined") pos = currentPos;
  if (typeof render === "function") render();
}

// تنظيف النصوص العربية لمطابقة صوتية مرنة
function normalizeArabicText(str) {
  if (!str) return "";
  return str.replace(/[\u064B-\u065F\u0670]/g, "") // إزالة التشكيل
             .replace(/[إأآٱاى]/g, "ا")
             .replace(/ة/g, "ه")
             .trim();
}

// بدء التشغيل التلقائي عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
  initRecognition();
  window.isListeningActive = true;
  
  setTimeout(() => {
    try {
      recognition.start();
      const msg = document.getElementById("msg");
      if (msg) msg.textContent = "الميكروفون مستعد.. يمكنك البدء بالتلاوة الآن.";
    } catch (e) {
      console.warn("بدء الاستماع تلقائياً:", e);
    }
  }, 800);
});
