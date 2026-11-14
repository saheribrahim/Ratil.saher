// ============================================================================
// Ratil.saher - Core JavaScript (Fixed Tajweed & Strict Sequential Matching)
// ============================================================================

const $ = id => document.getElementById(id);
const norm = s => String(s || "")
  .normalize("NFC")
  .replace(/[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640]/g, "")
  .replace(/[أإآٱ]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/[^\\u0621-\\u064A]/g, "");

function sim(a, b) {
  if (a === b) return 1;
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  let p = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let c = [i];
    for (let j = 1; j <= n; j++) {
      c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    p = c;
  }
  return 1 - p[n] / Math.max(m, n);
}

const ad = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
let words = [], st = [], pos = 0, baseSt = [], basePos = 0, rec = null, listening = false;

function htmlOf(i) {
  return words[i] ? words[i].t : "";
}

// تجاهل الكلمات المكررة من نهاية المقطع السابق، دون تخطي الكلمة الحالية.
function isRecentConfirmedToken(token, cursor) {
  const from = Math.max(0, cursor - 3);
  for (let i = from; i < cursor; i++) {
    if (words[i] && words[i].n === token && st[i] === "ok") return true;
  }
  return false;
}

// مطابقة تسلسلية: لا نتقدم إلا عند تطابق الكلمة الحالية، مع معالجة تداخل المقاطع.
function alignBest(cands) {
  if (!words.length || !Array.isArray(cands) || !cands.length) return;

  let selected = null;
  let selectedScore = -Infinity;

  for (const rawTokens of cands) {
    const tokens = (rawTokens || []).map(norm).filter(Boolean);
    if (!tokens.length) continue;

    let cursor = pos;
    let matched = 0;
    let overlap = 0;
    let mismatch = false;

    for (const token of tokens) {
      if (cursor >= words.length) break;
      if (token === words[cursor].n) {
        matched++;
        cursor++;
      } else if (isRecentConfirmedToken(token, cursor)) {
        overlap++;
      } else {
        mismatch = true;
        break;
      }
    }

    const score = matched * 100 + overlap * 2 - (mismatch ? 40 : 0);
    if (score > selectedScore) {
      selectedScore = score;
      selected = tokens;
    }
  }

  if (!selected) return;

  let cursor = pos;
  let changed = false;

  for (const token of selected) {
    if (cursor >= words.length) break;

    if (token === words[cursor].n) {
      st[cursor] = "ok";
      cursor++;
      changed = true;
      continue;
    }

    if (isRecentConfirmedToken(token, cursor)) continue;

    const score = sim(words[cursor].n, token);
    st[cursor] = score >= 0.72 ? "near" : "miss";
    changed = true;
    break;
  }

  if (changed) {
    pos = cursor;
    render();
  }
}

window.alignBest = alignBest;

// تحميل الآيات
function load() {
  const verses = ((LIB[$("riwaya").value] || {})[$("surah").value] || []);
  words = [];
  const box = $("text");
  if (!box) return;
  box.innerHTML = "";
  
  verses.forEach((v, vi) => {
    const line = document.createElement("span");
    line.className = "v";
    v.replace(/[\u200B\u2060\uFEFF\u00A0\u202F]/g, " ").split(/\s+/).filter(Boolean).forEach(t => {
      const n = norm(t);
      if (!n && words.length && words[words.length - 1].el.parentNode === line) {
        words[words.length - 1].t += t;
        words[words.length - 1].el.textContent += t;
        return;
      }
      const s = document.createElement("span");
      s.className = "w todo";
      s.textContent = t;
      line.appendChild(s);
      line.appendChild(document.createTextNode(" "));
      words.push({ el: s, n, t, v: vi });
    });
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = "۝" + ad(vi + 1);
    line.appendChild(num);
    box.appendChild(line);
  });
  
  st = words.map(() => "todo");
  pos = 0;
  if (typeof paint === "function") paint();
  if (typeof memReset === "function") memReset();
  render();
}

// تحديث حالة الكلمات والواجهة مع تفعيل التجويد بشكل دائم عند اختيار الزر
function render() {
  let ok = 0, near = 0, miss = 0;
  
  words.forEach((w, i) => {
    const hintIdx = typeof window.hintIdx !== "undefined" ? window.hintIdx : -1;
    const memOn = typeof window.memOn !== "undefined" ? window.memOn : false;

    w.el.className = "w " + st[i] + (i === pos && listening ? " cur" : "") + (i === hintIdx ? " hint" : "");
    w.el.innerHTML = htmlOf(i);

    if (st[i] === "ok") ok++;
    else if (st[i] === "near") near++;
    else if (st[i] === "miss") miss++;
  });

  if ($("sOk")) $("sOk").textContent = ok;
  if ($("sNear")) $("sNear").textContent = near;
  if ($("sMiss")) $("sMiss").textContent = miss;
  if ($("sPct")) $("sPct").textContent = (words.length ? Math.round(pos / words.length * 100) : 0) + "%";
  
  const tot = ok + near + miss;
  const acc = tot ? Math.round((ok + near * .5) / tot * 100) : 0;
  if ($("gm")) $("gm").style.left = (tot ? acc : 0) + "%";
  if ($("gt")) $("gt").textContent = !tot ? "ابدأ التلاوة لمتابعة المطابقة النصية" : "مؤشر المطابقة النصية: " + acc + "% — لا يقيّم التجويد الصوتي";
  
  if (listening && words[pos]) words[pos].el.scrollIntoView({ block: "center", behavior: "smooth" });

  // Reapply tajweed markup after render updates word states.
  if ($("tjw") && $("tjw").checked && typeof paint === "function") paint();
  
  // تفعيل أو إلغاء تفعيل خصائص التجويد والحفظ على حاوية النص الرئيسية
  const memOn = typeof window.memOn !== "undefined" ? window.memOn : false;
  if ($("text")) {
    $("text").classList.toggle("mem", memOn && window.memPhase === "recite" && !window.memReviewVisible);
    if ($("mMask")) $("text").classList.toggle("fl", $("mMask").value === "fl");
    
    // ربط زر أحكام التجويد بصرياً بشكل مباشر
    const tjCheckbox = $("tjw");
    if (tjCheckbox) {
      $("text").classList.toggle("tj", tjCheckbox.checked);
    }
  }
}

function msg(t, err) {
  const m = $("msg");
  if (m) {
    m.textContent = t;
    m.className = err ? "err" : "";
  }
}

// بدء التعرف الصوتي
function start() {
  listening = true;
  if ($("mic")) {
    $("mic").textContent = "⏹ Stop";
    $("mic").classList.add("rec");
  }
  if (window.RatilQuranAI) {
    msg("جارٍ تشغيل نموذج التعرّف القرآني على جهازك...");
    window.RatilQuranAI.start().catch(error => {
      console.error(error);
      if (listening) stop();
      msg(error && error.message ? error.message : "تعذّر تشغيل نموذج التعرّف القرآني.", true);
    });
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    listening = false;
    msg("التعرّف الصوتي غير مدعوم في هذا المتصفح.", true);
    return;
  }
  msg("Listening… start reciting.");
  spawn(SR);
}

function spawn(SR) {
  baseSt = st.slice();
  basePos = pos;
  rec = new SR();
  rec.lang = "ar-SA";
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  
  rec.onresult = e => {
    let interim = "";
    let candidates = [];
    let finalCandidates = [];
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const alternatives = [];
      for (let k = 0; k < res.length; k++) {
        candidates.push(res[k].transcript);
        alternatives.push(res[k].transcript);
      }
      if (!res.isFinal) interim += res[0].transcript;
      else finalCandidates.push(alternatives);
    }
    if ($("live") && interim.trim()) $("live").textContent = interim.trim();
    if (window.memOn) {
      if (window.memAttemptActive) {
        finalCandidates.forEach(items => {
          if (typeof window.memHandleCandidates === "function") window.memHandleCandidates(items);
          else if (typeof window.memHandleTranscript === "function") window.memHandleTranscript(items[0] || "");
        });
      }
    } else {
      alignBest(candidates.map(t => t.split(/\s+/).map(norm).filter(Boolean)));
    }
  };
  rec.onerror = e => {
    if (e.error !== "no-speech" && e.error !== "aborted") {
      msg(window.memOn
        ? "تعذّر التعرف على التلاوة من الميكروفون (" + e.error + "). تحقق من إذن الميكروفون والإنترنت ثم أعد المحاولة."
        : "Recognition error: " + e.error, true);
    }
  };
  
  rec.onend = () => {
    if (listening) {
      try { spawn(SR); } catch (_) { stop(); }
    }
  };
  
  try {
    rec.start();
  } catch (err) {
    msg("Couldn’t start the microphone: " + err.message, true);
    stop();
  }
  render();
}

function stop() {
  listening = false;
  if (window.RatilQuranAI) window.RatilQuranAI.stop();
  if (rec) {
    rec.onend = null;
    try { rec.stop(); } catch (_) {}
  }
  if ($("mic")) {
    $("mic").textContent = "🎙 Start";
    $("mic").classList.remove("rec");
  }
  render();
  if (pos >= words.length) msg("Finished. Tap Reset to try again.");
}

if ($("mic")) $("mic").onclick = () => listening ? stop() : start();
if ($("reset")) $("reset").onclick = () => { stop(); if ($("live")) $("live").textContent = ""; load(); msg("Reset. Tap Start when ready."); };
if ($("surah")) $("surah").onchange = () => { stop(); if ($("live")) $("live").textContent = ""; load(); };
