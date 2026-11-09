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

async function getRiwaya(name, force) {
  $("live").textContent = "";
  
  if (!LIB[name] || Object.keys(LIB[name]).length < 114) {
    try {
      const saved = localStorage.getItem("ratil_lib_" + name);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length >= 114) {
          LIB[name] = parsed;
          fillR(name);
          fillS();
          load();
          return;
        }
      }
    } catch(e) {}
  }

  const have = LIB[name] && Object.keys(LIB[name]).length >= 114;
  
  if (MID[name] && (!have || force)) {
    msg("جاري تحميل رواية " + name + " (114 سورة)… Downloading…");
    try {
      const res = await fetch(`https://api.quranpedia.net/v1/mushafs/${MID[name]}`);
      if (!res.ok) throw new Error("Network response was not ok");
      const j = await res.json();
      const o = {}, hm = {};
      
      j.surahs.forEach(s => {
        const a = [], m = [];
        s.ayahs.forEach(x => {
          a[x.number - 1] = x.text;
          m[x.number - 1] = x.number_in_hafs;
        });
        if(s.id !== 1 && s.id !== 9 && a[0]) {
          const w = a[0].split(/\s+/);
          if(norm(w.slice(0, 4).join(" ")) === "بسماللهالرحمنالرحيم") {
            a[0] = w.slice(4).join(" ");
          }
        }
        o[s.id] = a;
        hm[s.id] = m;
      });

      if(Object.keys(o).length < 114) throw new Error("Incomplete data");
      
      LIB[name] = o;
      HM[name] = hm;
      
      try {
        localStorage.setItem("ratil_lib_" + name, JSON.stringify(o));
      } catch(e) {}

      msg("✅ تم تحميل رواية " + name + " (114 سورة) بنجاح · Loaded.");
    } catch(err) {
      msg("⚠️ تعذّر التحميل المباشر. تأكد من اتصال الإنترنت أو استخدم Import.", true);
    }
  }
  
  fillR(name);
  fillS();
  load();
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
