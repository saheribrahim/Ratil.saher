// Ratil - 9-step memorization: listen x3, read x3, recite x3
let memOn=false,mv=0,busy=false,lim=1e9,vs=0,hintIdx=-1,SRc=null,lines=[];
let memPhase="listen",memCount=0,memAudioRun=false;
function vList(){return[...new Set(words.map(w=>w.v))]}
function vRange(v){let a=-1,b=-1;words.forEach((w,i)=>{if(w.v===v){if(a<0)a=i;b=i+1}});return[a,b]}
function phaseName(){return memPhase==="listen"?"الاستماع":memPhase==="read"?"القراءة":"التسميع"}
function memShow(){
 const verseLines=$("text").children;Array.from(verseLines).forEach((l,k)=>{l.style.display=memOn&&k!==mv?"none":""});
 $("memBar").style.display=memOn?"flex":"none";
 if(memOn){const[a,b]=vRange(mv);vs=a;lim=b;$("mSt").textContent="الآية "+(vList().indexOf(mv)+1)+"/"+vList().length+" · "+phaseName()+" "+memCount+"/3";$("mStep").textContent=memPhase==="read"?"✓ أتممت القراءة":"🎙 ابدأ التسميع";$("mStep").style.display=memPhase==="read"||memPhase==="recite"?"":"none";$("mHint").style.display=memPhase==="recite"?"":"none"}else lim=1e9;
}
function memReset(){const vl=vList();$("mFrom").innerHTML=vl.map(v=>`<option value="${v}">${v+1}</option>`).join("");if(memOn&&vl.length)memStart(vl[0]);else memShow()}
function memToggle(){memOn=$("hide").checked;if(memOn){const vl=vList(),f=+$("mFrom").value;if(vl.length)memStart(vl.includes(f)?f:vl[0])}else{memAudioRun=false;stopAudio();memShow()}render()}
function memStart(v){
 const[a,b]=vRange(v);if(a<0)return;if(listening)stop();stopAudio();mv=v;vs=a;lim=b;busy=false;memPhase="listen";memCount=0;memAudioRun=false;
 for(let i=a;i<b;i++){st[i]="todo";hd[i]=""}pos=a;$("live").textContent="";memShow();render();memListenThree();
}
function memListenThree(){
 if(!memOn||memPhase!=="listen"||memAudioRun)return;memAudioRun=true;
 const urls=verseUrls(+$("surah").value,mv+1,$("riwaya").value,"");
 if(!urls){const txt=words.slice(vs,lim).map(w=>w.t).join(" ");let n=0;const play=()=>{if(!memOn)return;if(n>=3){memAudioRun=false;memPhase="read";memCount=0;memShow();msg("انتهى الاستماع 3 مرات. اقرأ الآية 3 مرات ثم اضغط الزر.");return}n++;tts(txt);setTimeout(play,Math.max(3500,txt.length*180))};play();return}
 let n=0;const one=()=>{if(!memOn||memPhase!=="listen")return;if(n>=3){memAudioRun=false;memPhase="read";memCount=0;memShow();msg("✅ انتهى الاستماع 3 مرات. اقرأ الآية 3 مرات ثم اضغط الزر.");return}n++;$("mSt").textContent="الاستماع "+n+"/3";playQueue(urls,()=>{memAudioRun=false;msg("تعذّر تشغيل صوت الآية. تحقق من الإنترنت.",1)},()=>setTimeout(one,450))};one();
}
function memStep(){
 if(!memOn)return;
 if(memPhase==="read"){memCount++;if(memCount>=3){memPhase="recite";memCount=0;msg("🎙 الآن سمّع الآية من حفظك 3 مرات. اضغط ابدأ التسميع.");}memShow();return}
 if(memPhase==="recite"&&!listening){start();msg("🎙 سمّع الآية من حفظك دون النظر إلى النص.")}
}
function memCheck(){
 if(!memOn||memPhase!=="recite"||busy||pos<lim)return;
 let ok=0;for(let i=vs;i<lim;i++)if(st[i]==="ok")ok++;const n=lim-vs,acc=n?ok/n:0;busy=true;
 if(acc>=1){memCount++;memShow();msg("✅ تسميع صحيح! "+memCount+"/3");setTimeout(()=>{if(!memOn)return;if(memCount>=3){stop();const vl=vList(),k=vl.indexOf(mv);if(k+1<vl.length){memStart(vl[k+1]);msg("ما شاء الله! انتقلنا إلى الآية التالية.");}else{memStart(vl[0]);msg("🎉 أتممت السورة: 3 استماع + 3 قراءة + 3 تسميع.");}}else{busy=false;for(let i=vs;i<lim;i++)st[i]="todo";pos=vs;$("live").textContent="";render();memShow();msg("أعد التسميع مرة أخرى.");}},900)}
 else{msg("🔴 لم تكتمل المطابقة. راجع الآية وحاول مرة أخرى.");setTimeout(()=>{if(!memOn)return;busy=false;for(let i=vs;i<lim;i++)st[i]="todo";pos=vs;$("live").textContent="";render();},1800)}
}
$("hide").onchange=memToggle;
$("mFrom").onchange=()=>{if(memOn)memStart(+$("mFrom").value)};
$("mStep").onclick=memStep;
$("mHint").onclick=()=>{if(!memOn||memPhase!=="recite"||pos>=lim)return;hintIdx=pos;render();setTimeout(()=>{hintIdx=-1;render()},2500)};
