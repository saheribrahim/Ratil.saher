// ============================================================================
// Ratil.saher - Core JavaScript (Fixed: No auto-coloring)
// ============================================================================

const $ = id => document.getElementById(id);
const norm = s => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/[^\u0621-\u064A]/g, "");

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

// دالة المطابقة التسلسلية الصارمة
function alignBest(cands) {
  if (!words.length || !cands || !cands.length) return;
  for (const tokens of cands) {
    if (!tokens.length) continue;
    let matched = false;
    let p = pos;
    let tIdx = 0;
    
    while (p < words.length && tIdx < tokens.length) {
      if (sim(words[p].n, tokens[tIdx]) >= 0.68) {
        st[p] = "ok";
        pos = p + 1;
        matched = true;
        tIdx++;
        p++;
      } else {
        break; 
      }
    }
    
    if (matched) {
      render();
      break;
    }
  }
}

function load() {
  const verses = ((LIB[$("riwaya").value] || {})[$("surah").value] || []);
  words = [];
  lines = [];
  const box = $("text");
  box.innerHTML = "";
  
  verses.forEach((v, vi) => {
    const line = document.createElement("span");
    line.className = "v";
    lines[vi] = line;
    v.split(/\s+/).filter(Boolean).forEach(t => {
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
  render();
}

function render() {
  let ok = 0, near = 0, miss = 0;
  
  words.forEach((w, i) => {
    // تلوين الكلمة الحالية (.cur) فقط إذا كان الاستماع يعمل، وإلا تبقى الكلمات طبيعية
    w.el.className = "w " + st[i] + (i === pos && listening ? " cur" : "");
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
  if ($("gt")) $("gt").textContent = !tot ? "ابدأ التلاوة لتظهر نتيجتك · Start reciting to see your score" : acc >= 85 ? "🟢 " + acc + "% ممتاز — استمر · Excellent" : acc >= 60 ? "🟡 " + acc + "% جيد — راجع الكلمات الحمراء · Good, review the red words" : "🔴 " + acc + "% حسّن نفسك — راجع وكرّر · Keep practicing";
  
  if (listening && words[pos]) words[pos].el.scrollIntoView({ block: "center", behavior: "smooth" });
  
  const memOn = typeof window.memOn !== "undefined" ? window.memOn : false;
  if ($("text")) {
    $("text").classList.toggle("mem", memOn);
    if ($("mMask")) $("text").classList.toggle("fl", $("mMask").value === "fl");
    if ($("tjw")) $("text").classList.toggle("tj", $("tjw").checked);
  }
}

function msg(t, err) {
  const m = $("msg");
  if (m) {
    m.textContent = t;
    m.className = err ? "err" : "";
  }
}

function start() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    msg("Speech recognition isn’t supported in this browser. Try Chrome or Safari.", true);
    return;
  }
  listening = true;
  if ($("mic")) {
    $("mic").textContent = "⏹ Stop";
    $("mic").classList.add("rec");
  }
  msg("Listening… start reciting.");
  spawn(SR);
}

function spawn(SR) {
  rec = new SR();
  rec.lang = "ar-SA";
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  
  rec.onresult = e => {
    if (typeof busy !== "undefined" && busy) return;
    const cands = [0, 1, 2].map(k => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        t += " " + (r[k] || r[0]).transcript;
      }
      return t;
    }).filter((t, i, a) => a.indexOf(t) === i);
    
    if ($("live")) $("live").textContent = cands[0].trim();
    alignBest(cands.map(t => t.split(/\s+/).map(norm).filter(Boolean)));
    if (typeof memCheck === "function") memCheck();
  };
  
  rec.onerror = e => {
    if (e.error !== "no-speech" && e.error !== "aborted") {
      msg("Recognition error: " + e.error, true);
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

// التحكم المتبادل الحصري للأزرار
document.addEventListener("DOMContentLoaded", () => {
  const readingHideToggle = $("readingHideToggle");
  const memToggleEl = $("hide");

  if (readingHideToggle && memToggleEl) {
    readingHideToggle.onchange = () => {
      if (readingHideToggle.checked) {
        memToggleEl.checked = false;
        document.body.classList.remove("mem");
        if (typeof memOn !== "undefined") memOn = false;
      }
      if (readingHideToggle.checked) {
        document.body.classList.add("reading-hide");
      } else {
        document.body.classList.remove("reading-hide");
      }
      render();
    };

    memToggleEl.onchange = () => {
      if (memToggleEl.checked) {
        readingHideToggle.checked = false;
        document.body.classList.remove("reading-hide");
      }
      if (typeof memToggle === "function") memToggle();
      render();
    };
  }
});

if ($("mic")) $("mic").onclick = () => listening ? stop() : start();
if ($("reset")) $("reset").onclick = () => { stop(); if ($("live")) $("live").textContent = ""; load(); msg("Reset. Tap Start when ready."); };
if ($("surah")) $("surah").onchange = () => { stop(); if ($("live")) $("live").textContent = ""; load(); };
