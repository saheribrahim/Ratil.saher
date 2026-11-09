// ============================================================================
// Ratil.saher - Main JavaScript Controller
// ============================================================================

// Start the app
load();

// Add user search and removal controls to the existing admin panel.
const adminUsersScript = document.createElement("script");
adminUsersScript.src = "admin-users.js";
adminUsersScript.defer = true;
document.body.appendChild(adminUsersScript);

// تفعيل زر Reset وإعادة ضبط التلاوة عند النقر عليه
document.addEventListener("DOMContentLoaded", () => {
  const resetBtn = document.getElementById("reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      // 1. تصفير نقاط التتبع والمواضع
      if (typeof basePos !== "undefined") basePos = 0;
      if (typeof pos !== "undefined") pos = 0;
      if (typeof st !== "undefined" && Array.isArray(st)) st.fill("");
      if (typeof hd !== "undefined" && Array.isArray(hd)) hd.fill("");
      
      // 2. إعادة رسم واجهة المصحف وتحديث الإحصائيات
      if (typeof render === "function") {
        render();
      } else if (typeof updateStats === "function") {
        updateStats();
      }
      
      // 3. رسالة تأكيد خفيفة أو تحديث حالة الميكروفون
      const msg = document.getElementById("msg");
      if (msg) {
        msg.textContent = "تم إعادة الضبط. يمكنك متابعة التلاوة.";
        msg.classList.remove("err");
      }
    });
  }
});
