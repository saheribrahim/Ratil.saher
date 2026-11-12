<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>مساعد التسميع القرآني</title>
<style>
:root{--green:#155b43;--bg:#f3f7f4;--ink:#1d2b24;--muted:#6d7b73;--line:#dce7df;--red:#b63d34}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);font-family:Tahoma,sans-serif;color:var(--ink);padding:14px}
.app{width:min(900px,100%);margin:auto}
header{text-align:center;padding:15px}
h1{color:var(--green);font-size:28px;margin:5px 0}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;margin:10px 0;box-shadow:0 4px 15px rgba(0,0,0,0.05)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}
select,textarea{width:100%;border:1px solid var(--line);border-radius:8px;padding:10px;font:14px Tahoma;outline:none}
textarea{min-height:80px;font-size:16px;line-height:1.8;resize:vertical}
button{border:0;border-radius:8px;padding:10px 14px;background:var(--green);color:white;font-weight:bold;cursor:pointer}
button.red{background:var(--red)}
button.light{background:#e9f1eb;color:var(--green)}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.reader,.result{font-family:serif;font-size:24px;line-height:2;background:#fcfdfb;border:1px solid var(--line);padding:14px;border-radius:10px;max-height:250px;overflow:auto}
.status{padding:8px 12px;border-radius:8px;background:#edf5ef;color:var(--green);font-size:12px;margin-top:8px}
.word{display:inline-block;padding:0 4px;border-radius:4px;margin:2px}
.correct{background:#dff3e5;color:#11613a}
.substitute{background:#ffead9;color:#9b4313}
.missing{background:#ffe4e2;color:#a12e29;text-decoration:line-through}
.extra{background:#eee6fa;color:#66469b}
.score{font-size:28px;font-weight:bold;color:var(--green)}
@media(max-width:600px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<main class="app">
<header><h1>مساعد التسميع القرآني</h1></header>

<section class="card">
  <h2>اختيار السورة والآيات</h2>
  <div class="grid">
    <select id="surahSelect"><option>جاري التحميل...</option></select>
    <select id="fromAyah" disabled></select>
    <select id="toAyah" disabled></select>
  </div>
  <div class="actions">
    <button id="loadQuranBtn">تحميل الآيات</button>
    <button id="allSurahBtn" class="light">السورة كاملة</button>
  </div>
  <div id="quranText" class="reader" style="margin-top:10px">اختر السورة...</div>
  <textarea id="referenceText" style="margin-top:10px" placeholder="النص المرجعي..."></textarea>
</section>

<section class="card">
  <h2>التسجيل والمقارنة</h2>
  <div class="actions">
    <button id="startBtn">🎙️ بدء التسميع</button>
    <button id="stopBtn" class="red" disabled>إيقاف</button>
    <button id="clearBtn" class="light">مسح</button>
  </div>
  <div id="recognitionStatus" class="status">جاهز.</div>
  <div id="transcript" class="result" style="margin-top:10px;font-size:16px;min-height:40px">ابدأ التسميع...</div>
</section>

<section class="card">
  <h2>النتيجة (<span id="score">—%</span>)</h2>
  <div id="comparison" class="result">قارن التلاوة بالآيات...</div>
</section>
</main>

<script>
const API = "https://api.alquran.cloud/v1", $ = id => document.getElementById(id);
let ayahs = [], speech = null, transcriptText = "";

const norm = s => (s||"").normalize("NFKC").replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/[^\u0621-\u064A0-9\s]/g," ").replace(/\s+/g," ").trim();
const tokens = t => norm(t) ? norm(t).split(" ") : [];

async function init() {
  try {
    const res = await (await fetch(API + "/surah")).json();
    $("surahSelect").replaceChildren(...res.data.map(s => {
      const o = document.createElement("option");
      o.value = s.number; o.textContent = `${s.number}. ${s.name}`;
      return o;
    }));
    loadSurah();
  } catch(e) { $("recognitionStatus").textContent = "خطأ في الاتصال"; }
}

async function loadSurah() {
  try {
    const res = await (await fetch(`${API}/surah/${$("surahSelect").value}/quran-uthmani`)).json();
    ayahs = res.data.ayahs;
    const fill = (el, max) => {
      el.replaceChildren(...Array.from({length: max}, (_, i) => {
        const o = document.createElement("option"); o.value = i+1; o.textContent = "آية " + (i+1);
        return o;
      }));
      el.disabled = false;
    };
    fill($("fromAyah"), ayahs.length);
    fill($("toAyah"), ayahs.length);
    $("toAyah").value = ayahs.length;
    render();
  } catch(e) {}
}

function render() {
  const f = +$("fromAyah").value || 1, t = +$("toAyah").value || f;
  const sel = ayahs.filter(a => a.numberInSurah >= f && a.numberInSurah <= t);
  $("quranText").replaceChildren(...sel.map(a => {
    const s = document.createElement("span");
    s.textContent = a.text + ` ﴿${a.numberInSurah}﴾ `;
    return s;
  }));
  $("referenceText").value = sel.map(a => a.text).join(" ");
  compare();
}

function compare() {
  const ref = tokens($("referenceText").value), said = tokens(transcriptText);
  if (!ref.length || !said.length) return;
  const n = ref.length, m = said.length;
  const dp = Array.from({length: n+1}, () => Array(m+1).fill(0));
  for(let i=0; i<=n; i++) dp[i][0] = i;
  for(let j=0; j<=m; j++) dp[0][j] = j;
  for(let i=1; i<=n; i++) {
    for(let j=1; j<=m; j++) {
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1] + (ref[i-1]===said[j-1]?0:1));
    }
  }
  let i = n, j = m, out = [];
  while(i > 0 || j > 0) {
    if(i > 0 && j > 0 && ref[i-1] === said[j-1] && dp[i][j] === dp[i-1][j-1]) {
      out.unshift({text: said[j-1], kind: "correct"}); i--; j--;
    } else if(i > 0 && j > 0 && dp[i][j] === dp[i-1][j-1]+1) {
      out.unshift({text: ref[i-1]+" ← "+said[j-1], kind: "substitute"}); i--; j--;
    } else if(i > 0 && dp[i][j] === dp[i-1][j]+1) {
      out.unshift({text: ref[i-1], kind: "missing"}); i--;
    } else {
      out.unshift({text: said[j-1], kind: "extra"}); j--;
    }
  }
  $("comparison").replaceChildren(...out.map(o => {
    const s = document.createElement("span"); s.className = "word " + o.kind; s.textContent = o.text + " ";
    return s;
  }));
  $("score").textContent = Math.max(0, Math.round((1 - dp[n][m]/ref.length)*100)) + "%";
}

$("surahSelect").onchange = loadSurah;
$("loadQuranBtn").onclick = render;
$("allSurahBtn").onclick = () => { $("fromAyah").value = 1; $("toAyah").value = ayahs.length; render(); };
$("referenceText").oninput = compare;

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if(SR) {
  speech = new SR(); speech.lang = "ar-SA"; speech.continuous = true; speech.interimResults = true;
  speech.onstart = () => { $("startBtn").disabled = true; $("stopBtn").disabled = false; $("recognitionStatus").textContent = "يستمع..."; };
  speech.onresult = e => {
    transcriptText = Array.from(e.results).map(r => r[0].transcript).join(" ");
    $("transcript").textContent = transcriptText;
    compare();
  };
  speech.onend = () => { $("startBtn").disabled = false; $("stopBtn").disabled = true; $("recognitionStatus").textContent = "توقف."; };
  $("startBtn").onclick = () => { transcriptText = ""; speech.start(); };
  $("stopBtn").onclick = () => speech.stop();
} else { $("startBtn").disabled = true; $("recognitionStatus").textContent = "المتصفح لا يدعم التعرف الصوتي."; }

$("clearBtn").onclick = () => { transcriptText = ""; $("transcript").textContent = "ابدأ التسميع..."; compare(); };

init();
</script>
</body>
</html>
