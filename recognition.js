// Recognition matching: compares what you recited with the text
const TH={strict:[.9,.75],normal:[.78,.6],lenient:[.7,.5]};
function trial(rw){
 const[okT,nearT]=TH.normal;
 const s=baseSt.slice(),h=hd.slice();let p=basePos;
 for(let k=basePos;k<h.length;k++)h[k]="";
 const end=Math.min(lim,words.length);
 for(let i=0;i<rw.length&&p<end;i++){
  let hit=-1,score=0,used=1;
  for(let j=p;j<Math.min(p+4,end);j++){
   let sc=sim(rw[i],words[j].n),u=1;
   if(i+1<rw.length){const m=sim(rw[i]+rw[i+1],words[j].n);if(m>sc+.05){sc=m;u=2}}
   if(j+1<end){const m=sim(rw[i],words[j].n+words[j+1].n);if(m>=.85&&m>sc){sc=m;u=-2}}
   if(sc>=nearT&&sc>score+(j>p?.08:0)){hit=j;score=sc;used=u;if(sc>=.95)break}
  }
  if(hit<0)continue;
  for(let k=p;k<hit;k++)s[k]="miss";
  const lab=score>=okT?"ok":"near";
  if(used===-2){s[hit]=s[hit+1]=lab;h[hit]=h[hit+1]=rw[i];p=hit+2}
  else{s[hit]=lab;h[hit]=rw[i];p=hit+1;if(used===2)i++}
 }
 let sc=0;s.forEach((x,k)=>{if(k>=basePos&&k<p)sc+=x==="ok"?1:x==="near"?.5:-.3});
 return{s,p,h,sc};
}
function alignBest(cands){let b=null;for(const rw of cands){const r=trial(rw);if(!b||r.sc>b.sc)b=r}if(b){st=b.s;pos=b.p;hd=b.h}render()}
function htmlOf(i){const w=words[i];if($("tjw").checked){const nx=words[i+1]&&words[i+1].v===w.v?words[i+1].t:"";return tj(w.t,nx)}return w.t}
const fl=t=>((t.match(/[\u0621-\u064A\u0671][^\u0621-\u064A\u0671]*/)||[t])[0])+"…";
$("mMask").onchange=render;
