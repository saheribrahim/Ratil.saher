// Ratil memorization: listen 3x, read aloud with verification 3x, recite from memory 3x
let memOn=false,mv=0,busy=false,lim=1e9,vs=0,hintIdx=-1,memPhase="listen",memCount=0,memAudioRun=false;
function vList(){return[...new Set(words.map(w=>w.v))]}
function vRange(v){let a=-1,b=-1;words.forEach((w,i)=>{if(w.v===v){if(a<0)a=i;b=i+1}});return[a,b]}
function phaseName(){return memPhase==="listen"?"الاستماع":memPhase==="read"?"القراءة بصوتك":"التسميع من الحفظ"}
function memShow(){
 Array.from($("text").children).forEach((l,k)=>{l.style.display=memOn&&k!==mv?"none":""});
 $("memBar").style.display=memOn?"flex":"none";
 if(!memOn){lim=1e9;return}
 const[a,b]=vRange(mv);vs=a;lim=b;
 $("mSt").textContent="الآية "+(vList().indexOf(mv)+1)+"/"+vList().length+" · "+phaseName()+" · "+memCount+"/3";
 $("mStep").style.display=memPhase==="listen"?"none":"";
 $("mStep").textContent=memPhase==="read"?(listening?"⏹ إيقاف القراءة":"🎙 ابدأ القراءة "+(memCount+1)+"/3):(listening?"⏹ إيقاف التسميع":"🎙 ابدأ التسميع "+(memCount+1)+"/3");
 $("mHint").style.display=memPhase==="recite"?"":"none";
 if($("text"))$("text").classList.toggle("mem",memOn&&memPhase==="recite");
}
function memReset(){const vl=vList();$("mFrom").innerHTML=vl.map(v=>`<option value="${v}">${v+1}</option>`).join("");if(memOn&&vl.length)memStart(vl[0]);else memShow()}
function memToggle(){
 memOn=$("hide").checked;window.memOn=memOn;
 if(memOn){const vl=vList(),f=+$("mFrom").value;if(vl.length)memStart(vl.includes(f)?f:vl[0]);}
 else{memAudioRun=false;stopAudio();if(listening)stop();$("text").classList.remove("mem");memShow()}
 render();
}
function memStart(v){
 const[a,b]=vRange(v);if(a<0)return;
 if(listening)stop();stopAudio();mv=v;vs=a;lim=b;busy=false;memPhase="listen";memCount=0;memAudioRun=false;
 for(let i=a;i<b;i++){st[i]="todo";hd[i]=""}pos=a;$("live").textContent="";
 memShow();render();memListenThree();
}
function memListenThree(){
 if(!memOn||memPhase!=="listen"||memAudioRun)return;memAudioRun=true;
 const urls=verseUrls(+$("surah").value,mv+1,$("riwaya").value,"");
 if(!urls){memAudioRun=false;msg("لا يتوفر صوت لهذه الرواية. اختر قارئًا متاحًا أو راجع اتصال الإنترنت.",1);return}
 let n=0;
 const one=()=>{if(!memOn||memPhase!=="listen")return;if(n>=3){memAudioRun=false;memPhase="read";memCount=0;memShow();msg("✅ انتهى الاستماع 3 مرات. ابدأ القراءة بصوتك 3 مرات.");return}
 n++;$("mSt").textContent="الاستماع "+n+"/3";
 playQueue(urls,()=>{memAudioRun=false;msg("تعذّر تشغيل صوت الآية. تحقق من الإنترنت.",1)},()=>setTimeout(one,450));};
 one();
}
function memStep(){
 if(!memOn)return;
 if(listening){stop();memShow();return}
 if(memPhase==="read"||memPhase==="recite"){
  for(let i=vs;i<lim;i++)st[i]="todo";pos=vs;busy=false;$("live").textContent="";
  render();memShow();start();
  msg(memPhase==="read"?"🎙 اقرأ الآية كاملة بصوت واضح. سيُحتسب التكرار بعد مطابقة الآية.":"🎙 سمّع الآية كاملة من حفظك. سيُحتسب التكرار بعد مطابقتها.");
 }
}
function memCheck(){
 if(!memOn||!["read","recite"].includes(memPhase)||busy||pos<lim)return;
 let ok=0;for(let i=vs;i<lim;i++)if(st[i]==="ok")ok++;
 const n=lim-vs,complete=n>0&&ok===n;busy=true;stop();
 if(complete){
  memCount++;memShow();msg("✅ ممتاز! "+phaseName()+" "+memCount+"/3");
  setTimeout(()=>{
   if(!memOn)return;
   if(memCount>=3){
    if(memPhase==="read"){memPhase="recite";memCount=0;for(let i=vs;i<lim;i++)st[i]="todo";pos=vs;render();memShow();msg("📖 أتممت القراءة 3 مرات. الآن سمّع من ذاكرتك 3 مرات.");}
    else{const vl=vList(),k=vl.indexOf(mv);if(k+1<vl.length){memStart(vl[k+1]);msg("ما شاء الله! انتقلنا إلى الآية التالية.");}else{memStart(vl[0]);msg("🎉 أتممت السورة: استماع 3 + قراءة 3 + تسميع 3.");}}
   }else{for(let i=vs;i<lim;i++)st[i]="todo";pos=vs;$("live").textContent="";render();memShow();msg("كرر الآية مرة أخرى لإكمال "+phaseName()+".");}
  },900);
 }else{
  busy=false;for(let i=vs;i<lim;i++)if(st[i]!=="ok")st[i]="todo";pos=vs;$("live").textContent="";
  render();memShow();msg("🔴 لم تتم مطابقة الآية كاملة. حاول مرة أخرى؛ لن يُحسب هذا التكرار.");
 }
}
$("hide").onchange=memToggle;
$("mFrom").onchange=()=>{if(memOn)memStart(+$("mFrom").value)};
$("mStep").onclick=memStep;
$("mHint").onclick=()=>{if(!memOn||memPhase!=="recite"||pos>=lim)return;hintIdx=pos;render();setTimeout(()=>{hintIdx=-1;render()},2500)};
