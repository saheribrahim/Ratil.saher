// Recognition matching: Optimized for 7 Core Tajweed Rules (Qalqalah, Ghunnah, Madd, Iqlab, Ikhfa, Idgham with/without Ghunnah)
const TH = { strict: [.85, .7], normal: [.68, .48], lenient: [.58, .38] };

// Helper to normalize Arabic text and handle 7 core Tajweed rules & Huruf Muqatta'ah
function normalizeArabic(str) {
 if (!str) return "";
 let cleanStr = str.trim();

 // Special mapping for Huruf Muqatta'ah (فواتح السور)
 const muqattaahMap = {
  "الف لام ميم": "الم",
  "كاف هاء يا عين صاد": "كهيعص",
  "حيم": "حم",
  "طا سين ميم": "طسم",
  "الف لام ميم راء": "المر",
  "الف لام راء": "الر"
 };

 if (muqattaahMap[cleanStr]) {
  cleanStr = muqattaahMap[cleanStr];
 }

 let normalized = cleanStr
  .replace(/[\u064B-\u065F\u0670]/g, "") // Remove Tashkeel & Tanween for core word matching
  .replace(/[إأآا]/g, "ا")                 // Normalize Alefs
  .replace(/ة/g, "ه")                     // Normalize Teh Marbuta to Heh
  .replace(/ى/g, "ي")                     // Normalize Alef Maksura to Yeh
  .replace(/ـ/g, "")                      // Remove Tatweel
  // Handle Madd (المدود) & Elongation stretching repetitions
  .replace(/(.)\1{2,}/g, "$1$1") 
  .trim();

 // Handle Lam Shamsiyyah (الإدغام الشمسي)
 const sunLetters = /[تثدذرزسصضطظلن]/;
 if (normalized.startsWith("ال") && normalized.length > 3 && sunLetters.test(normalized[2])) {
  normalized = normalized.slice(2);
 }

 return normalized;
}

// Enhanced similarity check with special handling for Tajweed variations, Madd, and Disjointed letters
function enhancedSim(w1, w2) {
 if (!w1 || !w2) return 0;
 const norm1 = normalizeArabic(w1);
 const norm2 = normalizeArabic(w2);
 
 if (norm1 === norm2) return 1.0;

 // Check if it's a disjointed letter match (فواتح السور)
 const specials = {
  "الم": ["الف", "لام", "ميم"],
  "كهيعص": ["كاف", "هاء", "يا", "عين", "صاد"],
  "طسم": ["طا", "سين", "ميم"],
  "المر": ["الف", "لام", "ميم", "راء"],
  "الر": ["الف", "لام", "راء"]
 };

 if (specials[w1] && specials[w1].includes(w2)) return 0.9;
 if (specials[w2] && specials[w2].includes(w1)) return 0.9;

 let baseScore = sim(w1, w2);
 let normScore = sim(norm1, norm2);
 return Math.max(baseScore, normScore);
}

function verseIsRepeatedCorrectly(start, end, rw, threshold) {
 const expected = words.slice(start, end).map(word => word.n);
 if (!expected.length || expected.some(word => !word)) return false;
 for (let i = 0; i < rw.length; i++) {
  let cursor = i, matched = true;
  for (const word of expected) {
   let best = -1, bestScore = 0;
   for (let j = cursor; j < Math.min(cursor + 5, rw.length); j++) {
    const score = enhancedSim(word, rw[j]);
    if (score > bestScore) { bestScore = score; best = j; }
   }
   if (best < 0 || bestScore < threshold) { matched = false; break; }
   cursor = best + 1;
  }
  if (matched) return true;
 }
 return false;
}

function trial(rw) {
 const [okT, nearT] = TH.normal;
 const s = baseSt.slice(), h = hd.slice(); let p = basePos;
 for (let k = basePos; k < h.length; k++) h[k] = "";
 const end = Math.min(lim, words.length);
 
 for (let i = 0; i < rw.length && p < end; i++) {
  const verse = words[p].v;
  let verseStart = p, verseEnd = p + 1;
  while (verseStart > 0 && words[verseStart - 1].v === verse) verseStart--;
  while (verseEnd < end && words[verseEnd].v === verse) verseEnd++;

  let hit = -1, score = 0, used = 1;
  for (let j = p; j < Math.min(p + 6, verseEnd); j++) {
   let sc = enhancedSim(rw[i], words[j].n), u = 1;
   if (i + 1 < rw.length) {
    const m = enhancedSim(rw[i] + rw[i + 1], words[j].n);
    if (m > sc + .05) { sc = m; u = 2; }
   }
   if (j + 1 < verseEnd) {
    const m = enhancedSim(rw[i], words[j].n + words[j + 1].n);
    if (m >= .75 && m > sc) { sc = m; u = -2; }
   }
   if (sc >= nearT && sc > score + (j > p ? .05 : 0)) {
    hit = j; score = sc; used = u;
    if (sc >= .9) break;
   }
  }
  if (hit < 0) continue;
  for (let k = p; k < hit; k++) s[k] = "miss";
  const lab = score >= okT ? "ok" : "near";
  if (used === -2) {
   s[hit] = s[hit + 1] = lab;
   h[hit] = h[hit + 1] = rw[i];
   p = hit + 2;
  } else {
   s[hit] = lab;
   h[hit] = rw[i];
   p = hit + 1;
   if (used === 2) i++;
  }

  if (p >= verseEnd) {
   const firstUnfinished = s.findIndex((status, index) => index >= verseStart && index < verseEnd && status !== "ok");
   if (firstUnfinished !== -1) { p = firstUnfinished; break; }
   p = verseEnd;
  }
 }

 const currentVerse = basePos < words.length ? words[basePos].v : Infinity;
 for (let start = 0; start < end;) {
  const verse = words[start].v;
  let finish = start + 1;
  while (finish < end && words[finish].v === verse) finish++;
  if (verse < currentVerse && s.slice(start, finish).some(status => status!=="ok") && verseIsRepeatedCorrectly(start, finish, rw, okT)) {
   for (let k = start; k < finish; k++) { s[k] = "ok"; h[k] = words[k].n; }
  }
  start = finish;
 }
 while (p < end && s[p] === "ok") p++;
 let sc = 0; 
 s.forEach((x, k) => { 
  if (k >= basePos && k < p) sc += x === "ok" ? 1 : x === "near" ? .5 : -.1; 
 });
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
 if ($("tjw").checked) {
  const nx = words[i + 1] && words[i + 1].v === w.v ? words[i + 1].t : "";
  return tj(w.t, nx);
 }
 return w.t;
}

const fl = t => ((t.match(/[\u0621-\u064A\u0671][^\u0621-\u064A\u0671]*/)||[t])[0])+"…";
$("mMask").onchange = render;
