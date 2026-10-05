-- Phase 1 : boutiques, membres, rôles, taux de commission, invitations.

create type public.member_role as enum ('OWNER', 'DEALER', 'CASHIER');

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  address text check (length(address) <= 200),
  phone text check (length(phone) <= 30),
  currency text not null default 'XOF' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role public.member_role not null,
  -- Points de base : 2500 = 25 %.
  commission_rate_bps integer not null default 0
    check (commission_rate_bps between 0 and 10000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (shop_id, user_id),
  constraint memberships_rate_only_for_dealers
    check (role = 'DEALER' or commission_rate_bps = 0)
);

create unique index memberships_one_owner_per_shop
  on public.memberships (shop_id) where role = 'OWNER';
create index memberships_user_id_idx on public.memberships (user_id);

-- Membre ajouté avant d'avoir créé son compte. Converti en membership
-- à l'inscription (voir handle_new_user).
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  phone text,
  email text,
  role public.member_role not null check (role <> 'OWNER'),
  commission_rate_bps integer not null default 0
    check (commission_rate_bps between 0 and 10000),
  created_at timestamptz not null default now(),
  constraint invitations_one_identifier check (num_nonnulls(phone, email) = 1),
  constraint invitations_rate_only_for_dealers
    check (role = 'DEALER' or commission_rate_bps = 0)
);

create unique index invitations_shop_phone_key
  on public.invitations (shop_id, phone) where phone is not null;
create unique index invitations_shop_email_key
  on public.invitations (shop_id, email) where email is not null;

-- ---------- Fonctions d'aide pour les politiques ----------
-- Dans un schéma non exposé par l'API. SECURITY DEFINER pour lire
-- memberships sans déclencher ses propres politiques (récursion).

create schema private;
grant usage on schema private to authenticated;

create function private.my_role(p_shop_id uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.memberships m
  where m.shop_id = p_shop_id
    and m.user_id = (select auth.uid())
    and m.active
$$;

create function private.is_owner_of_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships theirs
    join public.memberships mine on mine.shop_id = theirs.shop_id
    where theirs.user_id = p_user_id
      and mine.user_id = (select auth.uid())
      and mine.role = 'OWNER'
      and mine.active
  )
$$;

revoke all on function private.my_role(uuid) from public;
revoke all on function private.is_owner_of_user(uuid) from public;
grant execute on function private.my_role(uuid) to authenticated;
grant execute on function private.is_owner_of_user(uuid) to authenticated;

-- ---------- Politiques d'accès ----------

alter table public.shops enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;

create policy shops_select_member on public.shops
  for select to authenticated
  using (private.my_role(id) is not null);

create policy shops_update_owner on public.shops
  for update to authenticated
  using (private.my_role(id) = 'OWNER')
  with check (private.my_role(id) = 'OWNER');

-- Un membre voit sa propre ligne ; le patron voit toute sa boutique.
create policy memberships_select on public.memberships
  for select to authenticated
  using (
    (user_id = (select auth.uid()) and active)
    or private.my_role(shop_id) = 'OWNER'
  );

create policy invitations_select_owner on public.invitations
  for select to authenticated
  using (private.my_role(shop_id) = 'OWNER');

create policy invitations_delete_owner on public.invitations
  for delete to authenticated
  using (private.my_role(shop_id) = 'OWNER');

-- Le patron lit le profil des membres de sa boutique.
create policy users_select_by_owner on public.users
  for select to authenticated
  using (private.is_owner_of_user(id));

-- Les créations et changements de rôle passent par les fonctions ci-dessous.
revoke all on public.shops from anon, authenticated;
revoke all on public.memberships from anon, authenticated;
revoke all on public.invitations from anon, authenticated;
grant select on public.shops to authenticated;
grant update (name, address, phone) on public.shops to authenticated;
grant select on public.memberships to authenticated;
grant select, delete on public.invitations to authenticated;

-- ---------- Opérations ----------
-- Les exceptions portent un code lisible par l'application
-- (clé de messages/fr.json sous "errors").

create function public.create_shop(
  p_name text,
  p_phone text default null,
  p_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_shop uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.shops (name, phone, address)
  values (trim(p_name), nullif(trim(p_phone), ''), nullif(trim(p_address), ''))
  returning id into v_shop;

  insert into public.memberships (shop_id, user_id, role)
  values (v_shop, v_user, 'OWNER');

  return v_shop;
end;
$$;

-- Ajoute un membre par téléphone ou e-mail. Retourne 'member' si le compte
-- existe déjà, 'invitation' sinon.
create function public.add_member(
  p_shop_id uuid,
  p_role public.member_role,
  p_commission_rate_bps integer default 0,
  p_phone text default null,
  p_email text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := regexp_replace(trim(p_phone), '^\+', '');
  v_email text := lower(trim(p_email));
  v_rate integer := case when p_role = 'DEALER' then p_commission_rate_bps else 0 end;
  v_user uuid;
begin
  if private.my_role(p_shop_id) is distinct from 'OWNER' then
    raise exception 'not_owner';
  end if;
  if p_role = 'OWNER' then
    raise exception 'invalid_role';
  end if;
  if num_nonnulls(v_phone, v_email) <> 1
    or (v_phone is not null and v_phone !~ '^[1-9][0-9]{7,14}$')
    or (v_email is not null and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$') then
    raise exception 'invalid_identifier';
  end if;
  if v_rate is null or v_rate not between 0 and 10000 then
    raise exception 'invalid_rate';
  end if;

  select u.id into v_user
  from public.users u
  where u.phone = v_phone or u.email = v_email;

  if v_user is not null then
    begin
      insert into public.memberships (shop_id, user_id, role, commission_rate_bps)
      values (p_shop_id, v_user, p_role, v_rate);
    exception when unique_violation then
      raise exception 'already_member';
    end;
    return 'member';
  end if;

  begin
    insert into public.invitations (shop_id, phone, email, role, commission_rate_bps)
    values (p_shop_id, v_phone, v_email, p_role, v_rate);
  exception when unique_violation then
    raise exception 'already_invited';
  end;
  return 'invitation';
end;
$$;

-- Modifie le rôle, le taux ou l'état d'un membre. Le patron n'est pas modifiable.
create function public.update_member(
  p_membership_id uuid,
  p_role public.member_role,
  p_commission_rate_bps integer,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.memberships;
  v_rate integer := case when p_role = 'DEALER' then p_commission_rate_bps else 0 end;
begin
  select * into v_member from public.memberships where id = p_membership_id;

  if v_member.id is null
    or private.my_role(v_member.shop_id) is distinct from 'OWNER' then
    raise exception 'not_owner';
  end if;
  if v_member.role = 'OWNER' or p_role = 'OWNER' then
    raise exception 'invalid_role';
  end if;
  if v_rate is null or v_rate not between 0 and 10000 then
    raise exception 'invalid_rate';
  end if;

  update public.memberships
  set role = p_role, commission_rate_bps = v_rate, active = coalesce(p_active, active)
  where id = p_membership_id;
end;
$$;

revoke all on function public.create_shop(text, text, text) from public, anon;
revoke all on function public.add_member(uuid, public.member_role, integer, text, text) from public, anon;
revoke all on function public.update_member(uuid, public.member_role, integer, boolean) from public, anon;
grant execute on function public.create_shop(text, text, text) to authenticated;
grant execute on function public.add_member(uuid, public.member_role, integer, text, text) to authenticated;
grant execute on function public.update_member(uuid, public.member_role, integer, boolean) to authenticated;

-- À l'inscription : crée le profil, puis transforme les invitations en
-- attente pour ce téléphone ou cet e-mail en memberships.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := nullif(new.phone, '');
  v_email text := nullif(lower(new.email), '');
begin
  insert into public.users (id, name, phone, email)
  values (new.id, trim(new.raw_user_meta_data ->> 'name'), v_phone, v_email);

  with accepted as (
    delete from public.invitations i
    where i.phone = v_phone or i.email = v_email
    returning i.shop_id, i.role, i.commission_rate_bps
  )
  insert into public.memberships (shop_id, user_id, role, commission_rate_bps)
  select shop_id, new.id, role, commission_rate_bps from accepted;

  return new;
end;
$$;
