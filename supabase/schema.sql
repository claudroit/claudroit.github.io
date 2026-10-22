-- French learning: all game data is private; only the authenticated RPC is exposed.
begin;
create schema if not exists french_private;
revoke all on schema french_private from public, anon, authenticated;
create table if not exists french_private.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
 created_at timestamptz not null default now()
);
create unique index if not exists french_username_unique on french_private.profiles(lower(username));
create table if not exists french_private.progress (
 user_id uuid primary key references french_private.profiles(id) on delete cascade,
 data jsonb not null default '{}'::jsonb, revision integer not null default 0, updated_at timestamptz not null default now()
);
create table if not exists french_private.questions (
 id text primary key, topic text not null, prompt text not null, label text not null,
 answers jsonb not null, lang text not null check (lang in ('fr','de'))
);
create table if not exists french_private.matches (
 id uuid primary key default gen_random_uuid(), challenger uuid not null references french_private.profiles(id),
 opponent uuid not null references french_private.profiles(id), status text not null default 'pending',
 question_ids text[], created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours',
 check (challenger <> opponent), check (status in ('pending','accepted','declined','cancelled'))
);
create table if not exists french_private.runs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references french_private.profiles(id),
 match_id uuid references french_private.matches(id), question_ids text[] not null,
 idx integer not null default 1, correct integer not null default 0, elapsed_ms bigint not null default 0,
 question_started timestamptz, started_at timestamptz, finished_at timestamptz,
 created_at timestamptz not null default now(), answers jsonb not null default '[]'::jsonb,
 unique(match_id,user_id)
);
alter table french_private.profiles enable row level security;
alter table french_private.progress enable row level security;
alter table french_private.questions enable row level security;
alter table french_private.matches enable row level security;
alter table french_private.runs enable row level security;

-- Registration derives the immutable username from Supabase Auth's login identifier.
create or replace function french_private.register_user() returns trigger language plpgsql security definer set search_path='' as $$
declare n text;
begin
 if new.email not like '%@learners.example.invalid' then return new; end if;
 n := split_part(new.email,'@',1);
 if n !~ '^[a-z0-9_]{3,20}$' then raise exception 'Ungültiger Benutzername'; end if;
 insert into french_private.profiles(id,username) values(new.id,n);
 return new;
end $$;
drop trigger if exists french_register_user on auth.users;
create trigger french_register_user after insert on auth.users for each row execute function french_private.register_user();

create or replace function french_private.norm(t text, lang text) returns text language sql immutable set search_path='' as $$
 select case when lang='de' then replace(replace(replace(replace(v,'ß','ss'),'ä','ae'),'ö','oe'),'ü','ue') else v end
 from (select lower(regexp_replace(trim(normalize(coalesce(t,''), NFC)), '\s+', ' ', 'g')) as v) s
$$;
create or replace function french_private.pick_questions() returns text[] language sql volatile set search_path='' as $$
 select array_agg(id order by random()) from (
 (select id from french_private.questions where topic='Verben' order by random() limit 5)
 union all
 (select id from french_private.questions where topic='Adjektive' order by random() limit 5)
 ) q
$$;

-- Expired attempts cannot be abandoned to conceal a loss.
create or replace function french_private.expire_runs() returns void language sql set search_path='' as $$
 update french_private.runs set finished_at=now(), elapsed_ms=elapsed_ms+(cardinality(question_ids)-idx+1)*30000,
 idx=cardinality(question_ids)+1, question_started=null
 where finished_at is null and (started_at < now()-interval '10 minutes'
 or (match_id is not null and exists(select 1 from french_private.matches m where m.id=match_id and m.expires_at<now())))
$$;

create or replace function public.french_api(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare u uuid:=auth.uid(); r french_private.runs; m french_private.matches; q french_private.questions;
 result jsonb; ids text[]; other uuid; correct_answer boolean; spent bigint; rev integer; submitted text; moment timestamptz;
begin
 if u is null then raise exception 'Bitte anmelden.'; end if;
 if not exists(select 1 from french_private.profiles where id=u) then raise exception 'Kein Lernkonto vorhanden.'; end if;
 -- Serialize actions per account, preventing duplicate starts and write races.
 perform 1 from french_private.profiles where id=u for update;
 perform french_private.expire_runs();
 if action='home' then
 select jsonb_build_object('username',username) into result from french_private.profiles where id=u;
 return result || jsonb_build_object(
 'progress',coalesce((select jsonb_build_object('data',data,'revision',revision) from french_private.progress where user_id=u),'{"data":{},"revision":0}'::jsonb),
 'active',coalesce((select jsonb_agg(jsonb_build_object('id',id,'match_id',match_id)) from french_private.runs where user_id=u and finished_at is null),'[]'::jsonb),
 'matches',coalesce((select jsonb_agg(x) from (select m.id,m.status,m.challenger=u as outgoing,
 p.username as opponent,m.expires_at,
 (select id from french_private.runs where match_id=m.id and user_id=u) as run_id,
 (select correct from french_private.runs where match_id=m.id and user_id=u and finished_at is not null) as my_score,
 (select correct from french_private.runs where match_id=m.id and user_id<>u and finished_at is not null) as their_score,
 (select elapsed_ms from french_private.runs where match_id=m.id and user_id=u and finished_at is not null) as my_time,
 (select elapsed_ms from french_private.runs where match_id=m.id and user_id<>u and finished_at is not null) as their_time
 from french_private.matches m join french_private.profiles p on p.id=case when m.challenger=u then m.opponent else m.challenger end
 where u in (m.challenger,m.opponent) order by m.created_at desc limit 30) x),'[]'::jsonb));
 elsif action='save' then
 if octet_length((payload->'data')::text)>500000 or jsonb_typeof(payload->'data') is distinct from 'object' then raise exception 'Ungültiger Spielstand.'; end if;
 insert into french_private.progress(user_id) values(u) on conflict do nothing;
 update french_private.progress set data=payload->'data',revision=revision+1,updated_at=now() where user_id=u and revision=(payload->>'revision')::integer returning revision into rev;
 if rev is null then raise exception 'SYNC_CONFLICT'; end if;
 return jsonb_build_object('revision',rev);
 elsif action='leaderboard' then
 return coalesce((select jsonb_agg(x) from (select p.username,b.correct,b.elapsed_ms from (
 select distinct on(user_id) user_id,correct,elapsed_ms from french_private.runs
 where match_id is null and finished_at is not null order by user_id,correct desc,elapsed_ms
 ) b join french_private.profiles p on p.id=b.user_id order by correct desc,elapsed_ms,p.username limit 50) x),'[]'::jsonb);
 elsif action='start' then
 select * into r from french_private.runs where user_id=u and match_id is null and finished_at is null limit 1;
 if r.id is null then
 if (select count(*) from french_private.runs where user_id=u and match_id is null and created_at>now()-interval '1 hour')>=10 then raise exception 'Maximal 10 Ranglistentests pro Stunde.'; end if;
 ids:=french_private.pick_questions();
 if cardinality(ids) is distinct from 10 then raise exception 'Fragen fehlen noch.'; end if;
 insert into french_private.runs(user_id,question_ids) values(u,ids) returning * into r;
 end if;
 return jsonb_build_object('id',r.id);
 elsif action='challenge' then
 select id into other from french_private.profiles where lower(username)=lower(trim(payload->>'username'));
 if other is null or other=u then raise exception 'Andere Person nicht gefunden.'; end if;
 if (select count(*) from french_private.matches where challenger=u and created_at>now()-interval '1 hour')>=5 then raise exception 'Maximal 5 Herausforderungen pro Stunde.'; end if;
 if exists(select 1 from french_private.matches where challenger=u and opponent=other and status in('pending','accepted') and expires_at>now()
 and (status='pending' or exists(select 1 from french_private.runs where match_id=french_private.matches.id and finished_at is null))) then raise exception 'Dieses Duell läuft bereits.'; end if;
 if (select count(*) from french_private.matches where opponent=other and status='pending' and expires_at>now())>=10 then raise exception 'Diese Person hat bereits zu viele Einladungen.'; end if;
 insert into french_private.matches(challenger,opponent) values(u,other) returning * into m;
 return jsonb_build_object('id',m.id);
 elsif action in ('accept','decline','cancel') then
 select * into m from french_private.matches where id=(payload->>'id')::uuid and u in(challenger,opponent) for update;
 if m.id is null or m.status<>'pending' or m.expires_at<=now() then raise exception 'Einladung nicht mehr verfügbar.'; end if;
 if (action='cancel' and u<>m.challenger) or (action<>'cancel' and u<>m.opponent) then raise exception 'Nicht erlaubt.'; end if;
 if action='accept' then
 ids:=french_private.pick_questions();
 if cardinality(ids) is distinct from 10 then raise exception 'Fragen fehlen noch.'; end if;
 update french_private.matches set status='accepted',question_ids=ids,expires_at=now()+interval '24 hours' where id=m.id;
 insert into french_private.runs(user_id,match_id,question_ids) values(m.challenger,m.id,ids),(m.opponent,m.id,ids);
 else update french_private.matches set status=case when action='cancel' then 'cancelled' else 'declined' end where id=m.id;
 end if;
 return '{}'::jsonb;
 elsif action in ('question','answer','result','forfeit') then
 select * into r from french_private.runs where id=(payload->>'id')::uuid and user_id=u for update;
 if r.id is null then raise exception 'Test nicht gefunden.'; end if;
 if action='forfeit' and r.finished_at is null then
 update french_private.runs set finished_at=now(),elapsed_ms=elapsed_ms+(cardinality(question_ids)-idx+1)*30000,idx=cardinality(question_ids)+1,question_started=null where id=r.id;
 return jsonb_build_object('finished',true);
 end if;
 if action='result' or r.finished_at is not null then
 return jsonb_build_object('finished',r.finished_at is not null,'score',r.correct,'total',cardinality(r.question_ids),'elapsed_ms',r.elapsed_ms);
 end if;
 select * into q from french_private.questions where id=r.question_ids[r.idx];
 if action='question' then
 if r.question_started is null then
 update french_private.runs set question_started=clock_timestamp(),started_at=coalesce(started_at,clock_timestamp()) where id=r.id returning * into r;
 end if;
 return jsonb_build_object('finished',false,'index',r.idx,'total',cardinality(r.question_ids),'topic',q.topic,'prompt',q.prompt,'label',q.label,
 'deadline',least(r.question_started+interval '30 seconds',r.started_at+interval '10 minutes'),'server_now',clock_timestamp());
 end if;
 if r.question_started is null or (payload->>'index')::integer is distinct from r.idx then raise exception 'Frage bereits beantwortet oder nicht gestartet.'; end if;
 submitted:=payload->>'answer';
 if submitted is null or length(submitted)>300 then raise exception 'Ungültige Antwort.'; end if;
 moment:=clock_timestamp();
 spent:=least(30000,greatest(0,floor(extract(epoch from(moment-r.question_started))*1000)::bigint));
 correct_answer:=moment<=r.question_started+interval '30 seconds' and exists(select 1 from jsonb_array_elements_text(q.answers) a where french_private.norm(a,q.lang)=french_private.norm(submitted,q.lang));
 update french_private.runs set correct=correct+case when correct_answer then 1 else 0 end,elapsed_ms=elapsed_ms+spent,
 answers=answers||jsonb_build_array(jsonb_build_object('question',q.id,'answer',submitted,'correct',correct_answer)),idx=idx+1,question_started=null,
 finished_at=case when idx=cardinality(question_ids) then now() else null end where id=r.id returning * into r;
 return jsonb_build_object('correct',correct_answer,'finished',r.finished_at is not null,'score',r.correct,'total',cardinality(r.question_ids));
 else raise exception 'Unbekannte Aktion.';
 end if;
end $$;
revoke all on all tables in schema french_private from public,anon,authenticated;
revoke execute on all functions in schema french_private from public,anon,authenticated;
revoke execute on function public.french_api(text,jsonb) from public,anon;
grant execute on function public.french_api(text,jsonb) to authenticated;
commit;
