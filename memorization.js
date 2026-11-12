// Ratil memorization flow: 3 listens, 3 verified readings, 3 verified recitations
let memOn=false,mv=0,lim=1e9,vs=0,hintIdx=-1;
let memPhase="listen",memCounts={listen:0,read:0,recite:0};
let memAttemptActive=false,memAttemptTokens=[],memWordIndex=0,memAudioBusy=false,memAudioToken=0;

function vList(){return [...new Set(words.map(w=>w.v))]}
function vRange(v){let a=-1,b=-1;words.forEach((w,i)=>{if(w.v===v){if(a<0)a=i;b=i+1}});return[a,b]}
function memTarget(){return words.slice(vs,lim).map(w=>w.n).filter(Boolean)}
function memPhaseLabel(){return memPhase==="listen"?"الاستماع":memPhase==="read"?"القراءة بصوتك":"التسميع من الذاكرة"}
function memShow(){
 const verseLines=$("text").children;
 Array.from(verseLines).forEach((line,k)=>{line.style.display=memOn&&k!==mv?"none":""});
 $("memBar").style.display=memOn?"block":"none";
 window.memOn=memOn;window.memPhase=memPhase;window.memAttemptActive=memAttemptActive;
 if(!memOn){lim=1e9;$("text").classList.remove("mem");return}
 const range=vRange(mv);vs=range[0];lim=range[1];
 $("mPhase").textContent="المرحلة الحالية: "+memPhaseLabel();
 $("mListenCount").textContent=memCounts.listen+"/3";
 $("mReadCount").textContent=memCounts.read+"/3";
 $("mReciteCount").textContent=memCounts.recite+"/3";
 ["listen","read","recite"].forEach((key)=>{
  const el=$("mStage"+key.charAt(0).toUpperCase()+key.slice(1));
  el.classList.toggle("active",key===memPhase);
  el.classList.toggle("done",memCounts[key]===3);
 });
 $("mStep").disabled=memAudioBusy;
 if(memPhase==="listen")$("mStep").textContent=memAudioBusy?"⏳ جارٍ تشغيل الآية…":"🔊 استمع للآية ("+(memCounts.listen+1)+"/3)";
 else if(memAttemptActive)$("mStep").textContent="⏹ إنهاء المحاولة";
 else $("mStep").textContent=(memPhase==="read"?"🎙 ابدأ القراءة ":"🎙 ابدأ التسميع ")+(memCounts[memPhase]+1)+"/3";
 $("mHint").style.display=memPhase==="recite"?"":"none";
 $("text").classList.toggle("mem",memPhase==="recite");
}
function memReset(){
 const vl=vList();
 $("mFrom").innerHTML=vl.map(v=>`<option value="${v}">${v+1}</option>`).join("");
 if(memOn&&vl.length)memStart(vl[0]);else memShow();
}
function memToggle(){
 memOn=$("hide").checked;window.memOn=memOn;
 if(memOn){
  const vl=vList(),chosen=+$("mFrom").value;
  if(!vl.length){msg("حمّل نص السورة أولًا من زر تحميل السور أو استيراد النص.",1);$("hide").checked=false;memOn=false;window.memOn=false;memShow();return}
  memStart(vl.includes(chosen)?chosen:vl[0]);
 }else{
  memCancelAudio();memCancelAttempt();$("text").classList.remove("mem");memShow();render();
 }
}
function memStart(v){
 const [a,b]=vRange(v);if(a<0)return;
 memCancelAudio();memCancelAttempt();
 mv=v;vs=a;lim=b;memPhase="listen";memCounts={listen:0,read:0,recite:0};
 for(let i=a;i<b;i++){st[i]="todo";hd[i]=""}
 pos=a;hintIdx=-1;$("live").textContent="";
 memShow();render();
 msg("ابدأ بالضغط على زر الاستماع. سيُشغّل الآية كاملة ثلاث مرات.");
}
function memCancelAudio(){
 memAudioToken++;memAudioBusy=false;
 if(typeof stopAudio==="function")stopAudio();
}
function memPlayQueue(urls,token){
 let index=0,finished=false;
 const finish=ok=>{
  if(finished||token!==memAudioToken)return;
  finished=true;memAudioBusy=false;
  if(!ok){memShow();msg("لم يعمل الصوت. تأكد من الإنترنت أو اختر رواية يتوفر لها صوت.",1);return}
  memCounts.listen++;memShow();
  if(memCounts.listen>=3){memPhase="read";memShow();msg("✅ انتهى الاستماع 3 مرات. اقرأ الآية بصوتك من زر الميكروفون.");}
  else msg("✅ اكتمل الاستماع "+memCounts.listen+"/3. اضغط زر الاستماع مرة أخرى.");
 };
 const next=()=>{
  if(token!==memAudioToken||!memOn)return;
  if(index>=urls.length){finish(true);return}
  try{
   aud=new Audio(urls[index++]);
   aud.onended=next;aud.onerror=()=>finish(false);
   const p=aud.play();if(p&&p.catch)p.catch(()=>finish(false));
  }catch(_){finish(false)}
 };
 next();
}
function memBeginListen(){
 const urls=verseUrls(+$("surah").value,mv+1,$("riwaya").value,"");
 if(!urls||!urls.length){msg("لا يتوفر صوت لهذه الآية في الرواية المختارة. جرّب حفص عن عاصم أو قارئًا آخر.",1);return}
 memAudioToken++;const token=memAudioToken;memAudioBusy=true;memShow();
 msg("🔊 استمع إلى الآية كاملة حتى ينتهي الصوت.");
 memPlayQueue(urls,token);
}
function memBeginAttempt(){
 memAttemptTokens=[];memWordIndex=0;memAttemptActive=true;window.memAttemptActive=true;
 for(let i=vs;i<lim;i++)st[i]="todo";
 pos=vs;$("live").textContent="";render();memShow();
 start();
 if(!listening){memAttemptActive=false;window.memAttemptActive=false;memShow();msg("لم يبدأ الميكروفون. استخدم Chrome واسمح للموقع بالوصول إلى الميكروفون.",1);return}
 msg(memPhase==="read"?"🎙 اقرأ الآية كاملة بصوتك. سيقارن رتّل الكلمات التي يسمعها.":"🎙 سمّع الآية كاملة من حفظك. النص مخفي أثناء التسميع.");
}
function memStep(){
 if(!memOn)return;
 if(memPhase==="listen"){if(!memAudioBusy)memBeginListen();return}
 if(memAttemptActive){
  memCancelAttempt();
  msg("انتهت المحاولة قبل اكتمال الآية؛ لن تُحتسب. اضغط الزر لإعادتها.");
  return;
 }
 memBeginAttempt();
}
function memCancelAttempt(){
 if(memAttemptActive){memAttemptActive=false;window.memAttemptActive=false;if(typeof listening!=="undefined"&&listening)stop()}
 memAttemptTokens=[];memWordIndex=0;
}
function memHandleTranscript(transcript){
 if(!memOn||!memAttemptActive||!["read","recite"].includes(memPhase))return;
 const tokens=String(transcript||"").split(/\s+/).map(norm).filter(Boolean);
 if(!tokens.length)return;
 memAttemptTokens.push(...tokens);
 const target=memTarget();
 for(const token of tokens){
  if(memWordIndex<target.length&&token===target[memWordIndex])memWordIndex++;
 }
 $("live").textContent=String(transcript||"");
 $("mProgress").textContent="تم التعرف على "+memWordIndex+" من "+target.length+" كلمة";
 if(memWordIndex>=target.length)memAttemptSuccess();
}
function memAttemptSuccess(){
 if(!memAttemptActive)return;
 memAttemptActive=false;window.memAttemptActive=false;
 if(typeof listening!=="undefined"&&listening)stop();
 memCounts[memPhase]++;memShow();
 msg("✅ تم التعرف على الآية كاملة. "+memPhaseLabel()+" "+memCounts[memPhase]+"/3");
 setTimeout(()=>{
  if(!memOn)return;
  if(memCounts[memPhase]>=3){
   if(memPhase==="read"){
    memPhase="recite";memShow();render();
    msg("📖 انتهت 3 قراءات. الآن أخفينا نص الآية: ابدأ التسميع من الذاكرة.");
   }else if(memPhase==="recite"){
    const vl=vList(),k=vl.indexOf(mv);
    if(k+1<vl.length){memStart(vl[k+1]);msg("ما شاء الله! انتقلنا إلى الآية التالية.");}
    else{memStart(vl[0]);msg("🎉 أتممت السورة: 3 استماع + 3 قراءة + 3 تسميع.");}
   }
  }else{
   memShow();msg("✅ تكرار صحيح. ابدأ المحاولة التالية "+(memCounts[memPhase]+1)+"/3.");
  }
 },700);
}
$("hide").onchange=memToggle;
$("mFrom").onchange=()=>{if(memOn)memStart(+$("mFrom").value)};
$("mStep").onclick=memStep;
$("mHint").onclick=()=>{
 if(!memOn||memPhase!=="recite"||!words[pos])return;
 hintIdx=pos;render();setTimeout(()=>{hintIdx=-1;render()},2500);
};
window.memHandleTranscript=memHandleTranscript;
