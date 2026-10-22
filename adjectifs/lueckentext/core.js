const ClozeCore=(()=>{
 const fresh=()=>({version:1,items:{},session:null,history:[]});
 const norm=(s,lang='fr')=>{let v=String(s).normalize('NFC').toLowerCase().trim().replace(/[’‘]/g,"'").replace(/\s+/g,' ').replace(/[.!?]+$/,'').trim();if(lang==='de')v=v.replace(/ß/g,'ss').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue');return v;};
 function check(task,answers){return task.gaps.map((g,i)=>g.answers.some(a=>norm(a,g.lang)===norm(answers[i]||'',g.lang)));}
 const shuffle=(a,random=Math.random)=>{const out=[...a];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
 function select(state,tasks,topic,mode,now=Date.now(),random=Math.random){
  let pool=tasks.filter(t=>topic==='all'||t.topic===topic);
  if(mode==='weak')pool=pool.filter(t=>{const e=state.items[t.id];return e&&e.streak<2;});
  if(mode==='exam'){
   const chapters=[...new Set(pool.map(t=>t.topic))];return chapters.flatMap(c=>shuffle(pool.filter(t=>t.topic===c),random).slice(0,3)).map(t=>t.id);
  }
  const priority=t=>{const e=state.items[t.id];return !e?2:e.streak<2?0:e.due<=now?1:3;};
  const chosen=[];
  for(const rank of [0,1,2,3]){
   const bucket=shuffle(pool.filter(t=>priority(t)===rank),random),topics=shuffle([...new Set(bucket.map(t=>t.topic))],random);
   const groups=topics.map(c=>bucket.filter(t=>t.topic===c));
   while(groups.some(g=>g.length)&&chosen.length<12)for(const g of groups){if(g.length&&chosen.length<12)chosen.push(g.shift().id);}
  }
  return chosen;
 }
 function start(state,tasks,topic,mode,now=Date.now(),random=Math.random){
  if(state.session&&!state.session.finished)return state.session;
  const ids=select(state,tasks,topic,mode,now,random);if(!ids.length)return null;
  state.session={ids,topic,mode,index:0,results:[],draft:[],hint:false,feedback:null,repeated:[],finished:false,started:now};return state.session;
 }
 function record(state,task,answers,now=Date.now()){
  const s=state.session;if(!s||s.finished||s.feedback||s.ids[s.index]!==task.id)throw Error('Already answered or wrong task');
  const checks=check(task,answers),perfect=checks.every(Boolean),unaided=perfect&&!s.hint;
  const e=state.items[task.id]||{attempts:0,streak:0,due:0};e.attempts++;e.streak=unaided?e.streak+1:0;e.due=now+(e.streak>=3?3*86400000:e.streak>=2?86400000:0);state.items[task.id]=e;
  const result={id:task.id,answers:[...answers],checks,perfect,unaided,hint:s.hint};s.results.push(result);s.feedback=result;s.draft=[...answers];
  if(!unaided&&s.mode!=='exam'&&!s.repeated.includes(task.id)){s.ids.splice(Math.min(s.ids.length,s.index+4),0,task.id);s.repeated.push(task.id);}
  return result;
 }
 function next(state,now=Date.now()){
  const s=state.session;if(!s?.feedback)return;s.index++;s.feedback=null;s.draft=[];s.hint=false;
  if(s.index>=s.ids.length){s.finished=true;state.history.push({at:now,mode:s.mode,total:s.results.length,correct:s.results.filter(r=>r.unaided).length});state.history=state.history.slice(-20);}
 }
 function validate(s,tasks){const ids=new Set(tasks.map(t=>t.id));if(s?.version!==1||!s.items||Array.isArray(s.items)||!Array.isArray(s.history))return false;const r=s.session;return !r||(Array.isArray(r.ids)&&r.ids.every(id=>ids.has(id))&&Number.isInteger(r.index)&&r.index>=0&&r.index<=r.ids.length&&Array.isArray(r.results)&&Array.isArray(r.repeated)&&Array.isArray(r.draft)&&['learn','weak','exam'].includes(r.mode));}
 return {fresh,norm,check,select,start,record,next,validate};
})();
if(typeof module!=='undefined')module.exports=ClozeCore;
