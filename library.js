// Library: riwaya/surah menus, import file, download riwayat from Quranpedia
function fillR(sel){const cur=sel||$("riwaya").value;$("riwaya").innerHTML="";[...new Set([...RIW,...Object.keys(LIB)])].forEach(k=>{const o=document.createElement("option");o.value=k;o.textContent=k+(LIB[k]?"":" ⬇");$("riwaya").appendChild(o)});$("riwaya").value=cur||RIW[0]}

function fillS(){const r=LIB[$("riwaya").value]||{};$("surah").innerHTML="";NAMES.forEach((n,i)=>{const o=document.createElement("option");o.value=i+1;o.textContent=(i+1)+". "+n+(r[i+1]?"":" — import needed");o.disabled=!r[i+1];$("surah").appendChild(o)});$("surah").value=Object.keys(r)[0]||1}

function parse(t){const o={};try{const j=JSON.parse(t);if(Array.isArray(j)){j.forEach(x=>{const s=x.sura||x.surah||x.chapter,a=x.aya||x.ayah||x.verse;if(s&&a&&x.text)(o[s]=o[s]||[])[a-1]=x.text})}else Object.keys(j).forEach(k=>{if(Array.isArray(j[k]))o[k]=j[k]});return o}catch(_){}
 t.split(/\r?\n/).forEach(l=>{const m=l.match(/^(\d+)\|(\d+)\|(.+)$/);if(m)(o[+m[1]]=o[+m[1]]||[])[+m[2]-1]=m[3].trim()});return o}

fillR();fillS();$("full").href=/^https?:/.test(location.href)?location.href:"https://claude.ai/artifact/XhxVM7WZSB9m4Kht8RVatw";

if(!(window.SpeechRecognition||window.webkitSpeechRecognition))msg("This browser doesn’t support speech recognition. Open the page in Chrome (Android/desktop) or Safari (iPhone).",true);

$("imp").onclick=()=>$("file").click();

// ---- all riwayat: text from Quranpedia (api.quranpedia.net) ----
const MID={"حفص عن عاصم":1,"ورش":4,"قالون":7,"الدوري":6,"السوسي":10,"شعبة":9,"البزي":5,"قنبل":8};

async function getRiwaya(name,force){
  $("live").textContent="";
  
  // التحقق من التخزين المحلي أولاً لتوفير التحميل المسبق
  if(!LIB[name] || Object.keys(LIB[name]).length < 114) {
    try {
      const saved = localStorage.getItem("tilawa-lib-" + name);
      if(saved) {
        const parsed = JSON.parse(saved);
        if(Object.keys(parsed).length >= 114) {
          LIB[name] = parsed;
        }
      }
    } catch(e){}
  }

  const have=LIB[name]&&Object.keys(LIB[name]).length>=114;
  
  if(MID[name]&&(!have||force)){
    msg("جارٍ تحميل رواية "+name+" (114 سورة كاملة)… Downloading…");
    try{
      const j=await(await fetch("https://api.quranpedia.net/v1/mushafs/"+MID[name])).json(),o={},hm={};
      j.surahs.forEach(s=>{const a=[],m=[];s.ayahs.forEach(x=>{a[x.number-1]=x.text;m[x.number-1]=x.number_in_hafs});
      if(s.id!==1&&s.id!==9&&a[0]){const w=a[0].split(/\s+/);if(norm(w.slice(0,4).join(" "))==="بسماللهالرحمنالرحيم")a[0]=w.slice(4).join(" ")}
      o[s.id]=a;hm[s.id]=m});
      if(Object.keys(o).length<114)throw 0;
      
      LIB[name]=o;HM[name]=hm;
      
      // حفظ السور تلقائياً في التخزين المحلي للمتصفح
      try {
        localStorage.setItem("tilawa-lib-" + name, JSON.stringify(o));
      } catch(_){}

      msg("✅ تم تحميل رواية "+name+" (114 سورة) وتخزينها بنجاح · Loaded.");
    }catch(_){msg("تعذّر التحميل المباشر. تأكد من اتصال الإنترنت، أو استخدم Import.",1)}
  }
  fillR(name);fillS();load();
}

$("net").onclick=()=>getRiwaya($("riwaya").value,true);
$("riwaya").onchange=()=>{stop();getRiwaya($("riwaya").value)};

$("file").onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{const o=parse(String(rd.result)),n=Object.keys(o).length;if(!n){msg("Couldn’t read that file. Use Tanzil’s pipe format (sura|aya|text) or JSON.",true);return}const name=$("riwaya").value;LIB[name]=o;try{const c=Object.assign({},LIB);delete c["Hafs (sample)"];localStorage.setItem("tilawa-lib",JSON.stringify(c))}catch(_){}fillR(name);fillS();stop();load();msg("Imported "+n+" surahs as “"+name+"”.")};rd.readAsText(f,"utf-8");e.target.value=""};

// التحميل التلقائي لرواية "حفص عن عاصم" فور فتح التطبيق
document.addEventListener("DOMContentLoaded", () => {
  const defaultRiwaya = $("riwaya").value || "حفص عن عاصم";
  getRiwaya(defaultRiwaya, false);
});
