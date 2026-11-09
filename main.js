// ============================================================================
// Ratil.saher - Main JavaScript Controller (Complete & Updated)
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // 1. بدء تشغيل التطبيق الأساسي
  if (typeof load === "function") {
    load();
  }

  // 2. حقن أدوات وإدارة المستخدمين
  const adminUsersScript = document.createElement("script");
  adminUsersScript.src = "admin-users.js";
  adminUsersScript.defer = true;
  document.body.appendChild(adminUsersScript);

  // 3. ربط قائمة اختيار السورة لتحميلها وعرض الآيات فـوراً
  const surahSelect = document.getElementById("surah");
  if (surahSelect) {
    surahSelect.addEventListener("change", (e) => {
      const selectedSurah = e.target.value;
      if (typeof loadSurah === "function") {
        loadSurah(selectedSurah);
      } else if (typeof render === "function") {
        render();
      }
    });
  }

  // تحميل السورة الأولى افتراضياً عند فتح التطبيق إذا لم تكن محملة
  if (typeof loadSurah === "function" && surahSelect && !surahSelect.value) {
    loadSurah(1);
  }

  // 4. تفعيل زر Reset وإعادة ضبط التلاوة
  const resetBtn = document.getElementById("reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (typeof basePos !== "undefined") basePos = 0;
      if (typeof pos !== "undefined") pos = 0;
      if (typeof st !== "undefined" && Array.isArray(st)) st.fill("");
      if (typeof hd !== "undefined" && Array.isArray(hd)) hd.fill("");
      
      if (typeof render === "function") {
        render();
      } else if (typeof updateStats === "function") {
        updateStats();
      }
      
      const msg = document.getElementById("msg");
      if (msg) {
        msg.textContent = "تم إعادة الضبط. يمكنك متابعة التلاوة.";
        msg.classList.remove("err");
      }
    });
  }

  // 5. تفعيل وإلغاء وضع إخفاء الآيات للقراءة (المستقل عن الحفظ)
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

  // 6. تفعيل وضع الحفظ الأساسي (Memorization Mode)
  const memToggle = document.getElementById("hide"); // ارتباطاً بالـ ID الموجود في HTML لديك
  if (memToggle) {
    memToggle.addEventListener("change", (e) => {
      if (e.target.checked) {
        document.body.classList.add("mem");
      } else {
        document.body.classList.remove("mem");
      }
    });
  }

  // 7. تفعيل أحكام التجويد
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

  // 8. إظهار الكلمة كـ Hint عند النقر عليها في وضع الحفظ
  const textContainer = document.getElementById("text");
  if (textContainer) {
    textContainer.addEventListener("click", (e) => {
      const wordEl = e.target.closest(".w");
      if (wordEl) {
        wordEl.classList.toggle("hint");
      }
    });
  }
});
