// ============================================================================
// Ratil.saher - Full Verse Recognition Engine & Manual Start
// ============================================================================

let recognition = null;
window.isListeningActive = false;

function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("متصفحك لا يدعم التعرف الصوتي المباشر.");
    const msg = document.getElementById("msg");
    if (msg) msg.textContent = "يرجى استخدام متصفح Google Chrome لتعمل التلاوة بشكل صحيح.";
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
    console.warn("ملاحظة الميكروفون:", event.error);
    if (event.error === 'not-allowed') {
      const msg = document.getElementById("msg");
      if (msg) msg.textContent = "يرجى السماح بالوصول للميكروفون من أعلى شريط العنوان.";
    }
  };

  recognition.onend = () => {
    if (window.isListeningActive) {
      setTimeout(() => {
        try { recognition.start(); } catch (e) {}
      }, 300);
    }
  };
}

// دالة فحص وتصحيح الآية كاملة عند الاستماع إليها
function checkFullVerse(spokenText) {
  if (typeof words === "undefined" || !words.length) return;
  
  let currentPos = typeof pos !== "undefined" ? pos : 0;
  let currentVerseNum = words[currentPos] ? words[currentPos].v : 0;
  
  let verseWords = [];
  let verseIndices = [];
  
  for (let i = 0; i < words.length; i++) {
    if (words[i].v === currentVerseNum) {
      verseWords.push(normalizeArabicText(words[i].n));
      verseIndices.push(i);
    } else if (verseWords.length > 0) {
      break;
    }
  }

  if (verseWords.length === 0) return;

  let cleanSpoken = normalizeArabicText(spokenText);
  let targetVerseText = verseWords.join(" ");

  // مقارنة نطق الآية
  if (cleanSpoken.includes(targetVerseText) || targetVerseText.includes(cleanSpoken) || calculateSimilarity(cleanSpoken, targetVerseText) >= 0.50) {
    verseIndices.forEach(idx => {
      if (typeof st !== "undefined") {
        st[idx] = "ok";
      }
    });

    let nextVersePos = verseIndices[verseIndices.length - 1] + 1;
    if (typeof pos !== "undefined") pos = nextVersePos;
    if (typeof basePos !== "undefined") basePos = nextVersePos;
    
    if (typeof render === "function") render();
  }
}

function calculateSimilarity(str1, str2) {
  let set1 = new Set(str1.split(" "));
  let set2 = new Set(str2.split(" "));
  let intersection = [...set1].filter(x => set2.has(x));
  return intersection.length / Math.max(set1.size, set2.size);
}

function normalizeArabicText(str) {
  if (!str) return "";
  return str.replace(/[\u064B-\u065F\u0670]/g, "")
             .replace(/[إأآٱاىوؤيئ]/g, m => ({'إ':'ا','أ':'ا','آ':'ا','ٱ':'ا','ى':'ا','و':'و','ؤ':'و','ي':'ي','ئ':'ي'}[m]))
             .replace(/ة/g, "ه")
             .trim();
}

// ربط زر Start بالتشغيل اليدوي للميكروفون
document.addEventListener("DOMContentLoaded", () => {
  initRecognition();
  
  const startBtn = document.getElementById("start");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      window.isListeningActive = true;
      try {
        recognition.start();
        const msg = document.getElementById("msg");
        if (msg) msg.textContent = "جاري الاستماع.. اقرأ الآية كاملة لتصحيحها وتتبعها.";
      } catch (e) {
        console.log("الميكروفون يعمل بالفعل");
      }
    });
  }
});
