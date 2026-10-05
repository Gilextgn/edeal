-- Phase 2 : appareils, constats d'état, photos.

create type public.device_status as enum ('IN_STOCK', 'CONSIGNED', 'SOLD', 'WITHDRAWN');
create type public.report_type as enum ('INTAKE', 'HANDOVER', 'RETURN', 'SALE');
create type public.condition_grade as enum ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR');
create type public.photo_angle as enum ('FRONT', 'BACK', 'SIDES', 'SCREEN_ON', 'ABOUT', 'DEFECT');

-- 15 chiffres dont le dernier est la clé de Luhn.
create function public.is_valid_imei(p_imei text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_sum integer := 0;
  v_digit integer;
begin
  if p_imei is null or p_imei !~ '^[0-9]{15}$' then
    return false;
  end if;
  for i in 1..15 loop
    v_digit := substr(p_imei, i, 1)::integer;
    if i % 2 = 0 then
      v_digit := v_digit * 2;
      if v_digit > 9 then
        v_digit := v_digit - 9;
      end if;
    end if;
    v_sum := v_sum + v_digit;
  end loop;
  return v_sum % 10 = 0;
end;
$$;

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  -- Propriétaire exclusif : une boutique OU un utilisateur (stock perso).
  shop_id uuid references public.shops (id),
  owner_user_id uuid references public.users (id),
  imei text not null unique check (public.is_valid_imei(imei)),
  model text not null check (length(trim(model)) between 1 and 60),
  capacity text not null check (length(trim(capacity)) between 1 and 20),
  color text not null check (length(trim(color)) between 1 and 40),
  -- Montants en plus petite unité de la devise.
  purchase_price bigint not null check (purchase_price >= 0),
  target_price bigint not null check (target_price >= 0),
  status public.device_status not null default 'IN_STOCK',
  created_by uuid not null default auth.uid() references public.users (id),
  created_at timestamptz not null default now(),
  constraint devices_exactly_one_owner check (num_nonnulls(shop_id, owner_user_id) = 1)
);

create index devices_shop_id_idx on public.devices (shop_id) where shop_id is not null;
create index devices_owner_user_id_idx on public.devices (owner_user_id)
  where owner_user_id is not null;

create table public.condition_reports (
  id uuid primary key,
  device_id uuid not null references public.devices (id),
  type public.report_type not null,
  grade public.condition_grade not null,
  screen_condition text not null
    check (screen_condition in ('PERFECT', 'LIGHT_SCRATCHES', 'SCRATCHED', 'CRACKED')),
  body_condition text not null
    check (body_condition in ('PERFECT', 'LIGHT_WEAR', 'DENTED', 'DAMAGED')),
  -- Inconnue pour un appareil neuf sous blister.
  battery_health integer check (battery_health between 0 and 100),
  face_id_ok boolean not null,
  cameras_ok boolean not null,
  speakers_ok boolean not null,
  charging_ok boolean not null,
  past_repairs text[] not null default '{}'
    check (past_repairs <@ array['SCREEN', 'BATTERY', 'BACK_GLASS', 'CAMERA', 'OTHER']),
  accessories text[] not null default '{}'
    check (accessories <@ array['BOX', 'CABLE', 'CHARGER', 'EARPHONES', 'CASE']),
  icloud_unlocked boolean not null,
  comment text check (length(comment) <= 500),
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

create index condition_reports_device_id_idx on public.condition_reports (device_id);

create table public.photos (
  id uuid primary key,
  report_id uuid not null references public.condition_reports (id),
  -- Clé de l'objet dans le bucket « photos ». L'URL signée est générée à la lecture.
  storage_key text not null unique,
  angle public.photo_angle not null,
  taken_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index photos_report_id_idx on public.photos (report_id);

-- ---------- Immuabilité des constats et des photos ----------

create function private.reject_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'immutable';
end;
$$;

create trigger condition_reports_immutable
  before update or delete on public.condition_reports
  for each row execute function private.reject_change();

create trigger photos_immutable
  before update or delete on public.photos
  for each row execute function private.reject_change();

-- ---------- Droits sur un appareil ----------

-- Lecture : le propriétaire perso ; pour une boutique, le patron et le caissier.
create function private.can_read_device(p_device_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.devices d
    where d.id = p_device_id
      and (
        d.owner_user_id = (select auth.uid())
        or private.my_role(d.shop_id) in ('OWNER', 'CASHIER')
      )
  )
$$;

-- Écriture : le propriétaire perso ; pour une boutique, le patron.
create function private.can_write_device(p_device_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.devices d
    where d.id = p_device_id
      and (
        d.owner_user_id = (select auth.uid())
        or private.my_role(d.shop_id) = 'OWNER'
      )
  )
$$;

-- Les photos sont rangées sous <device_id>/<report_id>/<photo_id>.
create function private.path_device_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end
$$;

revoke all on function private.can_read_device(uuid) from public;
revoke all on function private.can_write_device(uuid) from public;
revoke all on function private.path_device_id(text) from public;
grant execute on function private.can_read_device(uuid) to authenticated;
grant execute on function private.can_write_device(uuid) to authenticated;
grant execute on function private.path_device_id(text) to authenticated;

-- ---------- Politiques d'accès ----------

alter table public.devices enable row level security;
alter table public.condition_reports enable row level security;
alter table public.photos enable row level security;

create policy devices_select on public.devices
  for select to authenticated
  using (
    owner_user_id = (select auth.uid())
    or private.my_role(shop_id) in ('OWNER', 'CASHIER')
  );

create policy devices_insert on public.devices
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and status = 'IN_STOCK'
    and (
      owner_user_id = (select auth.uid())
      or private.my_role(shop_id) = 'OWNER'
    )
  );

create policy devices_update on public.devices
  for update to authenticated
  using (
    owner_user_id = (select auth.uid())
    or private.my_role(shop_id) = 'OWNER'
  )
  with check (
    owner_user_id = (select auth.uid())
    or private.my_role(shop_id) = 'OWNER'
  );

create policy condition_reports_select on public.condition_reports
  for select to authenticated
  using (private.can_read_device(device_id));

-- Visible si le constat l'est (la politique de condition_reports s'applique).
create policy photos_select on public.photos
  for select to authenticated
  using (exists (select 1 from public.condition_reports r where r.id = report_id));

revoke all on public.devices from anon, authenticated;
revoke all on public.condition_reports from anon, authenticated;
revoke all on public.photos from anon, authenticated;
grant select on public.devices to authenticated;
-- Ni le statut, ni l'IMEI, ni le propriétaire ne se modifient directement.
grant insert (id, shop_id, owner_user_id, imei, model, capacity, color, purchase_price, target_price)
  on public.devices to authenticated;
grant update (model, capacity, color, purchase_price, target_price)
  on public.devices to authenticated;
grant select on public.condition_reports to authenticated;
grant select on public.photos to authenticated;

-- ---------- Stockage des photos ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 2097152, array['image/jpeg', 'image/webp']);

-- Ni modification ni suppression : aucune politique UPDATE/DELETE.
create policy photos_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and private.can_write_device(private.path_device_id(name))
  );

create policy photos_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and private.can_read_device(private.path_device_id(name))
  );

-- ---------- Opérations ----------

-- Insère un constat et ses photos, sans contrôle de droits : réservé aux
-- fonctions publiques qui ont déjà vérifié que l'appelant peut agir.
-- Rejouable : un constat déjà enregistré par le même auteur est renvoyé tel quel.
create function private.insert_condition_report(
  p_type public.report_type,
  p_report jsonb,
  p_photos jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid := (p_report ->> 'id')::uuid;
  v_device_id uuid := (p_report ->> 'device_id')::uuid;
  v_existing public.condition_reports;
  v_prefix text;
begin
  if v_id is null or v_device_id is null then
    raise exception 'invalid_report';
  end if;

  select * into v_existing from public.condition_reports where id = v_id;
  if v_existing.id is not null then
    if v_existing.created_by = v_user and v_existing.device_id = v_device_id then
      return v_id;
    end if;
    raise exception 'invalid_report';
  end if;

  if jsonb_typeof(p_photos) is distinct from 'array'
    or jsonb_array_length(p_photos) > 12 then
    raise exception 'missing_photos';
  end if;
  if (
    select count(distinct p ->> 'angle')
    from jsonb_array_elements(p_photos) p
    where p ->> 'angle' in ('FRONT', 'BACK', 'SCREEN_ON', 'ABOUT')
  ) < 4 then
    raise exception 'missing_photos';
  end if;

  v_prefix := v_device_id::text || '/' || v_id::text || '/';
  if exists (
    select 1
    from jsonb_array_elements(p_photos) p
    where left(p ->> 'storage_key', length(v_prefix)) <> v_prefix
      or not exists (
        select 1 from storage.objects o
        where o.bucket_id = 'photos' and o.name = p ->> 'storage_key'
      )
  ) then
    raise exception 'photo_not_uploaded';
  end if;

  insert into public.condition_reports (
    id, device_id, type, grade, screen_condition, body_condition, battery_health,
    face_id_ok, cameras_ok, speakers_ok, charging_ok, past_repairs, accessories,
    icloud_unlocked, comment, created_by
  )
  values (
    v_id,
    v_device_id,
    p_type,
    (p_report ->> 'grade')::public.condition_grade,
    p_report ->> 'screen_condition',
    p_report ->> 'body_condition',
    (p_report ->> 'battery_health')::integer,
    (p_report ->> 'face_id_ok')::boolean,
    (p_report ->> 'cameras_ok')::boolean,
    (p_report ->> 'speakers_ok')::boolean,
    (p_report ->> 'charging_ok')::boolean,
    coalesce(array(select jsonb_array_elements_text(p_report -> 'past_repairs')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p_report -> 'accessories')), '{}'),
    (p_report ->> 'icloud_unlocked')::boolean,
    nullif(trim(p_report ->> 'comment'), ''),
    v_user
  );

  insert into public.photos (id, report_id, storage_key, angle, taken_at)
  select
    (p ->> 'id')::uuid,
    v_id,
    p ->> 'storage_key',
    (p ->> 'angle')::public.photo_angle,
    (p ->> 'taken_at')::timestamptz
  from jsonb_array_elements(p_photos) p;

  return v_id;
end;
$$;

revoke all on function private.insert_condition_report(public.report_type, jsonb, jsonb) from public;

-- Constat d'entrée, ou correction de l'état d'un appareil en stock.
-- Les constats de remise, de retour et de vente sont créés par leurs propres opérations.
create function public.create_intake_report(p_report jsonb, p_photos jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_write_device((p_report ->> 'device_id')::uuid) then
    raise exception 'not_allowed';
  end if;
  return private.insert_condition_report('INTAKE', p_report, p_photos);
end;
$$;

-- Retire un appareil du stock, ou le remet en stock.
create function public.set_device_withdrawn(p_device_id uuid, p_withdrawn boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_write_device(p_device_id) then
    raise exception 'not_allowed';
  end if;

  update public.devices
  set status = case when p_withdrawn then 'WITHDRAWN' else 'IN_STOCK' end::public.device_status
  where id = p_device_id
    and status = case when p_withdrawn then 'IN_STOCK' else 'WITHDRAWN' end::public.device_status;

  if not found then
    raise exception 'invalid_status';
  end if;
end;
$$;

revoke all on function public.create_intake_report(jsonb, jsonb) from public, anon;
revoke all on function public.set_device_withdrawn(uuid, boolean) from public, anon;
grant execute on function public.create_intake_report(jsonb, jsonb) to authenticated;
grant execute on function public.set_device_withdrawn(uuid, boolean) to authenticated;
