// ============================================================================
// Ratil - Main controller: starts the app
// (Reset, surah change, memorization, tajweed and tap-on-word are already handled
//  inside core.js / memorization.js / tajweed.js / audio.js, so they are NOT repeated here.)
// ============================================================================
function ratilStart() {
  // 1) Start the app
  load();
 
  // 2) Optional: user-management tools. Needs admin-users.js next to index.html
  //    (if the file does not exist the browser only shows a harmless 404 in the console).
  const adminUsersScript = document.createElement("script");
  adminUsersScript.src = "admin-users.js";
  adminUsersScript.defer = true;
  document.body.appendChild(adminUsersScript);
 
  // 3) Optional: hide the verses while reading, independent from memorization mode.
  //    Needs a checkbox with id="readingHideToggle" in index.html and the CSS rule shown in the notes.
  const readingHideToggle = document.getElementById("readingHideToggle");
  if (readingHideToggle) {
    readingHideToggle.addEventListener("change", (e) => {
      document.body.classList.toggle("reading-hide", e.target.checked);
    });
  }
}
 
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ratilStart);
else ratilStart();
 
