const fs = require('node:fs');
const vm = require('node:vm');
const verbs = vm.runInNewContext(fs.readFileSync('verben/verbs-data.js','utf8')+';VERBS');
const adjectives = vm.runInNewContext(fs.readFileSync('adjectifs/data.js','utf8')+';ADJECTIVES');
const questions=[];
const add=(id,topic,prompt,label,answers,lang='fr')=>questions.push({id,topic,prompt,label,answers,lang});
verbs.forEach(v=>{
 ['je','tu','il / elle','nous','vous','ils / elles'].forEach((p,i)=>add(`v-${v.n}-${i}`,'Verben',v.inf,`${p} — Präsens${v.reflexive?' (nur die Verbform, ohne Reflexivpronomen)':''}`,v.forms[i]));
 add(`v-${v.n}-de`,'Verben',v.inf,'Eine deutsche Bedeutung',v.de.split(/[,;]/).map(x=>x.trim()),'de');
});
adjectives.forEach(a=>{
 const labels={fs:'Feminin Singular',mp:'Maskulin Plural',fp:'Feminin Plural'};
 for(const [f,l] of Object.entries(labels))add(`a-${a.id}-${f}`,'Adjektive',a.forms.ms[0],l,a.forms[f]);
 add(`a-${a.id}-de`,'Adjektive',a.forms.ms[0],'Eine deutsche Bedeutung',a.de,'de');
 if(a.beforeVowel)add(`a-${a.id}-vowel`,'Adjektive',a.forms.ms[0],'Maskulin vor Vokal / stummem h',[a.beforeVowel]);
});
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const seed='\nbegin;\ninsert into french_private.questions(id,topic,prompt,label,answers,lang) values\n'+questions.map(q=>'('+[q.id,q.topic,q.prompt,q.label,JSON.stringify(q.answers),q.lang].map(quote).join(',')+')').join(',\n')+'\non conflict(id) do update set topic=excluded.topic,prompt=excluded.prompt,label=excluded.label,answers=excluded.answers,lang=excluded.lang;\ncommit;\n';
fs.writeFileSync('supabase/setup.sql',fs.readFileSync('supabase/schema.sql','utf8')+seed);
console.log(`${questions.length} questions; supabase/setup.sql ready`);
