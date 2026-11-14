// Library: riwaya/surah menus, import file, download riwayat from Quranpedia
function fillR(sel){
  const cur = sel || $("riwaya").value;
  $("riwaya").innerHTML = "";
  [...new Set([...RIW, ...Object.keys(LIB)])].forEach(k => {
    const o = document.createElement("option");
    o.value = k;
    o.textContent = k;
    $("riwaya").appendChild(o);
  });
  $("riwaya").value = cur || RIW[0];
}

function fillS(){
  const r = LIB[$("riwaya").value] || {};
  $("surah").innerHTML = "";
  NAMES.forEach((n, i) => {
    const o = document.createElement("option");
    o.value = i + 1;
    o.textContent = (i + 1) + ". " + n;
    $("surah").appendChild(o);
  });
  $("surah").value = Object.keys(r)[0] || 1;
}

function parse(t){
  const o = {};
  try {
    const j = JSON.parse(t);
    if(Array.isArray(j)){
      j.forEach(x => {
        const s = x.sura || x.surah || x.chapter, a = x.aya || x.ayah || x.verse;
        if(s && a && x.text)(o[s] = o[s] || [])[a - 1] = x.text;
      });
    } else {
      Object.keys(j).forEach(k => { if(Array.isArray(j[k])) o[k] = j[k]; });
    }
    return o;
  } catch(_) {}
  t.split(/\r?\n/).forEach(l => {
    const m = l.match(/^(\d+)\|(\d+)\|(.+)$/);
    if(m)(o[+m[1]] = o[+m[1]] || [])[+m[2] - 1] = m[3].trim();
  });
  return o;
}

fillR();
fillS();
$("full").href = /^https?:/.test(location.href) ? location.href : "https://claude.ai/artifact/XhxVM7WZSB9m4Kht8RVatw";

if(!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
  msg("This browser doesn’t support speech recognition. Open the page in Chrome or Safari.", true);
}

$("imp").onclick = () => $("file").click();

const MID = {"حفص عن عاصم": 1, "ورش": 4, "قالون": 7, "الدوري": 6, "السوسي": 10, "شعبة": 9, "البزي": 5, "قنبل": 8};

// Quranpedia text cache v3: deliberately bypasses older localStorage text without
// the current Uthmani word separators.
const QP_TEXT_CACHE_VERSION = "ratil_qp_20261114_v6";

function normalizeQuranText(text) {
  return String(text || "")
    .normalize("NFC")
    // Convert all Unicode whitespace and invisible word separators to ordinary spaces.
    .replace(/[\u0009-\u000D\u0020\u0085\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u2060\u3000\uFEFF]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

function setQuranpediaFont() {
  // Use the site's regular Arabic font instead of replacing it with the
  // special Quranpedia/Uthmanic web font.
  const style = document.getElementById("quranpedia-font-style");
  if (style) style.remove();
}

function hasCompleteSurahSet(data) {
  return data && typeof data === "object" &&
    Object.keys(data).length >= 114 &&
    Array.from({length:114}, (_,i) => data[i + 1]).every(v => Array.isArray(v) && v.length);
}

async function getRiwaya(name, force) {
  $("live").textContent = "";
  const mushafId = MID[name];
  if (!mushafId) {
    msg("الرواية المختارة غير مرتبطة حاليًا بمصدر Quranpedia.", true);
    return;
  }

  const cacheKey = QP_TEXT_CACHE_VERSION + "_" + mushafId;
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached && hasCompleteSurahSet(cached.surahs)) {
        LIB[name] = cached.surahs;
        setQuranpediaFont(name, cached.fontUrl || "");
        fillR(name);
        fillS();
        load();
        return;
      }
    } catch (_) {}
  }

  msg("جاري تحديث نص القرآن من Quranpedia...");
  try {
    const res = await fetch("https://api.quranpedia.net/v1/mushafs/" + mushafId, {
      headers: {Accept: "application/json"},
      cache: force ? "reload" : "no-cache"
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const j = await res.json();
    if (!Array.isArray(j.surahs)) throw new Error("Invalid Quranpedia response");

    const surahs = {}, hm = {};
    j.surahs.forEach(s => {
      const ayahs = [], numbers = [];
      (s.ayahs || []).forEach(x => {
        ayahs[x.number - 1] = normalizeQuranText(x.text);
        numbers[x.number - 1] = x.number_in_hafs;
      });

      // Remove only a duplicated basmala prefix where it is outside the numbered ayah.
      if (s.id !== 1 && s.id !== 9 && ayahs[0]) {
        const parts = ayahs[0].split(" ");
        if (parts.length >= 4 &&
            norm(parts.slice(0, 4).join(" ")) === "بسماللهالرحمنالرحيم") {
          ayahs[0] = parts.slice(4).join(" ");
        }
      }
      surahs[s.id] = ayahs;
      hm[s.id] = numbers;
    });

    if (!hasCompleteSurahSet(surahs)) throw new Error("Incomplete Quranpedia mushaf");

    LIB[name] = surahs;
    HM[name] = hm;
    setQuranpediaFont(name, j.font_file || "");
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        surahs,
        fontUrl: j.font_file || "",
        source: "Quranpedia",
        version: QP_TEXT_CACHE_VERSION
      }));
      // Remove the old, potentially joined-word cache after a verified refresh.
      localStorage.removeItem("ratil_lib_" + name);
    } catch (_) {}

    fillR(name);
    fillS();
    load();
    msg("تم تحديث نص الرواية من Quranpedia مع فواصل الكلمات.");
  } catch (err) {
    console.error("Quranpedia text refresh failed:", err);
    LIB[name] = {};
    $("text").innerHTML = "";
    msg("تعذّر تحديث النص من Quranpedia. لم أستخدم النسخة القديمة حتى لا تظهر الكلمات ملتصقة. تحقق من الإنترنت ثم أعد المحاولة.", true);
  }
}

$("net").onclick = () => getRiwaya($("riwaya").value, true);
$("riwaya").onchange = () => { stop(); getRiwaya($("riwaya").value); };

$("file").onchange = e => {
  const f = e.target.files[0];
  if(!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    const o = parse(String(rd.result)), n = Object.keys(o).length;
    if(!n) {
      msg("Couldn’t read that file. Use Tanzil’s pipe format (sura|aya|text) or JSON.", true);
      return;
    }
    const name = $("riwaya").value;
    LIB[name] = o;
    try {
      localStorage.setItem("ratil_lib_" + name, JSON.stringify(o));
    } catch(_){}
    fillR(name);
    fillS();
    stop();
    load();
    msg("تم استيراد " + n + " سورة بنجاح لـ " + name + ".");
  };
  rd.readAsText(f, "utf-8");
  e.target.value = "";
};

document.addEventListener("DOMContentLoaded", () => {
  const def = $("riwaya").value || "حفص عن عاصم";
  getRiwaya(def, false);
});
