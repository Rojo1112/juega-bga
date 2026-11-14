-- Reservas de canchas y publicidad propia.
-- Ejecutar una vez en el SQL Editor de Supabase, después de schema.sql.

create extension if not exists btree_gist;

------------------------------------------------------------
-- Administradores de la plataforma (se agregan solo desde el panel de Supabase)
------------------------------------------------------------
create table public.app_admins (
  user_id uuid primary key references public.profiles on delete cascade
);
alter table public.app_admins enable row level security;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_admins where user_id = auth.uid());
$$;

------------------------------------------------------------
-- Sedes: cada dueño registra la suya y un administrador la aprueba
------------------------------------------------------------
alter table public.venues
  add column owner_id uuid references public.profiles on delete set null,
  add column phone text check (char_length(phone) <= 30),
  add column approved boolean not null default false,
  add constraint venues_text_length check (
    char_length(name) <= 100 and char_length(address) <= 200 and char_length(neighborhood) <= 100
  );
-- Las sedes que ya estaban cargadas siguen visibles.
update public.venues set approved = true;

drop policy "canchas visibles" on public.venues;
create policy "sedes aprobadas o mías" on public.venues
  for select to authenticated using (approved or owner_id = auth.uid() or public.is_admin());
create policy "registrar mi sede" on public.venues
  for insert to authenticated with check (owner_id = auth.uid());
create policy "editar mi sede" on public.venues
  for update to authenticated using (owner_id = auth.uid());

-- El dueño no puede aprobarse a sí mismo: "approved" no está entre las columnas que escribe.
grant insert (name, address, neighborhood, sport_ids, phone, owner_id) on public.venues to authenticated;
grant update (name, address, neighborhood, sport_ids, phone) on public.venues to authenticated;

create function public.approve_venue(venue uuid, ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Solo un administrador puede aprobar sedes';
  end if;
  update venues set approved = ok where id = venue;
end $$;

create function public.owns_venue(venue uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from venues where id = venue and owner_id = auth.uid());
$$;

------------------------------------------------------------
-- Canchas de cada sede y su horario semanal
------------------------------------------------------------
create table public.courts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  sport_id text not null references public.sports,
  -- Precio de un turno completo, en pesos colombianos.
  price_per_slot int not null check (price_per_slot between 0 and 2000000),
  slot_minutes int not null default 60 check (slot_minutes in (30, 60, 90, 120)),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.courts (venue_id);

create table public.court_hours (
  court_id uuid not null references public.courts on delete cascade,
  -- 0 = domingo ... 6 = sábado
  weekday smallint not null check (weekday between 0 and 6),
  opens time not null,
  closes time not null check (closes > opens),
  primary key (court_id, weekday)
);

alter table public.courts enable row level security;
alter table public.court_hours enable row level security;

-- Se ven las canchas de las sedes que el usuario puede ver.
create policy "canchas visibles" on public.courts
  for select to authenticated using (exists (select 1 from public.venues v where v.id = venue_id));
create policy "administrar mis canchas" on public.courts
  for all to authenticated using (public.owns_venue(venue_id)) with check (public.owns_venue(venue_id));

create policy "horarios visibles" on public.court_hours
  for select to authenticated using (exists (select 1 from public.courts c where c.id = court_id));
create policy "administrar mis horarios" on public.court_hours
  for all to authenticated
  using (exists (select 1 from public.courts c where c.id = court_id and public.owns_venue(c.venue_id)))
  with check (exists (select 1 from public.courts c where c.id = court_id and public.owns_venue(c.venue_id)));

grant select, insert, update, delete on public.courts, public.court_hours to authenticated;

------------------------------------------------------------
-- Reservas: solo se crean y cancelan con las funciones de abajo
------------------------------------------------------------
create type public.booking_status as enum ('confirmada', 'cancelada');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  price int not null,
  status public.booking_status not null default 'confirmada',
  -- Vacío mientras no se haya pagado (el cobro en línea se conecta después).
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  -- Dos reservas confirmadas de la misma cancha nunca se cruzan.
  exclude using gist (court_id with =, tstzrange(starts_at, ends_at) with &&) where (status = 'confirmada')
);
create index on public.bookings (user_id, starts_at);

alter table public.bookings enable row level security;

create policy "mis reservas y las de mis sedes" on public.bookings
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.courts c where c.id = court_id and public.owns_venue(c.venue_id))
  );

grant select on public.bookings to authenticated;

create function public.book_court(court uuid, starts timestamptz) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c courts;
  h court_hours;
  local_start timestamp := starts at time zone 'America/Bogota';
  start_min numeric := extract(epoch from local_start::time) / 60;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para reservar';
  end if;

  select co.* into c from courts co join venues v on v.id = co.venue_id
  where co.id = court and co.active and v.approved;
  if not found then
    raise exception 'Esta cancha no está disponible';
  end if;

  if starts <= now() then
    raise exception 'Ese horario ya pasó';
  end if;
  if starts > now() + interval '30 days' then
    raise exception 'Solo se puede reservar con máximo 30 días de anticipación';
  end if;

  select * into h from court_hours
  where court_id = court and weekday = extract(dow from local_start);
  if not found
     or start_min < extract(epoch from h.opens) / 60
     or start_min + c.slot_minutes > extract(epoch from h.closes) / 60
     or mod(start_min - extract(epoch from h.opens) / 60, c.slot_minutes) <> 0 then
    raise exception 'Ese horario no está disponible';
  end if;

  if (select count(*) from bookings
      where user_id = auth.uid() and status = 'confirmada' and starts_at > now()) >= 5 then
    raise exception 'Ya tienes 5 reservas activas. Cancela una para reservar otra.';
  end if;

  insert into bookings (court_id, user_id, starts_at, ends_at, price)
  values (court, auth.uid(), starts, starts + make_interval(mins => c.slot_minutes), c.price_per_slot)
  returning id into new_id;
  return new_id;
exception when exclusion_violation then
  raise exception 'Ese horario ya está reservado';
end $$;

-- El jugador cancela hasta 2 horas antes; el dueño de la sede, hasta la hora de inicio.
create function public.cancel_booking(booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  b bookings;
  is_owner boolean;
begin
  select * into b from bookings where id = booking and status = 'confirmada';
  if not found then
    raise exception 'La reserva no existe o ya fue cancelada';
  end if;

  select owns_venue(c.venue_id) into is_owner from courts c where c.id = b.court_id;
  if is_owner and b.starts_at > now() then
    null;
  elsif b.user_id = auth.uid() and b.starts_at > now() + interval '2 hours' then
    null;
  elsif b.user_id = auth.uid() then
    raise exception 'Solo puedes cancelar hasta 2 horas antes';
  else
    raise exception 'No puedes cancelar esta reserva';
  end if;

  update bookings set status = 'cancelada' where id = booking;
end $$;

-- Turnos ocupados de una cancha en un día (hora de Bogotá), sin revelar quién reservó.
create function public.court_busy(court uuid, day date)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.starts_at, b.ends_at from bookings b
  where b.court_id = court and b.status = 'confirmada'
    and b.starts_at >= day::timestamp at time zone 'America/Bogota'
    and b.starts_at < (day + 1)::timestamp at time zone 'America/Bogota';
$$;

------------------------------------------------------------
-- Publicidad propia: la carga un administrador, sin redes de anuncios ni rastreo
------------------------------------------------------------
create table public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  image_url text not null check (char_length(image_url) <= 500),
  link_url text check (link_url ~ '^https://' and char_length(link_url) <= 500),
  placement text not null check (placement in ('inicio', 'canchas', 'comunidad')),
  starts_on date not null default current_date,
  ends_on date not null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

alter table public.ads enable row level security;

create policy "anuncios vigentes" on public.ads
  for select to authenticated using (current_date between starts_on and ends_on or public.is_admin());
create policy "administrar anuncios" on public.ads
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.ads to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-images', 'ad-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "subir imágenes de anuncios" on storage.objects
  for insert to authenticated with check (bucket_id = 'ad-images' and public.is_admin());
create policy "borrar imágenes de anuncios" on storage.objects
  for delete to authenticated using (bucket_id = 'ad-images' and public.is_admin());

------------------------------------------------------------
-- Las funciones solo las usan usuarios con sesión
------------------------------------------------------------
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.owns_venue(uuid) from public, anon;
revoke execute on function public.approve_venue(uuid, boolean) from public, anon;
revoke execute on function public.book_court(uuid, timestamptz) from public, anon;
revoke execute on function public.cancel_booking(uuid) from public, anon;
revoke execute on function public.court_busy(uuid, date) from public, anon;
grant execute on function public.is_admin(), public.owns_venue(uuid), public.approve_venue(uuid, boolean),
  public.book_court(uuid, timestamptz), public.cancel_booking(uuid), public.court_busy(uuid, date) to authenticated;
