-- JuegaBGA: esquema de base de datos para Supabase.
-- Pegar completo en Supabase > SQL Editor y ejecutar una sola vez.

------------------------------------------------------------
-- Deportes
------------------------------------------------------------
create table public.sports (
  id text primary key,
  name text not null,
  emoji text not null,
  default_players int not null
);

insert into public.sports (id, name, emoji, default_players) values
  ('futbol', 'Fútbol', '⚽', 10),
  ('padel', 'Pádel', '🎾', 4),
  ('pickleball', 'Pickleball', '🏓', 4),
  ('tenis', 'Tenis', '🎾', 2),
  ('baloncesto', 'Baloncesto', '🏀', 10),
  ('voleibol', 'Voleibol', '🏐', 12);

------------------------------------------------------------
-- Perfiles (uno por usuario registrado)
------------------------------------------------------------
create type public.skill_level as enum ('principiante', 'intermedio', 'avanzado');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  avatar_url text,
  bio text check (char_length(bio) <= 500),
  neighborhood text check (char_length(neighborhood) <= 100),
  created_at timestamptz not null default now()
);

create table public.user_sports (
  user_id uuid references public.profiles on delete cascade,
  sport_id text references public.sports,
  level public.skill_level not null default 'intermedio',
  primary key (user_id, sport_id)
);

-- Crea el perfil automáticamente al registrarse.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------
-- Canchas de Bucaramanga (se cargan desde el panel de Supabase)
------------------------------------------------------------
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  neighborhood text,
  city text not null default 'Bucaramanga',
  sport_ids text[] not null default '{}',
  easycancha_url text,
  created_at timestamptz not null default now()
);

------------------------------------------------------------
-- Convocatorias: "armo partido de pádel el jueves 7pm, faltan 3"
------------------------------------------------------------
create type public.match_status as enum ('abierto', 'completo', 'cancelado');
-- en_espera = lista de espera: pidió unirse cuando el partido ya estaba completo.
create type public.member_status as enum ('pendiente', 'aceptado', 'rechazado', 'en_espera');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles on delete cascade,
  sport_id text not null references public.sports,
  venue_id uuid references public.venues on delete set null,
  place_text text,
  starts_at timestamptz not null,
  -- Cupos que faltan por llenar, sin contar a quien convoca.
  players_needed int not null check (players_needed between 1 and 30),
  -- Lo que paga cada jugador por la cancha, en pesos colombianos. 0 = gratis.
  price_per_player int not null default 0 check (price_per_player >= 0),
  level public.skill_level,
  notes text check (char_length(notes) <= 500),
  status public.match_status not null default 'abierto',
  created_at timestamptz not null default now()
);
create index on public.matches (sport_id, starts_at);

create table public.match_members (
  match_id uuid references public.matches on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  status public.member_status not null default 'pendiente',
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

------------------------------------------------------------
-- Chats: grupo privado por partido + chats directos 1 a 1
------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- null = chat directo entre dos personas
  match_id uuid unique references public.matches on delete cascade,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid references public.conversations on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  body text check (char_length(body) <= 2000),
  image_path text,
  created_at timestamptz not null default now(),
  check (body is not null or image_path is not null)
);
create index on public.messages (conversation_id, created_at);

create function public.is_conversation_member(conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversation_members
    where conversation_id = conv and user_id = auth.uid()
  );
$$;

-- Al crear un partido: se abre su chat y quien convoca queda aceptado.
create function public.handle_new_match() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into conversations (match_id) values (new.id);
  insert into match_members (match_id, user_id, status)
  values (new.id, new.creator_id, 'aceptado');
  return new;
end $$;

create trigger on_match_created
  after insert on public.matches
  for each row execute function public.handle_new_match();

-- No se puede aceptar a nadie si ya no quedan cupos.
create function public.check_match_capacity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  filled int;
  needed int;
begin
  if new.status = 'aceptado' and (tg_op = 'INSERT' or old.status <> 'aceptado') then
    -- Bloquea el partido para que dos aceptaciones simultáneas no pasen el cupo.
    perform 1 from matches where id = new.match_id for update;
    select count(*) - 1 into filled
    from match_members where match_id = new.match_id and status = 'aceptado';
    select players_needed into needed from matches where id = new.match_id;
    -- filled = -1 cuando entra quien convoca (todavía no hay aceptados).
    if filled >= needed then
      raise exception 'El partido ya está completo';
    end if;
  end if;
  return new;
end $$;

create trigger before_match_member_change
  before insert or update on public.match_members
  for each row execute function public.check_match_capacity();

-- Los aceptados entran al chat del partido; el partido se marca completo
-- cuando se llenan los cupos. Si se libera un cupo, el primero de la lista
-- de espera pasa a pendiente para que quien convoca lo acepte.
create function public.sync_match_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m_id uuid := coalesce(new.match_id, old.match_id);
  conv uuid;
  filled int;
  needed int;
begin
  select id into conv from conversations where match_id = m_id;

  if tg_op = 'DELETE' then
    delete from conversation_members where conversation_id = conv and user_id = old.user_id;
  elsif new.status = 'aceptado' then
    insert into conversation_members (conversation_id, user_id)
    values (conv, new.user_id) on conflict do nothing;
  else
    delete from conversation_members where conversation_id = conv and user_id = new.user_id;
  end if;

  select count(*) - 1 into filled
  from match_members where match_id = m_id and status = 'aceptado';
  select players_needed into needed from matches where id = m_id;

  update matches
  set status = case when filled >= needed then 'completo' else 'abierto' end::match_status
  where id = m_id and status <> 'cancelado';

  -- Solo cuando este cambio liberó un cupo, para no vaciar toda la lista.
  if filled < needed and tg_op <> 'INSERT' and old.status = 'aceptado'
     and (tg_op = 'DELETE' or new.status <> 'aceptado') then
    update match_members set status = 'pendiente'
    where (match_id, user_id) = (
      select match_id, user_id from match_members
      where match_id = m_id and status = 'en_espera'
      order by created_at
      limit 1
    );
  end if;

  return null;
end $$;

create trigger on_match_member_change
  after insert or update or delete on public.match_members
  for each row execute function public.sync_match_member();

-- Abre (o reutiliza) un chat directo con otra persona.
create function public.start_direct_chat(other_user uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  conv uuid;
begin
  if other_user = auth.uid() then
    raise exception 'No puedes abrir un chat contigo mismo';
  end if;

  select c.id into conv
  from conversations c
  join conversation_members a on a.conversation_id = c.id and a.user_id = auth.uid()
  join conversation_members b on b.conversation_id = c.id and b.user_id = other_user
  where c.match_id is null
  limit 1;

  if conv is null then
    insert into conversations default values returning id into conv;
    insert into conversation_members (conversation_id, user_id)
    values (conv, auth.uid()), (conv, other_user);
  end if;

  return conv;
end $$;

-- Elimina la cuenta de quien llama y, en cascada, sus datos (Ley 1581 de 2012:
-- derecho de supresión; también lo exigen Apple y Google).
create function public.delete_my_account() returns void
language sql security definer set search_path = public, auth as $$
  delete from auth.users where id = auth.uid();
$$;

------------------------------------------------------------
-- Comunidad: muro por deporte
------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles on delete cascade,
  sport_id text references public.sports,
  body text not null check (char_length(body) between 1 and 2000),
  image_path text,
  created_at timestamptz not null default now()
);
create index on public.posts (sport_id, created_at desc);

------------------------------------------------------------
-- Permisos: los proyectos nuevos de Supabase no dan acceso automático a
-- las tablas. Solo los usuarios con sesión usan la app; RLS decide qué filas.
------------------------------------------------------------
grant usage on schema public to authenticated;
grant select on public.sports, public.venues to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_sports to authenticated;
grant select, insert, update on public.matches to authenticated;
grant select, insert, update, delete on public.match_members to authenticated;
grant select on public.conversations, public.conversation_members to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, delete on public.posts to authenticated;

revoke execute on function public.start_direct_chat(uuid) from public, anon;
grant execute on function public.start_direct_chat(uuid) to authenticated;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke execute on function public.is_conversation_member(uuid) from public, anon;
grant execute on function public.is_conversation_member(uuid) to authenticated;

------------------------------------------------------------
-- Seguridad por filas (RLS)
------------------------------------------------------------
alter table public.sports enable row level security;
alter table public.profiles enable row level security;
alter table public.user_sports enable row level security;
alter table public.venues enable row level security;
alter table public.matches enable row level security;
alter table public.match_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.posts enable row level security;

create policy "deportes visibles" on public.sports
  for select to authenticated using (true);

create policy "perfiles visibles" on public.profiles
  for select to authenticated using (true);
create policy "editar mi perfil" on public.profiles
  for update to authenticated using (id = auth.uid());

create policy "deportes de usuarios visibles" on public.user_sports
  for select to authenticated using (true);
create policy "gestionar mis deportes" on public.user_sports
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "canchas visibles" on public.venues
  for select to authenticated using (true);

create policy "partidos visibles" on public.matches
  for select to authenticated using (true);
create policy "crear partido" on public.matches
  for insert to authenticated with check (creator_id = auth.uid());
create policy "editar mi partido" on public.matches
  for update to authenticated using (creator_id = auth.uid()) with check (creator_id = auth.uid());

create policy "participantes visibles" on public.match_members
  for select to authenticated using (true);
-- Con cupos se pide unirse; sin cupos se entra a la lista de espera.
create policy "pedir unirme" on public.match_members
  for insert to authenticated with check (
    user_id = auth.uid()
    and (
      (status = 'pendiente' and exists (
        select 1 from public.matches m where m.id = match_id and m.status = 'abierto'))
      or (status = 'en_espera' and exists (
        select 1 from public.matches m where m.id = match_id and m.status = 'completo'))
    )
  );
create policy "convocante decide" on public.match_members
  for update to authenticated using (
    exists (select 1 from public.matches m where m.id = match_id and m.creator_id = auth.uid())
  );
create policy "salirme del partido" on public.match_members
  for delete to authenticated using (user_id = auth.uid());

create policy "ver mis chats" on public.conversations
  for select to authenticated using (public.is_conversation_member(id));

create policy "ver miembros de mis chats" on public.conversation_members
  for select to authenticated using (public.is_conversation_member(conversation_id));

create policy "leer mensajes de mis chats" on public.messages
  for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "escribir en mis chats" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid() and public.is_conversation_member(conversation_id)
  );

create policy "publicaciones visibles" on public.posts
  for select to authenticated using (true);
create policy "publicar" on public.posts
  for insert to authenticated with check (author_id = auth.uid());
create policy "borrar mi publicación" on public.posts
  for delete to authenticated using (author_id = auth.uid());

------------------------------------------------------------
-- Imágenes
--   chat-images (privado): ruta "<conversation_id>/<archivo>"
--   post-images (público): ruta "<user_id>/<archivo>"
------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('chat-images', 'chat-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-images', 'post-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "ver imágenes de mis chats" on storage.objects
  for select to authenticated using (
    bucket_id = 'chat-images'
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );
create policy "subir imágenes a mis chats" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'chat-images'
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );
create policy "subir imágenes de publicaciones" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

------------------------------------------------------------
-- Tiempo real para chats y solicitudes
------------------------------------------------------------
alter publication supabase_realtime add table public.messages, public.match_members;
