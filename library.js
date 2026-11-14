// Quranpedia live integration: Quran text, mushaf editions, riwayat and fonts.
const QP_BASE = "https://api.quranpedia.net/v1";
const FALLBACK_MUSHAFS = [
  {id:1,name:"حفص عن عاصم",rawi:{name:"حفص"}},
  {id:4,name:"ورش",rawi:{name:"ورش"}},
  {id:7,name:"قالون",rawi:{name:"قالون"}},
  {id:6,name:"الدوري",rawi:{name:"الدوري"}},
  {id:10,name:"السوسي",rawi:{name:"السوسي"}},
  {id:9,name:"شعبة",rawi:{name:"شعبة"}},
  {id:5,name:"البزي",rawi:{name:"البزي"}},
  {id:8,name:"قنبل",rawi:{name:"قنبل"}}
];
let QP_CATALOG = [];
let QP_BY_ID = Object.create(null);
let QP_READY = null;
const QP_PENDING = new Map();

FALLBACK_MUSHAFS.forEach(m => { QP_BY_ID[m.id] = m; });

function fallbackMeta(id) {
  return FALLBACK_MUSHAFS.find(m => m.id === Number(id)) || FALLBACK_MUSHAFS[0];
}

function activeMushafId() {
  return Number($("riwaya") && $("riwaya").value || 1);
}

function activeMushaf() {
  return QP_BY_ID[activeMushafId()] || fallbackMeta(activeMushafId());
}

function libraryKey(id) {
  return "quranpedia:" + Number(id);
}

function fillR(selectedId) {
  const sel = $("riwaya");
  if (!sel) return;
  const rows = QP_CATALOG.length ? QP_CATALOG : FALLBACK_MUSHAFS;
  const wanted = String(selectedId || sel.value || 1);
  sel.innerHTML = "";
  rows.forEach(m => {
    const o = document.createElement("option");
    o.value = String(m.id);
    o.textContent = m.name || m.rawi?.full_name || ("مصحف " + m.id);
    const detail = [m.rawi?.full_name, m.description].filter(Boolean).join(" — ");
    if (detail) o.title = detail;
    sel.appendChild(o);
  });
  sel.value = rows.some(m => String(m.id) === wanted) ? wanted : String(rows[0].id);
}

function fillS() {
  const sel = $("surah");
  if (!sel) return;
  const previous = sel.value || "1";
  sel.innerHTML = "";
  NAMES.forEach((n, i) => {
    const o = document.createElement("option");
    o.value = String(i + 1);
    o.textContent = (i + 1) + ". " + n;
    sel.appendChild(o);
  });
  sel.value = NAMES[Number(previous) - 1] ? previous : "1";
}

async function loadMushafCatalog() {
  if (!QP_READY) {
    QP_READY = (async () => {
      try {
        const response = await fetch(QP_BASE + "/mushafs", {headers:{Accept:"application/json"}});
        if (!response.ok) throw new Error("HTTP " + response.status);
        const data = await response.json();
        if (!Array.isArray(data) || !data.length) throw new Error("قائمة المصاحف غير متاحة");
        QP_CATALOG = data.filter(m => m && Number.isFinite(Number(m.id)));
        QP_BY_ID = Object.create(null);
        QP_CATALOG.forEach(m => { QP_BY_ID[Number(m.id)] = m; });
        const selected = activeMushafId();
        fillR(selected);
        fillS();
        return true;
      } catch (error) {
        console.warn("Quranpedia catalog could not be loaded:", error);
        return false;
      }
    })();
  }
  return QP_READY;
}

function removeLeadingBasmala(text, surahId) {
  if (surahId === 1 || surahId === 9) return text;
  const parts = String(text || "").trim().split(/\s+/);
  if (parts.length >= 4 && typeof norm === "function" &&
      norm(parts.slice(0, 4).join("")) === "بسماللهالرحمنالرحيم") {
    return parts.slice(4).join(" ");
  }
  return text;
}

function applyMushafFont(meta) {
  if (!meta) return;
  let fontUrl = meta.font_file || "";
  // Quranpedia's current KFGQPC Hafs text uses the v3 font for the new Uthmani marks.
  if (!fontUrl && [1, 2].includes(Number(meta.id))) {
    fontUrl = "https://api.quranpedia.net/assets/fonts/arabic/UthmanicHafs-v-3.0.ttf";
  }
  const styleId = "quranpedia-mushaf-font";
  let style = document.getElementById(styleId);
  if (!fontUrl || !/^https?:\/\//i.test(fontUrl)) {
    if (style) style.remove();
    document.documentElement.style.setProperty("--quranpedia-font", '"Amiri Quran"');
    return;
  }
  const family = "RatilQuranpedia" + Number(meta.id);
  const format = /\.woff2?(?:\?|$)/i.test(fontUrl)
    ? ( /\.woff2(?:\?|$)/i.test(fontUrl) ? "woff2" : "woff" )
    : (/\.otf(?:\?|$)/i.test(fontUrl) ? "opentype" : "truetype");
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.textContent =
    '@font-face{font-family:"' + family + '";src:url("' + fontUrl + '") format("' + format + '");font-display:swap}' +
    '#text,#sW,.tj-report-word{font-family:"' + family + '","Amiri Quran","Traditional Arabic",serif!important}';
  document.documentElement.style.setProperty("--quranpedia-font", '"' + family + '"');
}

async function ensureQuranpediaSurah(mushafId, surahId, force) {
  await loadMushafCatalog();
  const id = Number(mushafId || 1);
  const sid = Number(surahId || 1);
  if (sid < 1 || sid > 114) throw new Error("رقم السورة غير صحيح");
  const meta = QP_BY_ID[id] || fallbackMeta(id);
  if (!meta) throw new Error("الرواية غير متاحة");
  const key = libraryKey(id);
  LIB[key] = LIB[key] || {};

  if (!force && Array.isArray(LIB[key][sid]) && LIB[key][sid].length) return LIB[key][sid];

  const localKey = "ratil_qp_surah_" + id + "_" + sid;
  if (!force) {
    try {
      const local = localStorage.getItem(localKey);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length) {
          LIB[key][sid] = parsed;
          return parsed;
        }
      }
      // Read a full-library cache created by an earlier Ratil version, if one exists.
      const full = localStorage.getItem("ratil_lib_qp_" + id);
      if (full) {
        const parsedFull = JSON.parse(full);
        if (Array.isArray(parsedFull[sid])) {
          LIB[key][sid] = parsedFull[sid];
          return parsedFull[sid];
        }
      }
    } catch (_) {}
  }

  const requestKey = id + ":" + sid;
  if (QP_PENDING.has(requestKey)) return QP_PENDING.get(requestKey);

  const task = (async () => {
    try {
      const response = await fetch(QP_BASE + "/mushafs/" + id + "/" + sid, {
        headers:{Accept:"application/json"},
        cache: force ? "reload" : "default"
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const payload = await response.json();
      const records = Array.isArray(payload) ? payload
        : (Array.isArray(payload.ayahs) ? payload.ayahs : []);
      if (!records.length || records.some(a => !a || typeof a.text !== "string")) {
        throw new Error("لم يرجع المصدر آيات مكتملة لهذه السورة");
      }

      const verses = records.map((ayah, index) => ({
        text: index === 0 ? removeLeadingBasmala(ayah.text, sid) : ayah.text,
        marker: typeof ayah.marker === "string" ? ayah.marker : "",
        number: Number(ayah.number) || index + 1,
        number_in_hafs: ayah.number_in_hafs || null,
        page_number: ayah.page_number || null
      }));

      LIB[key][sid] = verses;
      window.HM = window.HM || {};
      window.HM[key] = window.HM[key] || {};
      window.HM[key][sid] = records.map(a => a.number_in_hafs || null);
      try { localStorage.setItem(localKey, JSON.stringify(verses)); } catch (_) {}

      return verses;
    } catch (error) {
      console.error("Quranpedia surah request failed:", error);
      msg("تعذّر تحميل آيات السورة من Quranpedia. تحقق من اتصال الإنترنت ثم اضغط «تحديث نص السورة».", true);
      throw error;
    } finally {
      QP_PENDING.delete(requestKey);
    }
  })();

  QP_PENDING.set(requestKey, task);
  return task;
}

window.loadQuranpediaSurah = ensureQuranpediaSurah;

function parse(t) {
  const o = {};
  try {
    const j = JSON.parse(t);
    if (Array.isArray(j)) {
      j.forEach(x => {
        const s = x.sura || x.surah || x.chapter, a = x.aya || x.ayah || x.verse;
        if (s && a && x.text) (o[s] = o[s] || [])[a - 1] = x.text;
      });
    } else {
      Object.keys(j).forEach(k => { if (Array.isArray(j[k])) o[k] = j[k]; });
    }
    return o;
  } catch (_) {}
  t.split(/\r?\n/).forEach(l => {
    const m = l.match(/^(\d+)\|(\d+)\|(.+)$/);
    if (m) (o[+m[1]] = o[+m[1]] || [])[+m[2] - 1] = m[3].trim();
  });
  return o;
}

fillR(1);
fillS();
$("full").href = /^https?:/.test(location.href) ? location.href : "https://claude.ai/artifact/XhxVM7WZSB9m4Kht8RVatw";

if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
  msg("This browser doesn’t support speech recognition. Open the page in Chrome or Safari.", true);
}

$("imp").onclick = () => $("file").click();

async function getRiwaya(id, force) {
  const selectedId = Number(id || activeMushafId() || 1);
  $("live").textContent = "";
  await loadMushafCatalog();
  fillR(selectedId);
  fillS();
  const meta = QP_BY_ID[selectedId] || fallbackMeta(selectedId);
  applyMushafFont(meta);
  const sid = Number($("surah").value || 1);
  try {
    await ensureQuranpediaSurah(selectedId, sid, !!force);
    if (activeMushafId() === selectedId && Number($("surah").value) === sid) load();
    const sourceName = meta.name || meta.rawi?.full_name || "الرواية";
    msg("تم تحميل سورة " + NAMES[sid - 1] + " من Quranpedia · " + sourceName);
  } catch (_) {}
}

$("net").onclick = () => getRiwaya(activeMushafId(), true);
$("riwaya").onchange = () => {
  stop();
  getRiwaya(activeMushafId(), false);
};

$("file").onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    const o = parse(String(rd.result)), count = Object.keys(o).length;
    if (!count) {
      msg("تعذّر قراءة الملف. استخدم JSON أو صيغة Tanzil: sura|aya|text.", true);
      return;
    }
    const key = libraryKey(activeMushafId());
    LIB[key] = o;
    try { localStorage.setItem("ratil_lib_qp_" + activeMushafId(), JSON.stringify(o)); } catch (_) {}
    fillS();
    stop();
    load();
    msg("تم استيراد " + count + " سورة للرواية المختارة.");
  };
  rd.readAsText(f, "utf-8");
  e.target.value = "";
};

document.addEventListener("DOMContentLoaded", () => {
  getRiwaya(activeMushafId(), false);
});
