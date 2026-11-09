// ============================================================================
// Ratil.saher - Full Verse Recognition & Correction Engine
// ============================================================================

let recognition = null;
window.isListeningActive = false;

function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("متصفحك لا يدعم التعرف الصوتي.");
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
      checkFullVerse(transcript.trim());
    }
  };

  recognition.onerror = (event) => {
    console.warn("خطأ في التعرف الصوتي:", event.error);
  };

  recognition.onend = () => {
    if (window.isListeningActive) {
      setTimeout(() => {
        try { recognition.start(); } catch (e) {}
      }, 300);
    }
  };
}

// دالة فحص وتصحيح الآية كاملة عند نطقها
function checkFullVerse(spokenText) {
  if (typeof words === "undefined" || !words.length) return;
  
  let currentPos = typeof pos !== "undefined" ? pos : 0;
  
  // استخراج كلمات الآية الحالية فقط من مصفوفة الكلمات
  let currentVerseNum = words[currentPos] ? words[currentPos].v : 0;
  let verseWords = [];
  let verseIndices = [];
  
  for (let i = 0; i < words.length; i++) {
    if (words[i].v === currentVerseNum) {
      verseWords.push(normalizeArabicText(words[i].n));
      verseIndices.push(i);
    } else if (verseWords.length > 0) {
      break; // انتهت الآية الحالية
    }
  }

  if (verseWords.length === 0) return;

  // تنظيف النص المقروء للمقارنة
  let cleanSpoken = normalizeArabicText(spokenText);
  let targetVerseText = verseWords.join(" ");

  // التحقق مما إذا كانت الآية قد نُطقت بشكل صحيح ومتقارب
  let matchScore = calculateSimilarity(cleanSpoken, targetVerseText);

  // إذا كانت نسبة التطابق جيدة، نعتبر الآية صحيحة وننتقل للآية التي تليها مباشرة
  if (matchScore >= 0.55 || cleanSpoken.includes(targetVerseText) || targetVerseText.includes(cleanSpoken)) {
    // تلوين جميع كلمات الآية الحالية باللون الصحيح (ok)
    verseIndices.forEach(idx => {
      if (typeof st !== "undefined") {
        st[idx] = "ok";
      }
    });

    // الانتقال الفوري لأول كلمة في الآية التالية
    let nextVersePos = verseIndices[verseIndices.length - 1] + 1;
    if (typeof pos !== "undefined") pos = nextVersePos;
    if (typeof basePos !== "undefined") basePos = nextVersePos;
    
    if (typeof render === "function") render();
  }
}

// دالة حساب نسبة التشابه البسيطة بين النصوص
function calculateSimilarity(str1, str2) {
  let set1 = new Set(str1.split(" "));
  let set2 = new Set(str2.split(" "));
  let intersection = [...set1].filter(x => set2.has(x));
  return intersection.length / Math.max(set1.size, set2.size);
}

// تنظيف النصوص العربية للمقارنة الدقيقة
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
    } catch (e) {
      console.warn("تعذر بدء الميكروفون تلقائياً:", e);
    }
  }, 1000);
});
