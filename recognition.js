// Recognition matching: strict letter completeness, no premature advancing,
// and correct handling of Huruf Muqatta'ah (الم، حم، كهيعص ...)
const TH = { strict: [.92, .80], normal: [.78, .58], lenient: [.65, .45] };
 
// ---------- Huruf Muqatta'ah ----------
const MUQATTAAH_SET = new Set([
  "الم", "المص", "الر", "المر", "كهيعص", "طه", "طسم", "طس", "يس", "ص", "حم", "عسق", "ق", "ن"
]);
// Surahs that open with Muqatta'ah letters (surah 42 has two: حم then عسق)
const MUQ_SURAHS = new Set([2,3,7,10,11,12,13,14,15,19,20,26,27,28,29,30,31,32,36,38,40,41,42,43,44,45,46,50,68]);
 
// How each letter is SPOKEN (names are already in the normalized form of norm())
const LETTER_NAMES = {
  "ا": ["الف", "ا"], "ل": ["لام", "ل"], "م": ["ميم", "م"], "ص": ["صاد", "ص"],
  "ر": ["را", "راء", "ر"], "ك": ["كاف", "ك"], "ه": ["ها", "هاء", "ه"], "ي": ["يا", "ياء", "ي"],
  "ع": ["عين", "ع"], "ط": ["طا", "طاء", "ط"], "س": ["سين", "س"], "ح": ["حا", "حاء", "ح"],
  "ق": ["قاف", "ق"], "ن": ["نون", "ن"]
};
 
// Is expected word j a Muqatta'ah word? (decided by POSITION, so an ordinary word like "أَلَمْ" is never confused with "الٓمٓ")
function isMuq(j) {
  const s = +$("surah").value, w = words[j];
  return !!w && MUQ_SURAHS.has(s) && MUQATTAAH_SET.has(w.n) && (w.v === 0 || (s === 42 && w.v === 1));
}
 
// Madd (elongation): "لااااام" / "ميييييم" are the same letters stretched, so repeated letters are collapsed
const sq = t => t.replace(/(.)\1+/g, "$1");
 
// Letter names the recognizer might write slightly differently (لآم، لا ...) are accepted,
// but never the name of a DIFFERENT letter (كاف is not قاف, ميم is not لام).
const ALL_NAMES = new Set(Object.values(LETTER_NAMES).flat().filter(x => x.length > 1).map(sq));
const nameOK = (tok, names) => names.includes(tok) ||
  (!ALL_NAMES.has(tok) && names.some(nm => nm.length >= 3 && tok.length >= 2 && sim(tok, nm) >= .67));
 
// Returns how many recognized tokens (starting at i) fully match the Muqatta'ah word, or 0.
// Accepts: the written form ("الم"), ALL the letter names in order ("الف لام ميم"),
// or names glued together / stretched with madd ("الفلااااام ميييم", "الفلاميم").
// A partial reading ("الف" only, or "الف لام") returns 0  ->  not accepted, no advancing.
function muqMatch(rw, i, n) {
  if (sq(rw[i]) === sq(n)) return 1;
  const L = [...n];
  let k = i, ok = true;
  for (const ch of L) {
    const names = (LETTER_NAMES[ch] || [ch]).map(sq);
    if (k < rw.length && nameOK(sq(rw[k]), names)) k++; else { ok = false; break; }
  }
  if (ok) return k - i;
  const full = sq(L.map(ch => (LETTER_NAMES[ch] || [ch])[0]).join(""));
  for (let m = 1; m <= Math.min(L.length + 2, rw.length - i); m++) {
    const joined = sq(rw.slice(i, i + m).join(""));
    if (joined.length >= full.length * .7 && sim(joined, full) >= .85) return m;
  }
  return 0;
}
 
// Words the user marked as correct by hand (button in the word sheet)
const forced = new Set();
 
// ---------- Normalization & similarity ----------
function normalizeArabic(str) {
  if (!str) return "";
  let normalized = str.trim()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "") // Tashkeel, tanween, Quranic marks
    .replace(/[إأآٱا]/g, "ا")                           // Alefs
    .replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")                                 // Teh marbuta -> Heh
    .replace(/ى/g, "ي")                                 // Alef maksura -> Yeh
    .replace(/ـ/g, "")                                  // Tatweel
    .replace(/(.)\1{2,}/g, "$1$1")                      // Madd elongation
    .trim();
  const sunLetters = /[تثدذرزسصضطظلن]/;
  if (normalized.startsWith("ال") && normalized.length > 3 && sunLetters.test(normalized[2])) {
    normalized = normalized.slice(2);
  }
  return normalized;
}
 
function enhancedSim(w1, w2) {
  if (!w1 || !w2) return 0;
  const a = normalizeArabic(w1), b = normalizeArabic(w2);
  if (a === b) return 1.0;
  // The text uses a "dagger alef"/hamza spelling that the speech engine writes differently
  // (الكتٰب vs الكتاب, القرءان vs القران), so also compare without alef/hamza.
  const strip = x => x.replace(/[ا\u0621]/g, "");
  const stretch = x => x.replace(/([اوي])\1+/g, "$1");   // madd: رحيييم، الرحمااان
  return Math.max(sim(w1, w2), sim(a, b), 0.99 * sim(stretch(a), stretch(b)), 0.98 * sim(strip(stretch(a)), strip(stretch(b))));
}
 
// ---------- Re-reciting an earlier verse completely ----------
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
 
// ---------- Main alignment ----------
function trial(rw) {
  const [okT, nearT] = TH.strict;          // change to TH.normal for a more forgiving app
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
        // Muqatta'ah: needs the COMPLETE word (or all letter names) — never a partial match
        const n = muqMatch(rw, i, words[j].n);
        if (n > 0) { sc = 1; u = n; }
      } else {
        sc = enhancedSim(rw[i], words[j].n);
        if (i + 1 < rw.length) {                       // recognizer split one word in two
          const m = enhancedSim(rw[i] + rw[i + 1], words[j].n);
          if (m > sc + .05) { sc = m; u = 2; }
        }
        if (j + 1 < verseEnd && !isMuq(j + 1)) {       // recognizer merged two words
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
    const lab = score >= okT ? "ok" : "near";
    if (used === -2) {
      s[hit] = s[hit + 1] = lab;
      h[hit] = h[hit + 1] = rw[i];
      p = hit + 2;
    } else {
      s[hit] = lab;
      h[hit] = rw[i];
      p = hit + 1;
      i += used - 1;                                   // skip the extra tokens that were used
    }
 
    // Never move to the next verse while words of this verse are still missing:
    // go back to the first missing word and keep listening for it.
    if (p >= verseEnd) {
      let firstUnfinished = -1;
      for (let k = verseStart; k < verseEnd; k++) {
        if (s[k] === "miss" || s[k] === "todo") { firstUnfinished = k; break; }
      }
      if (firstUnfinished !== -1) p = firstUnfinished;
    }
    skipForced();
  }
 
  // If an earlier verse was recited again completely, accept it (not in memorization mode)
  if (!memOn) {
    const currentVerse = basePos < words.length ? words[basePos].v : Infinity;
    for (let start = 0; start < end;) {
      const verse = words[start].v;
      let finish = start + 1;
      while (finish < end && words[finish].v === verse) finish++;
      if (verse < currentVerse && s.slice(start, finish).some(x => x !== "ok") &&
          verseIsRepeatedCorrectly(start, finish, rw, okT)) {
        for (let k = start; k < finish; k++) { s[k] = "ok"; h[k] = words[k].n; }
      }
      start = finish;
    }
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
  if (listening && pos < words.length && isMuq(pos) && st[pos] !== "ok") {
    const spoken = [...words[pos].n].map(c => (LETTER_NAMES[c] || [c])[0]).join(" · ");
    msg("🔤 حروف مقطعة: انطقها بأسماء حروفها (" + spoken + ") أو كما تُكتب · Say the letter names");
  }
}
 
function htmlOf(i) {
  const w = words[i];
  if ($("tjw").checked) {
    const nx = words[i + 1] && words[i + 1].v === w.v ? words[i + 1].t : "";
    return tj(w.t, nx);
  }
  return w.t;
}
 
const fl = t => ((t.match(/[\u0621-\u064A\u0671][^\u0621-\u064A\u0671]*/) || [t])[0]) + "…";
$("mMask").onchange = render;
 
