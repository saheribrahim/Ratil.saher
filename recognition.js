// ============================================================================
// Ratil.saher - Tarteel.ai Matching Engine (Exact Architecture)
// ============================================================================

let recognitionInstance = null;
let isListeningActive = false;

// 1. تطبيع النص القرآني (مطابق لمعيار ترتيل لتجاهل الفروقات الإملائية والتشكيل)
function tarteelExactNormalize(text) {
  if (!text) return "";
  return text
    .trim()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "") // إزالة التشكيل والمدود بالكامل
    .replace(/[أإآٱوإؤ]/g, "ا") // توحيد صور الألف
    .replace(/ى/g, "ي") // توحيد الألفات المقصورة
    .replace(/ة/g, "ه") // توحيد الهاء التاء المربوطة
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\u0621-\u064A]/g, ""); // الحفاظ على الحروف العربية فقط وإزالة الرموز
}

// 2. خوارزمية قياس نسبة التطابق الصوتي والنصي (Levenshtein Similarity)
function getTarteelSimilarity(str1, str2) {
  if (str1 === str2) return 1.0;
  const len1 = str1.length, len2 = str2.length;
  if (!len1 || !len2) return 0.0;
  
  let matrix = Array.from({ length: len2 + 1 }, (_, i) => [i]);
  for (let j = 0; j <= len1; j++) matrix[0][j] = j;

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      const cost = str1[j - 1] === str2[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return 1.0 - matrix[len2][len1] / Math.max(len1, len2);
}

// 3. محرك المواءمة والتتبع الدقيق (Tarteel Sequential Alignment Pipeline)
function processTarteelRecognition(transcriptTokens) {
  if (!window.words || !window.words.length || !transcriptTokens.length) return;

  let hasMatched = false;

  for (const token of transcriptTokens) {
    const cleanToken = tarteelExactNormalize(token);
    if (!cleanToken) continue;

    // تحديد الموضع الحالي للبحث الصارم (تسلسلي بدون قفزات عشوائية لمنتصف السورة)
    let currentPosition = typeof window.pos !== "undefined" ? window.pos : 0;
    let scanWindowLimit = Math.min(currentPosition + 3, window.words.length);

    for (let i = currentPosition; i < scanWindowLimit; i++) {
      const targetWord = window.words[i];
      const similarityScore = getTarteelSimilarity(targetWord.n, cleanToken);

      // إذا كانت نسبة الشبه تتجاوز 70% (معيار الدقة العالية في ترتيل)
      if (similarityScore >= 0.70) {
        window.st[i] = "ok";
        window.pos = i + 1; // التحرك تلقائياً للكلمة التالية بالترتيب
        hasMatched = true;
        break;
      }
    }
  }

  // تحديث واجهة المستخدم فوراً عند نجاح المطابقة
  if (hasMatched && typeof render === "function") {
    render();
  }
}

// 4. إدارة الميكروفون والاستماع المستمر (Continuous Stream)
function startTarteelRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    if (typeof msg === "function") msg("عذراً، متصفحك لا يدعم التعرف الصوتي. يرجى استخدام متصفح Google Chrome.", true);
    return;
  }

  isListeningActive = true;
  recognitionInstance = new SpeechRec();
  recognitionInstance.lang = "ar-SA";
  recognitionInstance.continuous = true;
  recognitionInstance.interimResults = true;
  recognitionInstance.maxAlternatives = 5; // جلب أكبر عدد ممكن من البدائل الصوتية لزيادة دقة التقاط الكلمات

  recognitionInstance.onresult = (event) => {
    let activeTranscript = "";
    const collectedCandidates = [];

    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      for (let alt = 0; alt < res.length; alt++) {
        if (alt < 3) {
          collectedCandidates.push(res[alt].transcript);
        }
      }
    }

    if (collectedCandidates.length > 0) {
      activeTranscript = collectedCandidates[0];
      if ($("live")) $("live").textContent = activeTranscript;

      // تقسيم النص المنطوق إلى كلمات وفلترتها بالمعيار الجديد
      const spokenTokens = activeTranscript.split(/\s+/).map(tarteelExactNormalize).filter(Boolean);
      processTarteelRecognition(spokenTokens);
    }
  };

  recognitionInstance.onerror = (e) => {
    console.error("Tarteel Recognition Error:", e.error);
    if (e.error === "not-allowed") {
      if (typeof msg === "function") msg("تم رفض إذن الميكروفون. يرجى السماح له من إعدادات المتصفح.", true);
      stopTarteelRecognition();
    }
  };

  recognitionInstance.onend = () => {
    // الحفاظ على استمرارية الاستماع دون توقف (Continuous Listening Loop)
    if (isListeningActive) {
      try {
        recognitionInstance.start();
      } catch (err) {
        console.error("Restart error:", err);
      }
    }
  };

  try {
    recognitionInstance.start();
  } catch (err) {
    console.error("Start error:", err);
  }
}

function stopTarteelRecognition() {
  isListeningActive = false;
  if (recognitionInstance) {
    recognitionInstance.onend = null;
    try {
      recognitionInstance.stop();
    } catch (err) {}
  }
}
