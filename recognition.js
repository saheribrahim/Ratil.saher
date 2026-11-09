// Recognition matching: Strict Tashkeel, State Locking, Connected Muqatta'ah & Normal Hide Mode for Ratil.saher
const TH = { strict: [.92, .80], normal: [.78, .58], lenient: [.65, .45] };

// ---------- Huruf Muqatta'ah ----------
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
  (!ALL_NAMES.has(tok) && names.some(nm => nm.length >= 3 && tok.length >= 2 && sim(tok, nm) >= .65));

// Strict connected Muqatta'ah matcher
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
    if (joined.length >= full.length * .8 && sim(joined, full) >= .80) return m;
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

  let normalized = cleaned
    .replace(/[إأآٱا]/g, "ا")
    .replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ـ/g, "")
    .replace(/(.)\1{2,}/g, "$1$1")
    .trim();

  const sunLetters = /[تثدذرزسصضطظلن]/;
  if (normalized.startsWith("ال") && normalized.length > 3 && sunLetters.test(normalized[2])) {
    normalized = normalized.slice(2);
  }
  return normalized;
}

function enhancedSim(w1, w2) {
  if (!w1 || !w2) return 0;
  const aFull = normalizeArabic(w1, true), bFull = normalizeArabic(w2, true);
  if (aFull === bFull) return 1.0;

  const a = normalizeArabic(w1, false), b = normalizeArabic(w2, false);
  if (a === b) return 0.95;

  const strip = x => x.replace(/[ا\u0621]/g, "");
  const stretch = x => x.replace(/([اوي])\1+/g, "$1");
  return Math.max(sim(w1, w2), sim(a, b), 0.95 * sim(stretch(a), stretch(b)), 0.90 * sim(strip(stretch(a)), strip(stretch(b))));
}

function verseIsRepeatedCorrectly(start, end, rw, threshold) {
  for (let i = 0; i < rw.length; i++) {
    let cursor = i, matched = true;
    for (let j = start; j < end; j++) {
      const w = words[j];
      if (!w.n) { matched = false; break; }
      let best = -1, bestScore = 0, bestUsed = 1;
      for (let q = cursor; q < Math.min(cursor + 5, rw.length); q++) {
        let sc = 0, u = 1;
        if (isMuq(j)) { const n = muqMatch(rw, q, w.n); if (n > 0) { sc = 1; u = n; } }
        else sc = enhancedSim(w.n, rw[q]);
        if (sc > bestScore) { bestScore = sc; best = q; bestUsed = u; }
      }
      if (best < 0 || bestScore < threshold) { matched = false; break; }
      cursor = best + bestUsed;
    }
    if (matched) return true;
  }
  return false;
}

function trial(rw) {
  const [okT, nearT] = TH.strict;
  const s = baseSt.slice(), h = hd.slice(); let p = basePos;
  for (let k = basePos; k < h.length; k++) h[k] = "";
  const end = Math.min(lim, words.length);
  const skipForced = () => { while (p < end && forced.has(p)) { s[p] = "ok"; h[p] = h[p] || "✓"; p++; } };
  skipForced();

  for (let i = 0; i < rw.length && p < end; i++) {
    const verse = words[p].v;
    let verseStart = p, verseEnd = p + 1;
    while (verseStart > 0 && words[verseStart - 1].v === verse) verseStart--;
    while (verseEnd < end && words[verseEnd].v === verse) verseEnd++;

    let hit = -1, score = 0, used = 1;
    for (let j = p; j < Math.min(p + 6, verseEnd); j++) {
      let sc = 0, u = 1;
      if (isMuq(j)) {
        const n = muqMatch(rw, i, words[j].n);
        if (n > 0) { sc = 1; u = n; }
      } else {
        sc = enhancedSim(rw[i], words[j].n);
        if (i + 1 < rw.length) {
          const m = enhancedSim(rw[i] + rw[i + 1], words[j].n);
          if (m > sc + .05) { sc = m; u = 2; }
        }
        if (j + 1 < verseEnd && !isMuq(j + 1)) {
          const m = enhancedSim(rw[i], words[j].n + words[j + 1].n);
          if (m >= .80 && m > sc) { sc = m; u = -2; }
        }
      }
      if (sc >= nearT && sc > score + (j > p ? .05 : 0)) {
        hit = j; score = sc; used = u;
        if (sc >= 0.99) break;
      }
    }
    if (hit < 0) continue;

    for (let k = p; k < hit; k++) s[k] = "miss";
    
    const lab = score >= okT ? "ok" : "miss"; 
    
    if (used === -2) {
      s[hit] = s[hit + 1] = lab;
      h[hit] = h[hit + 1] = rw[i];
      if (lab === "ok") p = hit + 2;
    } else {
      s[hit] = lab;
      h[hit] = rw[i];
      if (lab === "ok") p = hit + 1;
      i += used - 1;
    }

    let firstUnfinished = -1;
    for (let k = verseStart; k < verseEnd; k++) {
      if (s[k] !== "ok") { firstUnfinished = k; break; }
    }
    if (firstUnfinished !== -1) {
      p = firstUnfinished;
      break;
    }

    skipForced();
  }

  while (p < end && s[p] === "ok") p++;
  let sc = 0;
  s.forEach((x, k) => { if (k >= basePos && k < p) sc += x === "ok" ? 1 : x === "near" ? .5 : -.2; });
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

function htmlOf(i) {
  const w = words[i];
  
  // التحقق الفعّال من زر إخفاء الكلمات العادي وإخفاء الكلمة إذا لم يتم نطقها بشكل صحيح (ok)
  const hideCheckbox = document.getElementById("hideNormal");
  const isNormalHide = hideCheckbox && hideCheckbox.checked;
  
  if (isNormalHide && st[i] !== "ok") {
    return '<span style="filter: blur(6px); opacity: 0.15; user-select: none; background: rgba(255,255,255,0.08); border-radius: 4px; padding: 0 6px;">ُٔـ</span>';
  }

  if ($("tjw") && $("tjw").checked) {
    const nx = words[i + 1] && words[i + 1].v === w.v ? words[i + 1].t : "";
    return tj(w.t, nx);
  }
  return w.t;
}

const fl = t => ((t.match(/[\u0621-\u064A\u0671][^\u0621-\u064A\u0671]*/) || [t])[0]) + "…";

// تفعيل استجابة التبديل الفورية لزر إخفاء الكلمات
document.addEventListener("DOMContentLoaded", () => {
  const hideNormalEl = document.getElementById("hideNormal");
  if (hideNormalEl) {
    hideNormalEl.onchange = () => {
      if (typeof render === "function") render();
    };
  }
});

if ($("mMask")) {
  $("mMask").onchange = render;
}
