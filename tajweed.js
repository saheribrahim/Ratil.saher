// Ratil: expected-rule extraction from the written, vowelled Quran text.
// This is NOT an acoustic judgement of the reciter's performance.
const TJ={q:"#2d7ff9",g:"#f08a24",m:"#a259ff",iq:"#e84393",ik:"#b5651d",ig:"#0ea5c6",id:"#7cb342"};
const TJN=[["q","قلقلة"],["g","غنة"],["m","مد"],["iq","إقلاب"],["ik","إخفاء"],["ig","إدغام بغنة"],["id","إدغام بغير غنة"]];
const tjIkhfaLetters="صذثكجشقسدطزفتضظ";
const tjIdhghamWithGhunnah="ينمو";
const tjIdhghamWithoutGhunnah="لر";
const tjIzharLetters="ءهعحغخ";

function tjChars(text){
  const out=[];
  const re=/([\u0621-\u064A\u0671])([\u064B-\u065F\u0670\u06D6-\u06ED]*)/g;
  let m;
  while((m=re.exec(String(text||"")))!==null)out.push({base:m[1],marks:m[2]||""});
  return out;
}
function tjAdd(list,code,title,detail){
  if(!list.some(x=>x.code===code&&x.title===title))list.push({code,title,detail});
}
function tjNext(chars,index,nextChars){
  if(index+1<chars.length)return chars[index+1];
  return nextChars&&nextChars.length?nextChars[0]:null;
}
function tjRuleSet(index){
  const w=words[index],result=[];
  if(!w)return result;
  const current=tjChars(w.t);
  const sameVerseNext=words[index+1]&&words[index+1].v===w.v?words[index+1]:null;
  const sameVersePrev=words[index-1]&&words[index-1].v===w.v?words[index-1]:null;
  const next=tjChars(sameVerseNext?sameVerseNext.t:"");
  const prev=tjChars(sameVersePrev?sameVersePrev.t:"");
  const isVerseEnd=!sameVerseNext;

  // Ghunnah and qalqalah signs explicitly present in the written text.
  current.forEach(c=>{
    if(c.base==="ن"&&c.marks.includes("\u0651"))tjAdd(result,"g","غنة نون مشددة","النون عليها شدة في النص؛ مقدار الأداء يحتاج سماعًا.");
    if(c.base==="م"&&c.marks.includes("\u0651"))tjAdd(result,"g","غنة ميم مشددة","الميم عليها شدة في النص؛ مقدار الأداء يحتاج سماعًا.");
    if("قطبجد".includes(c.base)&&c.marks.includes("\u0652"))tjAdd(result,"q","قلقلة","حرف من قطب جد عليه سكون في النص.");
  });

  // Noon sakinah and tanween, including the first letter of the next word.
  current.forEach((c,i)=>{
    const hasTanween=/[\u064B-\u064D]/.test(c.marks);
    const noonSakinah=c.base==="ن"&&c.marks.includes("\u0652");
    if(!hasTanween&&!noonSakinah)return;
    const following=tjNext(current,i,next);
    if(!following)return;
    const b=following.base;
    if(b==="ب")tjAdd(result,"iq","إقلاب","نون ساكنة أو تنوين قبل الباء.");
    else if(tjIkhfaLetters.includes(b))tjAdd(result,"ik","إخفاء حقيقي","نون ساكنة أو تنوين قبل حرف من حروف الإخفاء.");
    else if(tjIdhghamWithGhunnah.includes(b))tjAdd(result,"ig","إدغام بغنة","نون ساكنة أو تنوين قبل ي أو ن أو م أو و.");
    else if(tjIdhghamWithoutGhunnah.includes(b))tjAdd(result,"id","إدغام بغير غنة","نون ساكنة أو تنوين قبل اللام أو الراء.");
    else if(tjIzharLetters.includes(b))tjAdd(result,"g","إظهار حلقي","نون ساكنة أو تنوين قبل حرف حلقي.");
  });

  // Meem sakinah.
  current.forEach((c,i)=>{
    if(c.base!=="م"||!c.marks.includes("\u0652"))return;
    const following=tjNext(current,i,next);
    if(!following)return;
    if(following.base==="ب")tjAdd(result,"ik","إخفاء شفوي","ميم ساكنة قبل الباء.");
    else if(following.base==="م")tjAdd(result,"ig","إدغام شفوي","ميم ساكنة قبل ميم.");
    else tjAdd(result,"g","إظهار شفوي","ميم ساكنة قبل غير الباء والميم.");
  });

  // Common madd categories inferred from written letters and marks.
  current.forEach((c,i)=>{
    const p=current[i-1];
    const isAlif=(c.base==="ا"||c.base==="آ")&&(c.base==="آ"||(p&&p.marks.includes("\u064E")));
    const isWaw=c.base==="و"&&c.marks.includes("\u0652")&&p&&p.marks.includes("\u064F");
    const isYa=c.base==="ي"&&c.marks.includes("\u0652")&&p&&p.marks.includes("\u0650");
    if(!isAlif&&!isWaw&&!isYa)return;
    const before=p&&"ءأإؤئآ".includes(p.base);
    const after=current[i+1]||null;
    const nextWordBeginsHamza=i===current.length-1&&next.length&&"ءأإؤئآٱ".includes(next[0].base);
    if(c.base==="آ"||before)tjAdd(result,"m","مد بدل","همزة قبل حرف المد في الكلمة.");
    else if(after&&"ءأإؤئ".includes(after.base))tjAdd(result,"m","مد واجب متصل","حرف المد وبعده همزة في الكلمة نفسها.");
    else if(nextWordBeginsHamza)tjAdd(result,"m","مد جائز منفصل","حرف المد في آخر كلمة والهمزة في أول الكلمة التالية.");
    else if(after&&(after.marks.includes("\u0651")||after.marks.includes("\u0652")))tjAdd(result,"m","مد لازم كلمي","حرف المد يليه سكون أصلي أو حرف مشدد في الكلمة.");
    else if(isVerseEnd&&i===current.length-2)tjAdd(result,"m","مد عارض للسكون عند الوقف","يظهر هذا الحكم عند الوقف على نهاية الآية، وليس عند الوصل.");
    else tjAdd(result,"m","مد طبيعي","حرف مد ظاهر من الحركات المكتوبة؛ مقدار الأداء لا يُقاس من النص.");
  });

  // Solar / lunar lam.
  if(current.length>=3&&current[0].base==="ا"&&current[1].base==="ل"){
    if(current[2].marks.includes("\u0651"))tjAdd(result,"id","لام شمسية","الحرف بعد لام التعريف مشدد في النص.");
    else tjAdd(result,"id","لام قمرية","لام التعريف ظاهرة قبل الحرف التالي.");
  }

  // Lam of the Divine Name, conditioned by the preceding vowel.
  const isAllah=current.length>=4&&current[0].base==="ا"&&current[1].base==="ل"&&current[2].base==="ل"&&current[3].base==="ه";
  if(isAllah){
    const beforeAllah=prev[prev.length-1]||null;
    if(beforeAllah&&beforeAllah.marks.includes("\u0650"))tjAdd(result,"id","ترقيق لام لفظ الجلالة","سبق لفظ الجلالة كسر ظاهر في النص.");
    else tjAdd(result,"id","تفخيم لام لفظ الجلالة","الأصل التفخيم عند عدم سبق كسر؛ تُراجع مواضع الابتداء والوصل.");
  }

  // Basic ra cases only; exceptions and complex waqf cases need a qualified review.
  current.forEach((c,i)=>{
    if(c.base!=="ر")return;
    if(c.marks.includes("\u064E")||c.marks.includes("\u064F"))tjAdd(result,"q","تفخيم الراء (بحركتها)","الراء مفتوحة أو مضمومة في النص.");
    else if(c.marks.includes("\u0650"))tjAdd(result,"id","ترقيق الراء (بحركتها)","الراء مكسورة في النص.");
    else if(c.marks.includes("\u0652")){
      const before=current[i-1]||prev[prev.length-1]||null;
      if(before&&(before.marks.includes("\u064E")||before.marks.includes("\u064F")))tjAdd(result,"q","تفخيم الراء (بحسب ما قبلها)","الراء ساكنة وقبلها فتح أو ضم ظاهر.");
      else if(before&&(before.marks.includes("\u0650")||before.base==="ي"))tjAdd(result,"id","ترقيق الراء (بحسب ما قبلها)","الراء ساكنة وقبلها كسر أو ياء.");
    }
  });
  return result;
}

function tjRenderReport(){
  const panel=$("tajweedPanel"),rows=$("tajweedRows"),note=$("tajweedNote");
  if(!panel||!rows||!note)return;
  const on=$("tjw")&&$("tjw").checked;
  panel.style.display=on?"block":"none";
  if(!on)return;
  rows.textContent="";
  if(!words.length){note.textContent="حمّل نص الآية أولًا.";return;}
  const fullyMarked=words.some(w=>/[\u064B-\u065F\u0670]/.test(w.t));
  note.textContent=(fullyMarked
    ?"الأحكام التالية مستخرجة من حروف النص وتشكيله، وليست حكمًا على صوت القارئ. المد ومقدار الغنة والمخارج لا تُعتمد إلا بتحليل صوتي متخصص."
    :"النص الحالي غير مشكول بالكامل؛ لذلك لا يمكن استخراج أحكام تعتمد على الحركات والسكون بثقة. حمّل نص المصحف المشكول.")
    +" أحكام الوقف مشروطة بالوقوف على نهاية الآية.";
  let total=0;
  words.forEach((w,i)=>{
    const rules=tjRuleSet(i);
    if(!rules.length)return;
    total+=rules.length;
    const row=document.createElement("div");
    row.className="tj-report-row";
    const word=document.createElement("b");
    word.className="tj-report-word";
    word.textContent=w.t;
    row.appendChild(word);
    const chips=document.createElement("div");
    chips.className="tj-report-chips";
    rules.forEach(rule=>{
      const chip=document.createElement("span");
      chip.className="tj-chip";
      chip.style.setProperty("--tj-chip-color",TJ[rule.code]||"var(--accent)");
      chip.textContent=rule.title;
      chip.title=rule.detail;
      chips.appendChild(chip);
    });
    row.appendChild(chips);
    rows.appendChild(row);
  });
  if(!total){
    const empty=document.createElement("p");
    empty.className="tj-empty";
    empty.textContent="لم تُستخرج أحكام ظاهرة من النص المعروض أو أن النص غير مشكول كفاية.";
    rows.appendChild(empty);
  }
}

$("legend").innerHTML=TJN.map(([k,n])=>'<span><b style="color:'+TJ[k]+'">●</b> '+n+'</span>').join("")+
  '<small>الألوان والتنبيهات هنا استدلال من نص الآية فقط، ولا تثبت صحة النطق أو التجويد صوتيًا.</small>';

function tj(t,nx){
  const cl=[];const re=/([\u0621-\u064A\u0671])([^\u0621-\u064A\u0671]*)/g;let m;
  while((m=re.exec(t))!==null)cl.push([m[1],m[2]]);
  if(!cl.length)return t;
  const first=s=>{const x=(s||"").match(/[\u0621-\u064A\u0671]/);return x?x[0]:"";};
  const L=cl.length;
  return cl.map(([b,mk],i)=>{
    let c="";
    const end=i>=L-1||(i===L-2&&/[اى]/.test(cl[L-1][0])&&!cl[L-1][1]);
    if("قطبجد".includes(b)&&mk.includes("\u0652"))c="q";
    else if("نم".includes(b)&&mk.includes("\u0651"))c="g";
    else if(mk.includes("\u0653")||b==="آ")c="m";
    else{
      const tan=/[\u064B-\u064D]/.test(mk)&&end;
      const ns=b==="ن"&&mk.includes("\u0652");
      if(tan||ns){
        const cross=i===L-1||tan;
        const nb=cross?first(nx):cl[i+1][0];
        if(nb==="ب")c="iq";
        else if(nb&&tjIkhfaLetters.includes(nb))c="ik";
        else if(cross&&tjIdhghamWithGhunnah.includes(nb))c="ig";
        else if(cross&&tjIdhghamWithoutGhunnah.includes(nb))c="id";
      }
    }
    return c?'<i style="color:'+TJ[c]+'">'+b+mk+'</i>':b+mk;
  }).join("");
}
function paint(){
  const on=$("tjw").checked;
  words.forEach((w,i)=>{
    w.m=false;
    if(on){
      const nx=words[i+1]&&words[i+1].v===w.v?words[i+1].t:"";
      w.el.innerHTML=tj(w.t,nx);
    }else w.el.textContent=w.t;
  });
  $("legend").style.display=on?"flex":"none";
  tjRenderReport();
}
$("tjw").onchange=()=>{paint();render()};
