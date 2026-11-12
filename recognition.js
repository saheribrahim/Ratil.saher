// ============================================================================
// Ratil.saher - Smooth Recognition Integration
// ============================================================================

let recognition = null;
let isListening = false;
let finalTranscript = "";

function startSmoothRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    msg("التعرف الصوتي غير مدعوم في هذا المتصفح. استخدم متصفح Google Chrome.", true);
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "ar-SA";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3; // فحص أفضل 3 احتمالات للكلمة لضمان دقة المطابقة

  recognition.onstart = () => {
    isListening = true;
    if ($("mic")) {
      $("mic").textContent = "⏹ إيقاف الاستماع";
      $("mic").classList.add("rec");
    }
    msg("جاري الاستماع... اقرأ الآيات بثقة.");
  };

  recognition.onresult = event => {
    let interim = "";
    let candidates = [];

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) {
        finalTranscript += " " + res[0].transcript;
      } else {
        interim += res[0].transcript;
      }

      // جمع البدائل المتاحة لمحرك الصوت لتحسين نسبة النجاح
      for (let k = 0; k < res.length; k++) {
        candidates.push(res[k].transcript);
      }
    }

    // عرض النص المباشر للمستخدم
    const liveText = (finalTranscript + " " + interim).trim();
    if ($("live")) $("live").textContent = liveText;

    // تمرير الكلمات للتحقق والمطابقة الفورية
    if (typeof alignBest === "function" && candidates.length > 0) {
      const tokensList = candidates.map(t => t.split(/\s+/).map(w => norm(w)).filter(Boolean));
      alignBest(tokensList);
    }
  };

  recognition.onerror = event => {
    if (event.error !== "no-speech" && event.error !== "aborted") {
      msg("تنبيه في التعرف الصوتي: " + event.error, true);
    }
  };

  recognition.onend = () => {
    // إعادة التشغيل تلقائياً إذا انقطع الاتصال مؤقتاً ولم يضغط المستخدم إيقاف
    if (isListening) {
      try {
        recognition.start();
      } catch (e) {
        stopSmoothRecognition();
      }
    }
  };

  try {
    finalTranscript = "";
    recognition.start();
  } catch (err) {
    msg("تعذر تشغيل الميكروفون: " + err.message, true);
  }
}

function stopSmoothRecognition() {
  isListening = false;
  if (recognition) {
    try {
      recognition.stop();
    } catch (_) {}
  }
  if ($("mic")) {
    $("mic").textContent = "🎙 Start";
    $("mic").classList.remove("rec");
  }
  msg("توقف الاستماع.");
}

// ربط الزر بالتنفيذ السلس
if ($("mic")) {
  $("mic").onclick = () => {
    if (isListening) {
      stopSmoothRecognition();
    } else {
      startSmoothRecognition();
    }
  };
}
