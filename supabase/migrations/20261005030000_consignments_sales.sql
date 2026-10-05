-- Phase 3 : clients, dépôts, ventes, calcul des parts.

create type public.consignment_status as enum ('ACTIVE', 'SOLD', 'RETURNED', 'SETTLED');
create type public.sale_type as enum ('SHOP', 'PERSONAL');
create type public.sale_status as enum ('PENDING_APPROVAL', 'COMPLETED', 'REJECTED', 'CANCELLED');

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  -- Propriétaire exclusif : une boutique OU un utilisateur (clientèle perso).
  shop_id uuid references public.shops (id),
  owner_user_id uuid references public.users (id),
  name text not null check (length(trim(name)) between 1 and 80),
  phone text check (length(phone) <= 30),
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  constraint customers_exactly_one_owner check (num_nonnulls(shop_id, owner_user_id) = 1)
);

create index customers_shop_id_idx on public.customers (shop_id) where shop_id is not null;
create index customers_owner_user_id_idx on public.customers (owner_user_id)
  where owner_user_id is not null;

create table public.consignments (
  id uuid primary key,
  device_id uuid not null references public.devices (id),
  -- shop_id et dealer_user_id répètent ce que dit membership_id : ils servent
  -- aux politiques d'accès et ne sont écrits que par create_consignment.
  shop_id uuid not null references public.shops (id),
  membership_id uuid not null references public.memberships (id),
  dealer_user_id uuid not null references public.users (id),
  handover_report_id uuid not null unique references public.condition_reports (id),
  return_report_id uuid unique references public.condition_reports (id),
  handed_over_on date not null default current_date,
  due_on date not null,
  -- Garde-fou : vendre en dessous exige la validation du patron.
  floor_price bigint not null check (floor_price >= 0),
  status public.consignment_status not null default 'ACTIVE',
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  constraint consignments_due_after_handover check (due_on >= handed_over_on)
);

create unique index consignments_one_active_per_device
  on public.consignments (device_id) where status = 'ACTIVE';
create index consignments_shop_id_idx on public.consignments (shop_id);
create index consignments_dealer_user_id_idx on public.consignments (dealer_user_id);

create table public.sales (
  id uuid primary key,
  device_id uuid not null references public.devices (id),
  -- Boutique concernée ; vide pour une vente PERSONAL.
  shop_id uuid references public.shops (id),
  consignment_id uuid references public.consignments (id),
  customer_id uuid not null references public.customers (id),
  seller_user_id uuid not null references public.users (id),
  report_id uuid not null unique references public.condition_reports (id),
  type public.sale_type not null,
  status public.sale_status not null,
  sale_price bigint not null check (sale_price >= 0),
  -- Copiés au moment de la vente : modifier l'appareil ou le taux ensuite
  -- ne réécrit pas l'historique.
  purchase_price bigint not null check (purchase_price >= 0),
  commission_rate_bps integer not null check (commission_rate_bps between 0 and 10000),
  shop_share bigint,
  dealer_share bigint,
  warranty_days integer not null default 0 check (warranty_days between 0 and 730),
  decided_by uuid references public.users (id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sales_personal_has_no_shop
    check ((type = 'PERSONAL') = (shop_id is null) and (type = 'SHOP' or consignment_id is null)),
  -- Pas de parts tant que la vente n'est pas validée ; ensuite elles
  -- se partagent exactement le prix de vente.
  constraint sales_shares_match_status check (
    (status in ('PENDING_APPROVAL', 'REJECTED') and shop_share is null and dealer_share is null)
    or (
      status in ('COMPLETED', 'CANCELLED')
      and shop_share >= 0
      and dealer_share >= 0
      and shop_share + dealer_share = sale_price
    )
  ),
  constraint sales_personal_gives_nothing_to_shop
    check (type = 'SHOP' or shop_share = 0)
);

create unique index sales_one_open_per_device
  on public.sales (device_id) where status in ('PENDING_APPROVAL', 'COMPLETED');
create index sales_shop_id_idx on public.sales (shop_id) where shop_id is not null;
create index sales_seller_user_id_idx on public.sales (seller_user_id);
create index sales_consignment_id_idx on public.sales (consignment_id)
  where consignment_id is not null;

-- ---------- Calcul des parts ----------
-- Fait foi. src/domain/shares.ts en est la copie côté application (aperçu
-- à l'écran) ; un test vérifie que les deux donnent le même résultat.

create function private.compute_dealer_share(
  p_sale_price bigint,
  p_purchase_price bigint,
  p_rate_bps integer
)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select greatest(0::numeric, floor(p_rate_bps::numeric * (p_sale_price - p_purchase_price) / 10000))::bigint
$$;

create function public.preview_shares(
  p_sale_price bigint,
  p_purchase_price bigint,
  p_rate_bps integer
)
returns table (dealer_share bigint, shop_share bigint)
language sql
immutable
set search_path = ''
as $$
  select
    private.compute_dealer_share(p_sale_price, p_purchase_price, p_rate_bps),
    p_sale_price - private.compute_dealer_share(p_sale_price, p_purchase_price, p_rate_bps)
$$;

-- ---------- Droits du dealer sur ce qui lui est confié ----------

-- Vrai si l'appareil est, ou a été, confié à l'utilisateur (membre toujours actif).
create function private.is_my_consigned_device(p_device_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.consignments c
    join public.memberships m on m.id = c.membership_id
    where c.device_id = p_device_id
      and c.dealer_user_id = (select auth.uid())
      and m.active
  )
$$;

-- Le dealer lit les constats de ses propres dépôts (remise, retour) et de
-- ses ventes — pas les autres constats de l'appareil.
create function private.dealer_can_read_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.consignments c
    join public.memberships m on m.id = c.membership_id
    where c.dealer_user_id = (select auth.uid())
      and m.active
      and (
        p_report_id in (c.handover_report_id, c.return_report_id)
        or exists (
          select 1 from public.sales s
          where s.consignment_id = c.id and s.report_id = p_report_id
        )
      )
  )
$$;

-- Qui peut créer un constat (et donc envoyer des photos) pour un appareil :
-- le propriétaire perso, le patron, le caissier, et le dealer pendant son dépôt.
create function private.can_report_on_device(p_device_id uuid)
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
        or exists (
          select 1
          from public.consignments c
          where c.device_id = d.id
            and c.status = 'ACTIVE'
            and c.dealer_user_id = (select auth.uid())
            and private.my_role(c.shop_id) = 'DEALER'
        )
      )
  )
$$;

create function private.path_report_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 2)::uuid
  end
$$;

revoke all on function private.compute_dealer_share(bigint, bigint, integer) from public;
revoke all on function private.is_my_consigned_device(uuid) from public;
revoke all on function private.dealer_can_read_report(uuid) from public;
revoke all on function private.can_report_on_device(uuid) from public;
revoke all on function private.path_report_id(text) from public;
grant execute on function private.compute_dealer_share(bigint, bigint, integer) to authenticated;
grant execute on function private.is_my_consigned_device(uuid) to authenticated;
grant execute on function private.dealer_can_read_report(uuid) to authenticated;
grant execute on function private.can_report_on_device(uuid) to authenticated;
grant execute on function private.path_report_id(text) to authenticated;
revoke all on function public.preview_shares(bigint, bigint, integer) from public, anon;
grant execute on function public.preview_shares(bigint, bigint, integer) to authenticated;

-- ---------- Politiques d'accès ----------

alter table public.customers enable row level security;
alter table public.consignments enable row level security;
alter table public.sales enable row level security;

-- Clients perso : leur propriétaire seulement. Clients boutique : le patron
-- et le caissier ; le dealer ne voit que ceux qu'il a lui-même enregistrés.
create policy customers_select on public.customers
  for select to authenticated
  using (
    owner_user_id = (select auth.uid())
    or private.my_role(shop_id) in ('OWNER', 'CASHIER')
    or (private.my_role(shop_id) = 'DEALER' and created_by = (select auth.uid()))
  );

create policy consignments_select on public.consignments
  for select to authenticated
  using (
    private.my_role(shop_id) = 'OWNER'
    or (dealer_user_id = (select auth.uid()) and private.my_role(shop_id) = 'DEALER')
  );

-- Vente perso : son vendeur seulement, jamais la boutique.
create policy sales_select on public.sales
  for select to authenticated
  using (
    (type = 'PERSONAL' and seller_user_id = (select auth.uid()))
    or private.my_role(shop_id) in ('OWNER', 'CASHIER')
    or (seller_user_id = (select auth.uid()) and private.my_role(shop_id) = 'DEALER')
  );

create policy devices_select_consigned on public.devices
  for select to authenticated
  using (private.is_my_consigned_device(id));

create policy condition_reports_select_dealer on public.condition_reports
  for select to authenticated
  using (private.dealer_can_read_report(id));

drop policy photos_objects_insert on storage.objects;
create policy photos_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and private.can_report_on_device(private.path_device_id(name))
  );

drop policy photos_objects_select on storage.objects;
create policy photos_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (
      private.can_read_device(private.path_device_id(name))
      or private.dealer_can_read_report(private.path_report_id(name))
    )
  );

-- Aucune écriture directe : tout passe par les opérations ci-dessous.
revoke all on public.customers from anon, authenticated;
revoke all on public.consignments from anon, authenticated;
revoke all on public.sales from anon, authenticated;
grant select on public.customers to authenticated;
grant select on public.consignments to authenticated;
grant select on public.sales to authenticated;

-- ---------- Opérations ----------
-- Toutes sont rejouables : l'identifiant est créé sur le téléphone, et un
-- second envoi du même identifiant ne fait rien de plus.

-- Confie un appareil en stock à un dealer de la boutique.
create function public.create_consignment(p_consignment jsonb, p_report jsonb, p_photos jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid := (p_consignment ->> 'id')::uuid;
  v_device public.devices;
  v_member public.memberships;
  v_existing public.consignments;
  v_due_on date := (p_consignment ->> 'due_on')::date;
  v_floor bigint := (p_consignment ->> 'floor_price')::bigint;
  v_report uuid;
begin
  select * into v_existing from public.consignments where id = v_id;
  if v_existing.id is not null then
    if v_existing.created_by = v_user then
      return v_id;
    end if;
    raise exception 'not_allowed';
  end if;

  select * into v_device from public.devices
  where id = (p_consignment ->> 'device_id')::uuid
  for update;
  if v_device.id is null or v_device.shop_id is null
    or private.my_role(v_device.shop_id) is distinct from 'OWNER' then
    raise exception 'not_allowed';
  end if;
  if v_device.status <> 'IN_STOCK' then
    raise exception 'device_unavailable';
  end if;
  if (p_report ->> 'device_id')::uuid is distinct from v_device.id then
    raise exception 'invalid_report';
  end if;

  select * into v_member from public.memberships
  where id = (p_consignment ->> 'membership_id')::uuid
    and shop_id = v_device.shop_id
    and role = 'DEALER'
    and active;
  if v_member.id is null then
    raise exception 'invalid_dealer';
  end if;
  if v_due_on is null or v_due_on < current_date then
    raise exception 'invalid_due_date';
  end if;
  if v_floor is null or v_floor < 0 then
    raise exception 'invalid_price';
  end if;

  v_report := private.insert_condition_report('HANDOVER', p_report, p_photos);

  insert into public.consignments (
    id, device_id, shop_id, membership_id, dealer_user_id, handover_report_id,
    due_on, floor_price, created_by
  )
  values (
    v_id, v_device.id, v_device.shop_id, v_member.id, v_member.user_id, v_report,
    v_due_on, v_floor, v_user
  );

  update public.devices set status = 'CONSIGNED' where id = v_device.id;
  return v_id;
end;
$$;

-- Enregistre le retour d'un appareil confié : il revient en stock.
create function public.return_consignment(p_consignment_id uuid, p_report jsonb, p_photos jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_consignment public.consignments;
  v_report uuid;
begin
  select * into v_consignment from public.consignments
  where id = p_consignment_id
  for update;
  if v_consignment.id is null
    or private.my_role(v_consignment.shop_id) is distinct from 'OWNER' then
    raise exception 'not_allowed';
  end if;
  if v_consignment.status = 'RETURNED'
    and v_consignment.return_report_id = (p_report ->> 'id')::uuid then
    return;
  end if;
  if v_consignment.status <> 'ACTIVE' then
    raise exception 'consignment_closed';
  end if;
  if exists (
    select 1 from public.sales
    where consignment_id = v_consignment.id and status = 'PENDING_APPROVAL'
  ) then
    raise exception 'sale_pending';
  end if;
  if (p_report ->> 'device_id')::uuid is distinct from v_consignment.device_id then
    raise exception 'invalid_report';
  end if;

  v_report := private.insert_condition_report('RETURN', p_report, p_photos);

  update public.consignments
  set status = 'RETURNED', return_report_id = v_report
  where id = v_consignment.id;
  update public.devices set status = 'IN_STOCK' where id = v_consignment.device_id;
end;
$$;

-- Enregistre une vente. Le type se déduit de l'appareil et du vendeur :
--   appareil perso du vendeur            -> vente PERSONAL, rien pour la boutique ;
--   appareil confié au vendeur (dealer)  -> vente SHOP avec commission ;
--   appareil en stock (patron, caissier) -> vente SHOP directe, sans commission.
-- Retourne le statut de la vente.
create function public.create_sale(p_sale jsonb, p_report jsonb, p_photos jsonb)
returns public.sale_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid := (p_sale ->> 'id')::uuid;
  v_price bigint := (p_sale ->> 'sale_price')::bigint;
  v_warranty integer := coalesce((p_sale ->> 'warranty_days')::integer, 0);
  v_customer_id uuid := (p_sale ->> 'customer_id')::uuid;
  v_customer_name text := nullif(trim(p_sale ->> 'customer_name'), '');
  v_existing public.sales;
  v_device public.devices;
  v_consignment public.consignments;
  v_customer public.customers;
  v_role public.member_role;
  v_type public.sale_type;
  v_status public.sale_status := 'COMPLETED';
  v_rate integer := 0;
  v_dealer_share bigint;
  v_shop_share bigint;
  v_report uuid;
begin
  select * into v_existing from public.sales where id = v_id;
  if v_existing.id is not null then
    if v_existing.seller_user_id = v_user then
      return v_existing.status;
    end if;
    raise exception 'not_allowed';
  end if;

  if v_price is null or v_price < 0 then
    raise exception 'invalid_price';
  end if;
  if v_warranty not between 0 and 730 then
    raise exception 'invalid_warranty';
  end if;

  select * into v_device from public.devices
  where id = (p_sale ->> 'device_id')::uuid
  for update;
  if v_device.id is null then
    raise exception 'not_allowed';
  end if;
  if (p_report ->> 'device_id')::uuid is distinct from v_device.id then
    raise exception 'invalid_report';
  end if;

  if v_device.owner_user_id = v_user then
    v_type := 'PERSONAL';
    if v_device.status <> 'IN_STOCK' then
      raise exception 'device_unavailable';
    end if;
  elsif v_device.shop_id is not null then
    v_type := 'SHOP';
    v_role := private.my_role(v_device.shop_id);
    if v_device.status = 'CONSIGNED' then
      select * into v_consignment from public.consignments
      where device_id = v_device.id and status = 'ACTIVE'
      for update;
      if v_consignment.id is null
        or v_consignment.dealer_user_id <> v_user
        or v_role is distinct from 'DEALER' then
        raise exception 'not_allowed';
      end if;
      select commission_rate_bps into v_rate
      from public.memberships where id = v_consignment.membership_id;
    elsif v_device.status = 'IN_STOCK' then
      if v_role is null or v_role not in ('OWNER', 'CASHIER') then
        raise exception 'not_allowed';
      end if;
    else
      raise exception 'device_unavailable';
    end if;
  else
    raise exception 'not_allowed';
  end if;

  if exists (
    select 1 from public.sales
    where device_id = v_device.id and status in ('PENDING_APPROVAL', 'COMPLETED')
  ) then
    raise exception 'device_unavailable';
  end if;

  -- Client : existant dans le même espace, ou créé à la volée.
  if v_customer_id is null then
    raise exception 'customer_required';
  end if;
  select * into v_customer from public.customers where id = v_customer_id;
  if v_customer.id is null then
    if v_customer_name is null then
      raise exception 'customer_required';
    end if;
    insert into public.customers (id, shop_id, owner_user_id, name, phone, created_by)
    values (
      v_customer_id,
      v_device.shop_id,
      case when v_type = 'PERSONAL' then v_user end,
      v_customer_name,
      nullif(trim(p_sale ->> 'customer_phone'), ''),
      v_user
    );
  elsif (v_type = 'PERSONAL' and v_customer.owner_user_id is distinct from v_user)
    or (v_type = 'SHOP' and v_customer.shop_id is distinct from v_device.shop_id)
    or (v_role = 'DEALER' and v_customer.created_by <> v_user) then
    raise exception 'invalid_customer';
  end if;

  v_report := private.insert_condition_report('SALE', p_report, p_photos);

  if v_type = 'PERSONAL' then
    v_dealer_share := v_price;
    v_shop_share := 0;
  elsif v_consignment.id is null then
    v_dealer_share := 0;
    v_shop_share := v_price;
  elsif v_price < v_consignment.floor_price then
    v_status := 'PENDING_APPROVAL';
  else
    v_dealer_share := private.compute_dealer_share(v_price, v_device.purchase_price, v_rate);
    v_shop_share := v_price - v_dealer_share;
  end if;

  insert into public.sales (
    id, device_id, shop_id, consignment_id, customer_id, seller_user_id, report_id,
    type, status, sale_price, purchase_price, commission_rate_bps,
    shop_share, dealer_share, warranty_days
  )
  values (
    v_id, v_device.id, v_device.shop_id, v_consignment.id, v_customer_id, v_user, v_report,
    v_type, v_status, v_price, v_device.purchase_price, v_rate,
    v_shop_share, v_dealer_share, v_warranty
  );

  if v_status = 'COMPLETED' then
    update public.devices set status = 'SOLD' where id = v_device.id;
    if v_consignment.id is not null then
      update public.consignments set status = 'SOLD' where id = v_consignment.id;
    end if;
  end if;

  return v_status;
end;
$$;

-- Le patron valide ou refuse une vente passée sous le prix plancher.
create function public.decide_sale(p_sale_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale public.sales;
  v_dealer_share bigint;
begin
  select * into v_sale from public.sales where id = p_sale_id for update;
  if v_sale.id is null or private.my_role(v_sale.shop_id) is distinct from 'OWNER' then
    raise exception 'not_allowed';
  end if;
  if v_sale.status <> 'PENDING_APPROVAL' then
    raise exception 'sale_not_pending';
  end if;

  if not p_approve then
    update public.sales
    set status = 'REJECTED', decided_by = auth.uid(), decided_at = now()
    where id = v_sale.id;
    return;
  end if;

  v_dealer_share := private.compute_dealer_share(
    v_sale.sale_price, v_sale.purchase_price, v_sale.commission_rate_bps
  );
  update public.sales
  set status = 'COMPLETED',
      dealer_share = v_dealer_share,
      shop_share = v_sale.sale_price - v_dealer_share,
      decided_by = auth.uid(),
      decided_at = now()
  where id = v_sale.id;
  update public.consignments set status = 'SOLD' where id = v_sale.consignment_id;
  update public.devices set status = 'SOLD' where id = v_sale.device_id;
end;
$$;

revoke all on function public.create_consignment(jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.return_consignment(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.create_sale(jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.decide_sale(uuid, boolean) from public, anon;
grant execute on function public.create_consignment(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.return_consignment(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.create_sale(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.decide_sale(uuid, boolean) to authenticated;
