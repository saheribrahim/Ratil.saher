// ============================================================================
// Ratil.saher - Final Fixed Main Controller & Styling Injection
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  if (typeof load === "function") {
    load();
  }

  // 1. تعبئة قائمة السور تلقائياً إذا كانت فارغة لضمان ظهورها وتفعيلها
  const surahSelect = document.getElementById("surah");
  setTimeout(() => {
    if (surahSelect && surahSelect.options.length <= 1) {
      if (typeof surahs !== "undefined" && Array.isArray(surahs)) {
        surahs.forEach((s, idx) => {
          const opt = document.createElement("option");
          opt.value = idx + 1;
          opt.textContent = s.name || `سورة ${idx + 1}`;
          surahSelect.appendChild(opt);
        });
      }
    }
  }, 100);

  // 2. ربط اختيار السورة وتغييرها بشكل صحيح ودقيق
  if (surahSelect) {
    surahSelect.addEventListener("change", (e) => {
      const idx = parseInt(e.target.value, 10);
      
      // تجربة كل الدوال المحتملة لتغيير السورة في مشروعك
      if (typeof changeSurah === "function") {
        changeSurah(idx);
      } else if (typeof loadSurah === "function") {
        loadSurah(idx);
      } else if (typeof selectSurah === "function") {
        selectSurah(idx);
      } else if (typeof render === "function") {
        if (typeof currentSurah !== "undefined") currentSurah = idx;
        render();
      }
    });
  }

  // 3. تفعيل زر إخفاء القراءة بشكل مستقل تماماً
  const readingHideToggle = document.getElementById("readingHideToggle");
  if (readingHideToggle) {
    readingHideToggle.addEventListener("change", (e) => {
      if (e.target.checked) {
        document.body.classList.add("reading-hide");
      } else {
        document.body.classList.remove("reading-hide");
      }
    });
  }

  // 4. تفعيل وضع الحفظ Memorization Mode
  const memToggle = document.getElementById("hide");
  if (memToggle) {
    memToggle.addEventListener("change", (e) => {
      if (e.target.checked) {
        document.body.classList.add("mem");
      } else {
        document.body.classList.remove("mem");
      }
    });
  }

  // 5. تفعيل أحكام التجويد
  const tjToggle = document.getElementById("tjw");
  if (tjToggle) {
    tjToggle.addEventListener("change", (e) => {
      if (e.target.checked) {
        document.body.classList.add("tj");
      } else {
        document.body.classList.remove("tj");
      }
    });
  }

  // 6. تفعيل زر Reset
  const resetBtn = document.getElementById("reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (typeof basePos !== "undefined") basePos = 0;
      if (typeof pos !== "undefined") pos = 0;
      if (typeof render === "function") render();
    });
  }
});

// حقن كود CSS الخاص بوضع إخفاء القراءة مباشرة لتجنب أي مشاكل في الملفات
const styleTag = document.createElement("style");
styleTag.textContent = `
  body.reading-hide #text .w:not(.cur) {
    filter: blur(6px);
    opacity: 0.3;
    transition: filter 0.2s, opacity 0.2s;
  }
  body.reading-hide #text .w.cur {
    filter: none;
    opacity: 1;
  }
`;
document.head.appendChild(styleTag);
