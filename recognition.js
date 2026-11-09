// ============================================================================
// Ratil.saher - Smooth & Safe Mid-Surah Recognition Engine
// ============================================================================

const TH = { 
  strict: [.70, .52], 
  normal: [.60, .42], 
  lenient: [.50, .32] 
};

const MUQATTAAH_SET = new Set([
  "الم", "المص", "الر", "المر", "كهيعص", "طه", "طسم", "طس", "يس", "ص", "حم", "عسق", "ق", "ن"
]);
const MUQ_SURAHS = new Set([2,3,7,10,11,12,13,14,15,19,20,26,27,28,29,30,31,32,36,38,40,41,42,43,44,45,46,50,68]);

const LETTER_NAMES = {
  "ا": ["الف", "ا"], "ل": ["لام", "ل"], "م": ["ميم", "م"], "ص": ["صاد", "ص"],
  "ر": ["را", "راء", "ر"], "ك": ["كاف", "ك"], "ه": ["ها", "هاء", "ه"], "ي": ["يا", "ياء", "ي"],
  "ع": ["عين", "ع"], "ط": ["طا", "طاء", "ط"], "س": ["سين", "س"], "ح": ["حا", "حاء", "ح"],
  "ق": ["قاف", "ق"], "ن": ["نون", "ن"]
};

function isMuq(j) {
  const s = +$("surah").value, w = words[j];
  return !!w && MUQ_SURAHS.has(s) && MUQATTAAH_SET.has(w.n) && (w.v === 0 || (s === 42 && w.v === 1));
}

const sq = t => t.replace(/(.)\1+/g, "$1");
const ALL_NAMES = new Set(Object.values(LETTER_NAMES).flat().filter(x => x.length > 1).map(sq));
const nameOK = (tok, names) => names.includes(tok) ||
  (!ALL_NAMES.has(tok) && names.some(nm => nm.length >= 2 && tok.length >= 2 && sim(tok, nm) >= .52));

function muqMatch(rw, i, n) {
  if (!rw[i]) return 0;
  const targetNorm = normalizeArabic(n, false);
  const inputNorm = normalizeArabic(rw[i], false);

  if (inputNorm === targetNorm || sq(rw[i]) === sq(n)) return 1;

  const L = [...n];
  let k = i, ok = true;
  for (const ch of L) {
    const names = (LETTER_NAMES[ch] || [ch]).map(sq);
    if (k < rw.length && nameOK(sq(rw[k]), names)) {
      k++;
    } else {
      ok = false;
      break;
    }
  }
  if (ok) return k - i;

  const full = sq(L.map(ch => (LETTER_NAMES[ch] || [ch])[0]).join(""));
  for (let m = 1; m <= Math.min(L.length + 2, rw.length - i); m++) {
    const joined = sq(rw.slice(i, i + m).join(""));
    if (joined.length >= full.length * .55 && sim(joined, full) >= .62) return m;
  }
  return 0;
}

const forced = new Set();

function normalizeArabic(str, preserveTashkeel = false) {
  if (!str) return "";
  let cleaned = str.trim();
  if (!preserveTashkeel) {
    cleaned = cleaned.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
  }
  return cleaned
    .replace(/[إأآٱاىوؤيئ]/g, m => ({'إ':'ا','أ':'ا','آ':'ا','ٱ':'ا','ى':'ا','و':'و','ؤ':'و','ي':'ي','ئ':'ي'}[m]))
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/([اوي])\1+/g, "$1")
    .trim();
}

function enhancedSim(w1, w2) {
  if (!w1 || !w2) return 0;
  const aFull = normalizeArabic(w1, true), bFull = normalizeArabic(w2, true);
  if (aFull === bFull) return 1.0;

  const a = normalizeArabic(w1, false), b = normalizeArabic(w2, false);
  if (a === b) return 0.88;

  const strip = x => x.replace(/[ا\u0621]/g, "");
  const stretch = x => x.replace(/([اوي])+/g, "$1");
  
  return Math.max(sim(w1, w2), sim(a, b), 0.88 * sim(stretch(a), stretch(b)), 0.82 * sim(strip(stretch(a)), stretch(b)));
}

function trial(rw) {
  const [okT, nearT] = TH.strict;
  const s = baseSt.slice(), h = hd.slice(); 
  
  // نقطة البداية الفعالة (البدء من المنتصف بسلاسة)
  const startPoint = typeof basePos !== 'undefined' ? basePos : 0;
  let p = startPoint;

  for (let k = startPoint; k < h.length; k++) h[k] = "";
  const end = Math.min(typeof lim !== 'undefined' ? lim : words.length, words.length);
  
  const skipForced = () => { while (p < end && forced.has(p)) { s[p] = "ok"; h[p] = h[p] || "✓"; p++; } };
  skipForced();

  for (let i = 0; i < rw.length && p < end; i++) {
    let hit = -1, score = 0, used = 1;
    for (let j = p; j < Math.min(p + 5, end); j++) {
      let sc = 0, u = 1;
      if (isMuq(j)) {
        const n = muqMatch(rw, i, words[j].n);
        if (n > 0) { sc = 1; u = n; }
      } else {
        sc = enhancedSim(rw[i], words[j].n);
        if (i + 1 < rw.length) {
          const m = enhancedSim(rw[i] + rw[i + 1], words[j].n);
          if (m > sc + .03) { sc = m; u = 2; }
        }
      }
      if (sc >= nearT && sc > score) {
        hit = j; score = sc; used = u;
        if (sc >= 0.90) break;
      }
    }
    if (hit < 0) continue;

    // حماية الكلمات السابقة لنقطة البداية (تظل نظيفة بدون لون أحمر)
    for (let k = p; k < hit; k++) {
      if (k >= startPoint) s[k] = "miss";
    }
    
    const lab = score >= okT ? "ok" : "miss"; 
    s[hit] = lab;
    h[hit] = rw[i];
    if (lab === "ok") p = hit + 1;
    i += used - 1;

    skipForced();
  }

  while (p < end && s[p] === "ok") p++;
  let sc = 0;
  s.forEach((x, k) => { if (k >= startPoint && k < p) sc += x === "ok" ? 1 : x === "near" ? .5 : -.2; });
  return { s, p, h, sc };
}

function alignBest(cands) {
  let b = null;
  for (const rw of cands) {
    const r = trial(rw);
    if (!b || r.sc > b.sc) b = r;
  }
  if (b) { st = b.s; pos = b.p; hd = b.h; }
  render();
}

// التشغيل التلقائي المباشر للميكروفون
let internalRecognizer = null;

function requestMicAndStartAI() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  internalRecognizer = new SpeechRecognition();
  internalRecognizer.continuous = true;
  internalRecognizer.interimResults = true;
  internalRecognizer.lang = "ar-SA";

  internalRecognizer.onresult = (event) => {
    let candidates = [];
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript.trim();
      if (transcript) candidates.push(transcript.split(/\s+/));
    }
    if (candidates.length > 0) alignBest(candidates);
  };

  internalRecognizer.onend = () => {
    if (window.isListeningActive) {
      try { internalRecognizer.start(); } catch (e) {}
    }
  };

  window.isListeningActive = true;
  
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(() => { internalRecognizer.start(); })
    .catch((err) => { console.warn("ميكروفون:", err); });
}

document.addEventListener("DOMContentLoaded", () => {
  requestMicAndStartAI();
});
