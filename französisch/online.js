import {createClient} from './vendor/supabase.js';
import {SUPABASE_URL,SUPABASE_KEY} from './config.js';
const db=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const keys=['karteikarten-verben-v1','karteikarten-adjectifs-v1'];
let user=null, revision=0, syncing=false, dirty=false, conflict=false, run=null, question=null, timer=null, savingAnswer=false, backendReady=false;
const metaKey=id=>'french-sync:'+id;
let muted=localStorage.getItem('french-muted')!=='false';
let audio;
function sound(win=false){
 if(muted)return;
 try {audio ||= new AudioContext();audio.resume();[440,win?660:550,win?880:660].forEach((hz,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=hz;const at=audio.currentTime+i*.09;g.gain.setValueAtTime(.055,at);g.gain.exponentialRampToValueAtTime(.001,at+.12);o.start(at);o.stop(at+.13);});}catch{}
}
function renderSound(){$('sound').textContent=muted?'Ton aus':'Ton an';$('sound').setAttribute('aria-pressed',String(!muted));}
$('sound').onclick=()=>{muted=!muted;localStorage.setItem('french-muted',String(muted));renderSound();sound();};renderSound();
function message(text,error=false){$('online-status').textContent=text;$('online-status').classList.toggle('error',error);}
function readable(e){
 const s=e?.message||String(e);
 if(/Invalid login credentials/.test(s))return 'Benutzername oder Passwort stimmt nicht.';
 if(/Email not confirmed/.test(s))return 'Die Anmeldung ist noch nicht eingerichtet. Bitte den Betreiber kontaktieren.';
 if(/User already registered|Database error saving new user/.test(s))return 'Dieser Benutzername ist bereits vergeben oder die Registrierung ist noch nicht eingerichtet.';
 if(/fetch|network|Failed to fetch/i.test(s))return 'Keine Verbindung. Bitte erneut versuchen.';
 if(/french_api|PGRST202/.test(s))return 'Online-Modus wird noch eingerichtet. Die lokalen Übungen funktionieren weiterhin.';
 return s;
}
async function rpc(action,payload={}){const {data,error}=await db.rpc('french_api',{action,payload});if(error)throw error;return data;}
async function guarded(button,fn){if(button)button.disabled=true;try{await fn();}catch(e){message(readable(e),true);}finally{if(button)button.disabled=false;}}
function setAccount(id){window.frenchUserId=id;window.dispatchEvent(new Event('french-account-change'));}
function localData(){return Object.fromEntries(keys.map(k=>[k,JSON.parse(localStorage.getItem(k+':'+user.id)||'null')]));}
function installProgress(p){revision=p.revision;for(const k of keys){const val=p.data[k];if(val!=null)localStorage.setItem(k+':'+user.id,JSON.stringify(val));else localStorage.removeItem(k+':'+user.id);}conflict=false;dirty=false;localStorage.setItem(metaKey(user.id),JSON.stringify({revision,dirty:false}));$('resolve-sync').hidden=true;}
function markDirty(){dirty=true;localStorage.setItem(metaKey(user.id),JSON.stringify({revision,dirty:true}));}
async function sync(){
 if(!user||!backendReady||syncing||conflict||!dirty)return;
 syncing=true;dirty=false;const id=user.id;
 $('sync-status').textContent='Spielstand wird gespeichert …';
 try{const out=await rpc('save',{data:localData(),revision});if(user?.id===id){revision=out.revision;localStorage.setItem(metaKey(id),JSON.stringify({revision,dirty}));$('sync-status').textContent='Spielstand synchronisiert.';}}
 catch(e){dirty=true;if(/SYNC_CONFLICT/.test(e.message)){conflict=true;$('resolve-sync').hidden=false;$('sync-status').textContent='Auf einem anderen Gerät wurde weitergelernt. Deine Änderungen sind hier gespeichert. Sichere deinen lokalen Stand und lade danach den Cloud-Spielstand.';}else $('sync-status').textContent='Offline: Fortschritt bleibt auf diesem Gerät. Synchronisierung wird erneut versucht.';}
 finally{syncing=false;}
}
addEventListener('storage',e=>{if(user&&keys.some(k=>e.key===k+':'+user.id)){markDirty();void sync();}});
addEventListener('online',()=>void sync());
setInterval(()=>{if(dirty)void sync();},15000);
async function loadHome(initial=false){
 const home=await rpc('home');backendReady=true;
 if(initial){const meta=JSON.parse(localStorage.getItem(metaKey(user.id))||'null');
 if(meta?.dirty){revision=meta.revision;dirty=true;if(revision!==home.progress.revision){conflict=true;$('resolve-sync').hidden=false;$('sync-status').textContent='Lokaler und Cloud-Spielstand unterscheiden sich. Sichere den lokalen Stand, bevor du den Cloud-Spielstand lädst.';}else await sync();}
 else {installProgress(home.progress);$('sync-status').textContent='Spielstand geladen.';}setAccount(user.id);}
 $('account-name').textContent='@'+home.username;
 $('auth-form').hidden=true;$('account').hidden=false;
 $('import-local').hidden=keys.some(k=>home.progress.data[k]!=null)||!keys.some(k=>localStorage.getItem(k));
 renderMatches(home.matches);
 const rankings=await rpc('leaderboard');renderLeaderboard(rankings);
 message('');
}
function el(tag,text,cls){const x=document.createElement(tag);if(text!=null)x.textContent=text;if(cls)x.className=cls;return x;}
function button(label,action){const b=el('button',label,'secondary');b.onclick=()=>guarded(b,action);return b;}
function renderMatches(matches){
 const root=$('matches');root.replaceChildren();if(!matches.length){root.append(el('p','Noch keine Duelle. Fordere jemanden heraus.','small'));return;}
 for(const m of matches){const box=el('div',null,'match');box.append(el('strong',(m.outgoing?'Du gegen @':'@')+m.opponent+(m.outgoing?'':' fordert dich heraus')));
 const expired=new Date(m.expires_at)<new Date();
 if(m.status==='pending'&&!expired){box.append(el('p','Einladung offen · 24 Stunden gültig','small'));for(const [label,action] of m.outgoing?[['Zurückziehen','cancel']]:[['Annehmen','accept'],['Ablehnen','decline']])box.append(button(label,async()=>{await rpc(action,{id:m.id});await loadHome();}));}
 else if(m.status==='accepted'){
 if(m.my_score!=null&&m.their_score!=null){const win=m.my_score>m.their_score||(m.my_score===m.their_score&&m.my_time<m.their_time);const tie=m.my_score===m.their_score&&m.my_time===m.their_time;box.append(el('p',`${tie?'Unentschieden':win?'Gewonnen':'Verloren'} · ${m.my_score}: ${m.their_score} · ${(m.my_time/1000).toFixed(1)} s / ${(m.their_time/1000).toFixed(1)} s`));}
 else if(m.my_score!=null)box.append(el('p',`Dein Ergebnis: ${m.my_score}/10. Die andere Person hat noch nicht abgeschlossen.`));
 else if(m.run_id)box.append(button('Duell spielen',()=>startRun(m.run_id,true)));
 }else box.append(el('p',expired?'Einladung abgelaufen':m.status==='declined'?'Abgelehnt':'Zurückgezogen','small'));
 root.append(box);}
}
function renderLeaderboard(rows){const root=$('leaderboard');root.replaceChildren();if(!rows.length){root.append(el('p','Noch keine Ergebnisse. Sei die erste Person!','small'));return;}const table=el('table');const head=el('tr');for(const h of ['Platz','Name','Richtig','Zeit'])head.append(el('th',h));table.append(head);rows.forEach((r,i)=>{const tr=el('tr');[i+1,'@'+r.username,r.correct+'/10',(r.elapsed_ms/1000).toFixed(1)+' s'].forEach(t=>tr.append(el('td',t)));table.append(tr);});root.append(table);}
$('auth-form').onsubmit=e=>{e.preventDefault();const b=e.submitter;void guarded(b,async()=>{
 const name=$('username').value.trim().toLowerCase(),password=$('password').value;
 if(!/^[a-z0-9_]{3,20}$/.test(name))throw Error('Benutzername: 3–20 Buchstaben, Zahlen oder _.');
 const credentials={email:name+'@learners.example.invalid',password};
 const {data,error}=b.value==='signup'?await db.auth.signUp(credentials):await db.auth.signInWithPassword(credentials);
 $('password').value='';if(error)throw error;
 if(!data.session)throw Error('Der Betreiber muss die E-Mail-Bestätigung in Supabase deaktivieren, damit Konten ohne E-Mail funktionieren.');
 user=data.session.user;await loadHome(true);
 });};
$('logout').onclick=()=>guarded($('logout'),async()=>{await sync();if(dirty)throw Error('Dein Spielstand ist noch nicht synchronisiert. Bitte zuerst die Verbindung oder den Konflikt beheben.');await db.auth.signOut();user=null;backendReady=false;setAccount(null);$('account').hidden=true;$('auth-form').hidden=false;message('Abgemeldet. Du lernst wieder mit deinem lokalen Spielstand.');});
$('import-local').onclick=()=>guarded($('import-local'),async()=>{for(const k of keys){const raw=localStorage.getItem(k);if(raw)localStorage.setItem(k+':'+user.id,raw);}markDirty();await sync();setAccount(user.id);if(!dirty)$('import-local').hidden=true;});
$('resolve-sync').onclick=()=>guarded($('resolve-sync'),async()=>{const backup=new Blob([JSON.stringify(localData(),null,2)],{type:'application/json'});const link=el('a');link.href=URL.createObjectURL(backup);link.download='franzoesisch-spielstand.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);const home=await rpc('home');installProgress(home.progress);setAccount(user.id);$('sync-status').textContent='Cloud-Spielstand geladen. Der bisherige lokale Stand wurde als Datei gesichert.';});
$('refresh').onclick=()=>guarded($('refresh'),()=>loadHome());
$('challenge-form').onsubmit=e=>{e.preventDefault();void guarded(e.submitter,async()=>{await rpc('challenge',{username:$('opponent').value});$('opponent').value='';await loadHome();message('Herausforderung gesendet.');});};
$('ranked-start').onclick=()=>guarded($('ranked-start'),async()=>{const out=await rpc('start');await startRun(out.id,false);});
async function startRun(id,duel){run=id;$('game-kind').textContent=duel?'Duell':'Ranglistentest';if(!$('game').open)$('game').showModal();await next();}
async function next(){
 clearInterval(timer);question=null;$('game-feedback').textContent='Frage wird geladen …';$('next-question').hidden=true;$('answer-form').hidden=true;
 const q=await rpc('question',{id:run});if(q.finished){await finish(q);return;}
 question=q;$('game-counter').textContent=`${q.topic} · Frage ${q.index} / ${q.total}`;$('game-prompt').textContent=q.prompt;$('answer-label').textContent=q.label;$('answer').value='';$('answer-form').hidden=false;$('submit-answer').disabled=false;$('answer').disabled=false;$('game-feedback').textContent='';$('game-feedback').classList.remove('error');$('answer').focus();
 const remaining=Math.max(0,new Date(q.deadline)-new Date(q.server_now));const end=performance.now()+remaining;
 const tick=()=>{const left=Math.max(0,Math.ceil((end-performance.now())/1000));$('game-timer').textContent=`${left} Sekunden`;if(!left&&!savingAnswer)void submitAnswer('');};tick();timer=setInterval(tick,250);
}
async function submitAnswer(value){
 if(savingAnswer||!question)return;savingAnswer=true;clearInterval(timer);$('submit-answer').disabled=true;$('answer').disabled=true;
 try{const out=await rpc('answer',{id:run,index:question.index,answer:value});question=null;$('answer-form').hidden=true;$('game-timer').textContent='';$('game-feedback').textContent=out.correct?'Richtig!':'Leider nicht richtig oder die Zeit ist abgelaufen.';if(out.correct)sound(out.finished&&out.score===out.total);$('next-question').hidden=false;$('next-question').textContent=out.finished?'Ergebnis anzeigen':'Nächste Frage';}
 catch(e){$('game-feedback').textContent=readable(e)+' Lade den aktuellen Stand erneut.';$('game-feedback').classList.add('error');$('next-question').hidden=false;$('next-question').textContent='Stand neu laden';}
 finally{savingAnswer=false;}
}
$('answer-form').onsubmit=e=>{e.preventDefault();void submitAnswer($('answer').value);};
$('next-question').onclick=()=>guarded($('next-question'),next);
async function finish(q){clearInterval(timer);question=null;$('answer-form').hidden=true;$('next-question').hidden=true;$('game-counter').textContent='Abgeschlossen';$('game-timer').textContent='';$('game-prompt').textContent=`${q.score} / ${q.total} richtig`;$('game-feedback').textContent=`Zeit: ${(q.elapsed_ms/1000).toFixed(1)} Sekunden. Dein Ergebnis wurde gespeichert.`;await loadHome();}
$('game-close').onclick=()=>$('game').close();$('game').addEventListener('close',()=>{clearInterval(timer);question=null;});
setInterval(()=>{if(user&&backendReady&&!$('game').open&&!document.hidden)loadHome().catch(()=>{});},30000);
try{
 const settingsResponse=await fetch(SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:SUPABASE_KEY}});
 if(!settingsResponse.ok)throw Error('Die Online-Verbindung konnte nicht hergestellt werden.');
 const settings=await settingsResponse.json();
 if(!settings.mailer_autoconfirm)throw Error('Online-Modus wird noch eingerichtet. Die lokalen Übungen funktionieren weiterhin.');
 const {data,error}=await db.auth.getSession();if(error)throw error;user=data.session?.user||null;if(user)await loadHome(true);else{const check=await db.rpc('french_api',{action:'home',payload:{}});if(check.error&&check.error.code!=='42501')throw check.error;$('auth-form').hidden=false;message('');}}
catch(e){message(readable(e),true);$('auth-form').hidden=true;}
// A sign-in/out in another tab must never save the previous account's data to the new one.
db.auth.onAuthStateChange((_event,session)=>{if(user&&session?.user.id!==user.id){backendReady=false;user=null;setTimeout(()=>location.reload(),0);}});
