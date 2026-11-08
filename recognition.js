// Recognition matching: Robust handler for Huruf Muqatta'ah & Continuous Tajweed rules for Ratil.saher
const TH = { strict: [.80, .65], normal: [.55, .35], lenient: [.40, .20] };

// Official set of Quranic Huruf Muqatta'ah
const MUQATTAAH_SET = new Set([
  "الم", "المص", "الر", "المر", "كهيعص", "طه", "طسم", "طس", "يس", "ص", "حم", "ق", "ن"
]);

// Helper to normalize Arabic text and handle speech recognition gaps
function normalizeArabic(str) {
 if (!str) return "";
 let cleanStr = str.trim();

 // Expand common speech recognition failures or fragmented letters
 const spokenMap = {
  "الف لام ميم": "الم",
  "الف لام": "الم",
  "الف": "الم",
  "لام": "الم",
  "ميم": "الم",
  "ال": "الم", // إذا سمع المتصفح "ال" فقط، نقوم بتحويلها تلقائياً لتسهيل المرور
  "الف لام ميم صاد": "المص",
  "الف لام راء": "الر",
  "الف لام ميم راء": "المر",
  "كاف هاء يا عين صاد": "كهيعص",
  "طاها": "طه",
  "طا سين ميم": "طسم",
  "طا سين": "طس",
  "يس": "يس",
  "صاد": "ص",
  "حاميم": "حم",
  "قاف": "ق",
  "نون": "ن"
 };

 if (spokenMap[cleanStr]) {
  cleanStr = spokenMap[cleanStr];
 }

 let normalized = cleanStr
  .replace(/[\u064B-\u065F\u0670]/g, "") // Remove Tashkeel & Tanween
  .replace(/[إأآا]/g, "ا")                 // Normalize Alefs
  .replace(/ة/g, "ه")                     // Normalize Teh Marbuta to Heh
  .replace(/ى/g, "ي")                     // Normalize Alef Maksura to Yeh
  .replace(/ـ/g, "")                      // Remove Tatweel
  .replace(/(.)\1{2,}/g, "$1$1")          // Handle Madd elongation
  .trim();

 const sunLetters = /[تثدذرزسصضطظلن]/;
 if (normalized.startsWith("ال") && normalized.length > 3 && sunLetters.test(normalized[2])) {
  normalized = normalized.slice(2);
 }

 return normalized;
}

// Enhanced similarity check with maximum tolerance for Muqatta'ah
function enhancedSim(w1, w2) {
 if (!w1 || !w2) return 0;
 
 const norm1 = normalizeArabic(w1);
 const norm2 = normalizeArabic(w2);
 
 if (norm1 === norm2) return 1.0;

 const isM1 = MUQATTAAH_SET.has(norm1) || MUQATTAAH_SET.has(w1.trim());
 const isM2 = MUQATTAAH_SET.has(norm2) || MUQATTAAH_SET.has(w2.trim());

 if (isM1 || isM2) {
  // Allow flexible match if user speaks parts or if browser clips the letters
  if ((norm1 === "الم" || norm2 === "الم") && (norm1.includes("ال") || norm2.includes("ال") || norm1.includes("الف") || norm2.includes("الف") || norm1 === "" || norm2 === "")) {
   return 0.95; 
  }
  return norm1 === norm2 ? 1.0 : 0.0;
 }

 let baseScore = sim(w1, w2);
 let normScore = sim(normalizeArabic(w1), normalizeArabic(w2));
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
 
 // Fallback feature: if the current expected word is a Muqatta'ah (like "الم") and the speech array is empty or missed it, allow auto-passing if user clicked or made any vocal sound
 if (words[p] && MUQATTAAH_SET.has(words[p].n) && (rw.length === 0 || rw.join("").trim() === "")) {
  // Auto-accept Muqatta'ah if speech engine fails to capture it, to prevent getting stuck permanently
  s[p] = "ok";
  h[p] = words[p].n;
  p++;
  return { s, p, h, sc: 1.0 };
 }

 for (let i = 0; i < rw.length && p < end; i++) {
  const verse = words[p].v;
  let verseStart = p, verseEnd = p + 1;
  while (verseStart > 0 && words[verseStart - 1].v === verse) verseStart--;
  while (verseEnd < end && words[verseEnd].v === verse) verseEnd++;

  let currentSpoken = rw[i];
  if (i + 2 < rw.length) {
   currentSpoken = rw[i] + " " + rw[i+1] + " " + rw[i+2];
  } else if (i + 1 < rw.length) {
   currentSpoken = rw[i] + " " + rw[i+1];
  }

  let hit = -1, score = 0, used = 1;
  for (let j = p; j < Math.min(p + 6, verseEnd); j++) {
   let sc = enhancedSim(currentSpoken, words[j].n), u = 1;
   
   // Special handling if current expected word is Muqatta'ah
   if (MUQATTAAH_SET.has(words[j].n)) {
    sc = 0.95; // Force match to ensure reciter never gets stuck on disjointed letters
   }

   if (i + 2 < rw.length) {
    const triple = rw[i] + rw[i+1] + rw[i+2];
    const m = enhancedSim(triple, words[j].n);
    if (m > sc) { sc = m; u = 3; }
   } else if (i + 1 < rw.length) {
    const double = rw[i] + rw[i+1];
    const m = enhancedSim(double, words[j].n);
    if (m > sc) { sc = m; u = 2; }
   }

   if (sc >= nearT && sc > score + (j > p ? .05 : 0)) {
    hit = j; score = sc; used = u;
    if (sc >= 0.75) break;
   }
  }
  
  if (hit < 0) {
   // If we are stuck on a Muqatta'ah word, force hit it to let reciter proceed
   if (MUQATTAAH_SET.has(words[p].n)) {
    hit = p; score = 1.0; used = 1;
   } else {
    continue;
   }
  }

  for (let k = p; k < hit; k++) s[k] = "miss";
  const lab = score >= okT ? "ok" : "near";
  
  s[hit] = lab;
  h[hit] = rw[i] || words[hit].n;
  p = hit + 1;

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
  if (verse < currentVerse && s.slice(start, finish).some(status => status !== "ok") && verseIsRepeatedCorrectly(start, finish, rw, okT)) {
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
