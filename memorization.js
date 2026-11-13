// Ratil memorization flow: 3 listens, 3 verified readings, 3 verified recitations
let memOn=false,mv=0,lim=1e9,vs=0,hintIdx=-1;
let memPhase="listen",memCounts={listen:0,read:0,recite:0};
let memAttemptActive=false,memAttemptTokens=[],memWordIndex=0,memAudioBusy=false,memAudioToken=0,memReviewVisible=false,memAttemptErrors=[];

function vList(){return [...new Set(words.map(w=>w.v))]}
function vRange(v){let a=-1,b=-1;words.forEach((w,i)=>{if(w.v===v){if(a<0)a=i;b=i+1}});return[a,b]}
function memTarget(){return words.slice(vs,lim).map(w=>w.n).filter(Boolean)}
function memPhaseLabel(){return memPhase==="listen"?"الاستماع":memPhase==="read"?"القراءة بصوتك":"التسميع من الذاكرة"}
function memShow(){
 const verseLines=$("text").children;
 Array.from(verseLines).forEach((line,k)=>{line.style.display=memOn&&k!==mv?"none":""});
 $("memBar").style.display=memOn?"block":"none";
 window.memOn=memOn;window.memPhase=memPhase;window.memAttemptActive=memAttemptActive;window.memReviewVisible=memReviewVisible;
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
 else if(memAttemptActive)$("mStep").textContent="⏹ إنهاء المحاولة وتصحيحها";
 else $("mStep").textContent=(memPhase==="read"?"🎙 ابدأ القراءة ":"🎙 ابدأ التسميع ")+(memCounts[memPhase]+1)+"/3";
 $("mHint").style.display=memPhase==="recite"?"":"none";
 $("text").classList.toggle("mem",memPhase==="recite"&&!memReviewVisible);
 $("mHelp").textContent=memPhase==="listen"?"استمع إلى الآية كاملة ثلاث مرات؛ اضغط زر الاستماع في كل مرة.":memPhase==="read"?"اقرأ الآية بصوتك. سيُظهر رتّل الكلمات الصحيحة والأخطاء ويطلب إعادة المحاولة حتى تطابق الآية.":"سمّع الآية من حفظك دون النظر إلى النص. بعد المحاولة ستظهر الكلمات التي تحتاج إلى تصحيح.";
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
function memPlayOneSet(urls,token,done){
 let index=0,failed=false,finished=false;
 const finish=ok=>{if(finished)return;finished=true;done(ok)};
 const next=()=>{
  if(token!==memAudioToken||!memOn)return;
  if(index>=urls.length){finish(true);return}
  try{
   const player=new Audio();aud=player;player.preload="auto";player.volume=1;
   player.onended=next;
   player.onerror=()=>{if(!failed){failed=true;finish(false)}};
   player.src=urls[index++];
   const p=player.play();
   if(p&&p.catch)p.catch(()=>{if(!failed){failed=true;finish(false)}});
  }catch(_){if(!failed){failed=true;finish(false)}}
 };
 next();
}
function memPlaySources(sets,token,index=0){
 if(token!==memAudioToken||!memOn)return;
 if(index>=sets.length){memAudioBusy=false;memShow();msg("تعذّر تشغيل صوت الآية من مصادر الصوت. جرّب تحديث الصفحة أو اختيار رواية حفص عن عاصم.",1);return}
 memPlayOneSet(sets[index],token,ok=>{
  if(token!==memAudioToken)return;
  if(ok){
   memAudioBusy=false;memCounts.listen++;memShow();
   if(memCounts.listen>=3){memPhase="read";memShow();msg("✅ انتهى الاستماع 3 مرات. ابدأ القراءة بصوتك.");}
   else msg("✅ اكتمل الاستماع "+memCounts.listen+"/3. اضغط زر الاستماع للتكرار التالي.");
  }else{
   msg("تعذّر المصدر الصوتي الأول، أحاول مصدرًا بديلًا…");
   memPlaySources(sets,token,index+1);
  }
 });
}
function globalAyahNumber(s,a){
 const counts=[7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
 if(s<1||s>114||a<1||a>counts[s-1])return 0;
 return counts.slice(0,s-1).reduce((sum,n)=>sum+n,0)+a;
}
function memBeginListen(){
 const s=+$("surah").value,a=mv+1,riw=$("riwaya").value;
 const sets=[];
 const primary=verseUrls(s,a,riw,"");
 if(primary&&primary.length)sets.push(primary);
 if(riw==="حفص عن عاصم"){
  const globalNo=globalAyahNumber(s,a);
  if(globalNo)sets.push(["https://cdn.islamic.network/quran/audio/128/ar.alafasy/"+globalNo+".mp3"]);
 }
 if(!sets.length){
  msg("لا يوجد ملف صوت متاح لهذه الرواية في هذه الآية. لرواية ورش، اضغط أولًا «تحميل كل سور الرواية» حتى تُحمّل خريطة أرقام الصوت.",1);
  return;
 }
 memCancelAudio();
 const token=memAudioToken;
 memAudioBusy=true;memShow();
 $("mProgress").textContent="تشغيل صوت الآية…";
 msg("🔊 استمع إلى الآية كاملة. لن يُحسب التكرار إلا بعد انتهاء الصوت.");
 memPlaySources(sets,token);
}
function memBeginAttempt(){
 memAttemptTokens=[];memWordIndex=0;memAttemptErrors=[];memReviewVisible=false;memAttemptActive=true;window.memAttemptActive=true;window.memReviewVisible=false;
 for(let i=vs;i<lim;i++){st[i]="todo";hd[i]=""}
 pos=vs;$("live").textContent="";$("mProgress").textContent="";$("mFeedback").textContent="";render();memShow();
 start();
 if(!listening){memAttemptActive=false;window.memAttemptActive=false;memShow();msg("لم يبدأ الميكروفون. استخدم Chrome واسمح للموقع بالوصول إلى الميكروفون.",1);return}
 msg(memPhase==="read"?"🎙 اقرأ الآية كاملة بصوتك. سيقارن رتّل الكلمات التي يسمعها.":"🎙 سمّع الآية كاملة من حفظك. النص مخفي أثناء التسميع.");
}
function memStep(){
 if(!memOn)return;
 if(memPhase==="listen"){if(!memAudioBusy)memBeginListen();return}
 if(memAttemptActive){memFinishAttempt();return;}
 memBeginAttempt();
}
function memCancelAttempt(){
 if(memAttemptActive){memAttemptActive=false;window.memAttemptActive=false;if(typeof listening!=="undefined"&&listening)stop()}
 memAttemptTokens=[];memWordIndex=0;
}
function memTargetEntries(){
 return words.slice(vs,lim).map((w,i)=>({index:vs+i,n:w.n,text:w.t})).filter(x=>x.n);
}
function memUpdateFeedback(){
 const errors=memAttemptErrors;
 if(!errors.length){$("mFeedback").textContent="";return}
 $("mFeedback").textContent=errors.map(e=>"الكلمة الصحيحة: "+e.expected+" — المسموع: "+e.heard).join("  |  ");
}
function memHandleCandidates(candidates){
 if(!memOn||!memAttemptActive||!Array.isArray(candidates))return;
 const target=memTargetEntries();
 let best="",bestScore=-Infinity;
 for(const candidate of candidates){
  const text=String(candidate||"").trim();
  const tokens=text.split(/\s+/).map(norm).filter(Boolean);
  if(!tokens.length)continue;
  let cursor=memWordIndex,exact=0,skips=0,similar=0;
  for(const token of tokens){
   if(cursor>=target.length)break;
   if(token===target[cursor].n){exact++;cursor++;continue}
   let found=-1;
   for(let j=cursor+1;j<Math.min(cursor+4,target.length);j++){
    if(token===target[j].n){found=j;break}
   }
   if(found>=0){skips+=found-cursor;exact++;cursor=found+1;continue}
   let score=0;
   for(let j=cursor;j<Math.min(cursor+2,target.length);j++){
    score=Math.max(score,sim(target[j].n,token));
   }
   similar+=score;
  }
  const score=exact*10+similar-skips*3-Math.abs(tokens.length-(cursor-memWordIndex))*.15;
  if(score>bestScore){bestScore=score;best=text}
 }
 if(best)memHandleTranscript(best);
}
function memHandleTranscript(transcript){
 if(!memOn||!memAttemptActive||!["read","recite"].includes(memPhase))return;
 const tokens=String(transcript||"").split(/\s+/).map(norm).filter(Boolean);
 if(!tokens.length)return;
 memAttemptTokens.push(...tokens);
 const target=memTargetEntries();
 for(const token of tokens){
  if(memWordIndex>=target.length)break;
  const current=target[memWordIndex];
  if(token===current.n){
   st[current.index]="ok";hd[current.index]="";memWordIndex++;continue;
  }
  let found=-1;
  for(let j=memWordIndex+1;j<Math.min(memWordIndex+4,target.length);j++){
   if(token===target[j].n){found=j;break}
  }
  if(found>=0){
   for(let j=memWordIndex;j<found;j++){
    const missed=target[j];st[missed.index]="miss";hd[missed.index]="لم تُسمع";
    memAttemptErrors.push({expected:missed.text,heard:"لم تُسمع"});
   }
   const matched=target[found];st[matched.index]="ok";hd[matched.index]="";memWordIndex=found+1;
  }else{
   const score=typeof sim==="function"?sim(current.n,token):0;
   const status=score>=0.68?"near":"miss";
   st[current.index]=status;hd[current.index]=token;
   memAttemptErrors.push({expected:current.text,heard:token,status});
   memWordIndex++;
  }
 }
 $("live").textContent=String(transcript||"");
 $("mProgress").textContent="مطابقة الكلمات: "+memWordIndex+"/"+target.length+" · الصحيحة: "+target.filter(x=>st[x.index]==="ok").length;
 memUpdateFeedback();
 render();memShow();
 if(memWordIndex>=target.length)memFinishAttempt();
}
function memFinishAttempt(){
 if(!memAttemptActive)return;
 memAttemptActive=false;window.memAttemptActive=false;
 if(typeof listening!=="undefined"&&listening)stop();
 const target=memTargetEntries();
 for(let i=memWordIndex;i<target.length;i++){
  const item=target[i];st[item.index]="miss";hd[item.index]="لم تُسمع";
  memAttemptErrors.push({expected:item.text,heard:"لم تُسمع",status:"miss"});
 }
 const exact=target.length>0&&target.every(x=>st[x.index]==="ok");
 memReviewVisible=!exact;window.memReviewVisible=memReviewVisible;
 $("mProgress").textContent="مطابقة الكلمات: "+target.filter(x=>st[x.index]==="ok").length+"/"+target.length+" · الأخطاء: "+memAttemptErrors.length;
 if(exact){
  memAttemptSuccess();
 }else{
  memShow();render();memUpdateFeedback();
  msg("🔴 لم تطابق القراءة الآية بالكامل. راجع الكلمات الملوّنة، ثم أعد المحاولة. لم يُحتسب هذا التكرار.");
 }
}
function memAttemptSuccess(){
 memReviewVisible=false;window.memReviewVisible=false;
 memCounts[memPhase]++;memShow();render();
 $("mFeedback").textContent="ممتاز! تم التعرف على جميع كلمات الآية بالترتيب.";
 msg("✅ قراءة صحيحة بالكامل! "+memPhaseLabel()+" "+memCounts[memPhase]+"/3");
 setTimeout(()=>{
  if(!memOn)return;
  if(memCounts[memPhase]>=3){
   if(memPhase==="read"){
    memPhase="recite";memReviewVisible=false;window.memReviewVisible=false;
    for(let i=vs;i<lim;i++){st[i]="todo";hd[i]=""}
    render();memShow();
    msg("📖 انتهت 3 قراءات صحيحة. الآن سمّع من ذاكرتك 3 مرات.");
   }else if(memPhase==="recite"){
    const vl=vList(),k=vl.indexOf(mv);
    if(k+1<vl.length){memStart(vl[k+1]);msg("ما شاء الله! انتقلنا إلى الآية التالية.");}
    else{memStart(vl[0]);msg("🎉 أتممت السورة: 3 استماع + 3 قراءة صحيحة + 3 تسميع صحيح.");}
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
