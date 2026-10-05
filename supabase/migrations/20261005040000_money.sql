-- Phase 4 : échéances des clients, règlements des dealers, soldes.
-- La plateforme n'encaisse rien : elle enregistre ce qui a été payé en dehors.

create type public.payment_method as enum ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER');

-- Paiement d'une vente par le client en plusieurs fois.
create table public.installments (
  id uuid primary key,
  sale_id uuid not null references public.sales (id),
  amount bigint not null check (amount > 0),
  due_on date not null,
  paid_on date,
  created_at timestamptz not null default now()
);

create index installments_sale_id_idx on public.installments (sale_id);

-- Argent reversé par un dealer à la boutique. Un règlement couvre une ou
-- plusieurs ventes : la répartition est dans settlement_allocations.
create table public.settlements (
  id uuid primary key,
  shop_id uuid not null references public.shops (id),
  membership_id uuid not null references public.memberships (id),
  dealer_user_id uuid not null references public.users (id),
  amount bigint not null check (amount > 0),
  method public.payment_method not null,
  paid_at timestamptz not null default now(),
  recorded_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

create index settlements_membership_id_idx on public.settlements (membership_id);

create table public.settlement_allocations (
  settlement_id uuid not null references public.settlements (id),
  sale_id uuid not null references public.sales (id),
  amount bigint not null check (amount > 0),
  primary key (settlement_id, sale_id)
);

create index settlement_allocations_sale_id_idx on public.settlement_allocations (sale_id);

-- ---------- Politiques d'accès ----------

alter table public.installments enable row level security;
alter table public.settlements enable row level security;
alter table public.settlement_allocations enable row level security;

-- Visible si la vente l'est (la politique de sales s'applique).
create policy installments_select on public.installments
  for select to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id));

create policy settlements_select on public.settlements
  for select to authenticated
  using (
    private.my_role(shop_id) in ('OWNER', 'CASHIER')
    or (dealer_user_id = (select auth.uid()) and private.my_role(shop_id) = 'DEALER')
  );

create policy settlement_allocations_select on public.settlement_allocations
  for select to authenticated
  using (exists (select 1 from public.settlements s where s.id = settlement_id));

revoke all on public.installments from anon, authenticated;
revoke all on public.settlements from anon, authenticated;
revoke all on public.settlement_allocations from anon, authenticated;
grant select on public.installments to authenticated;
grant select on public.settlements to authenticated;
grant select on public.settlement_allocations to authenticated;

-- ---------- Ce que doit chaque vente en dépôt ----------
-- security_invoker : la vue applique les droits de celui qui la lit.

create view public.sale_dues
with (security_invoker = true)
as
select
  s.id as sale_id,
  s.shop_id,
  c.membership_id,
  c.dealer_user_id,
  s.device_id,
  s.created_at as sold_at,
  s.shop_share,
  coalesce(a.settled, 0)::bigint as settled,
  (s.shop_share - coalesce(a.settled, 0))::bigint as due
from public.sales s
join public.consignments c on c.id = s.consignment_id
left join lateral (
  select sum(sa.amount) as settled
  from public.settlement_allocations sa
  where sa.sale_id = s.id
) a on true
where s.status = 'COMPLETED';

revoke all on public.sale_dues from anon, authenticated;
grant select on public.sale_dues to authenticated;

-- Solde de chaque dealer d'une boutique : somme des parts boutique de ses
-- ventes en dépôt, moins ce qu'il a déjà réglé.
-- Le patron et le caissier voient tous les dealers ; un dealer, lui seul.
create function public.dealer_balances(p_shop_id uuid)
returns table (
  membership_id uuid,
  dealer_user_id uuid,
  dealer_name text,
  active boolean,
  total_owed bigint,
  total_settled bigint,
  balance bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    m.user_id,
    u.name,
    m.active,
    coalesce(sum(d.shop_share), 0)::bigint,
    coalesce(sum(d.settled), 0)::bigint,
    coalesce(sum(d.due), 0)::bigint
  from public.memberships m
  join public.users u on u.id = m.user_id
  left join public.sale_dues d on d.membership_id = m.id
  where m.shop_id = p_shop_id
    and (m.role = 'DEALER' or d.sale_id is not null)
    and (
      private.my_role(p_shop_id) in ('OWNER', 'CASHIER')
      or (private.my_role(p_shop_id) = 'DEALER' and m.user_id = (select auth.uid()))
    )
  group by m.id, u.name
  order by u.name
$$;

-- Qui gère les échéances d'une vente : ceux qui voient la vente.
-- coalesce : pour une vente perso, shop_id est vide et les comparaisons de
-- rôle valent NULL ; sans lui, « not can_manage_sale(...) » vaudrait NULL et
-- le contrôle laisserait passer n'importe qui.
create function private.can_manage_sale(p_sale public.sales)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (p_sale.type = 'PERSONAL' and p_sale.seller_user_id = (select auth.uid()))
    or private.my_role(p_sale.shop_id) in ('OWNER', 'CASHIER')
    or (
      p_sale.seller_user_id = (select auth.uid())
      and private.my_role(p_sale.shop_id) = 'DEALER'
    ),
    false
  )
$$;

revoke all on function public.dealer_balances(uuid) from public, anon;
revoke all on function private.can_manage_sale(public.sales) from public;
grant execute on function public.dealer_balances(uuid) to authenticated;
grant execute on function private.can_manage_sale(public.sales) to authenticated;

-- ---------- Opérations ----------

-- Définit l'échéancier d'une vente, une seule fois. La somme des échéances
-- doit être égale au prix de vente. Une échéance marquée « paid » (acompte)
-- est notée payée aujourd'hui.
create function public.set_installments(p_sale_id uuid, p_installments jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale public.sales;
begin
  select * into v_sale from public.sales where id = p_sale_id for update;
  if v_sale.id is null or not private.can_manage_sale(v_sale) then
    raise exception 'not_allowed';
  end if;
  if v_sale.status <> 'COMPLETED' then
    raise exception 'sale_not_completed';
  end if;

  if exists (select 1 from public.installments where sale_id = v_sale.id) then
    -- Rejouable : le même échéancier renvoyé une seconde fois ne fait rien.
    if not exists (
      select 1 from jsonb_array_elements(p_installments) p
      where not exists (
        select 1 from public.installments i
        where i.id = (p ->> 'id')::uuid and i.sale_id = v_sale.id
      )
    ) then
      return;
    end if;
    raise exception 'installments_exist';
  end if;

  if jsonb_typeof(p_installments) is distinct from 'array'
    or jsonb_array_length(p_installments) not between 1 and 12
    or exists (
      select 1 from jsonb_array_elements(p_installments) p
      where coalesce((p ->> 'amount')::bigint, 0) <= 0 or (p ->> 'due_on') is null
    )
    or (
      select sum((p ->> 'amount')::bigint) from jsonb_array_elements(p_installments) p
    ) <> v_sale.sale_price then
    raise exception 'invalid_schedule';
  end if;

  insert into public.installments (id, sale_id, amount, due_on, paid_on)
  select
    (p ->> 'id')::uuid,
    v_sale.id,
    (p ->> 'amount')::bigint,
    (p ->> 'due_on')::date,
    case when coalesce((p ->> 'paid')::boolean, false) then current_date end
  from jsonb_array_elements(p_installments) p;
end;
$$;

create function public.set_installment_paid(p_installment_id uuid, p_paid boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale public.sales;
begin
  select s.* into v_sale
  from public.installments i
  join public.sales s on s.id = i.sale_id
  where i.id = p_installment_id;
  if v_sale.id is null or not private.can_manage_sale(v_sale) then
    raise exception 'not_allowed';
  end if;

  update public.installments
  set paid_on = case when p_paid then coalesce(paid_on, current_date) end
  where id = p_installment_id;
end;
$$;

-- Enregistre un règlement d'un dealer (par le patron ou le caissier, qui
-- reçoit l'argent). Le montant est réparti sur les ventes non soldées :
-- d'abord celles désignées dans « sale_ids », puis les plus anciennes.
-- src/domain/settlement.ts applique la même règle pour l'aperçu à l'écran.
create function public.record_settlement(p_settlement jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid := (p_settlement ->> 'id')::uuid;
  v_amount bigint := (p_settlement ->> 'amount')::bigint;
  v_preferred uuid[] := coalesce(
    array(select jsonb_array_elements_text(p_settlement -> 'sale_ids'))::uuid[], '{}'
  );
  v_existing public.settlements;
  v_member public.memberships;
  v_left bigint;
  v_part bigint;
  v_due record;
begin
  select * into v_existing from public.settlements where id = v_id;
  if v_existing.id is not null then
    if v_existing.recorded_by = v_user then
      return v_id;
    end if;
    raise exception 'not_allowed';
  end if;

  select * into v_member from public.memberships
  where id = (p_settlement ->> 'membership_id')::uuid;
  if v_member.id is null
    or private.my_role(v_member.shop_id) is null
    or private.my_role(v_member.shop_id) not in ('OWNER', 'CASHIER') then
    raise exception 'not_allowed';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  -- Un seul règlement à la fois par dealer : la répartition lit des soldes.
  perform pg_advisory_xact_lock(hashtextextended(v_member.id::text, 0));

  if v_amount > (
    select coalesce(sum(due), 0) from public.sale_dues where membership_id = v_member.id
  ) then
    raise exception 'amount_exceeds_balance';
  end if;

  insert into public.settlements (
    id, shop_id, membership_id, dealer_user_id, amount, method, recorded_by
  )
  values (
    v_id, v_member.shop_id, v_member.id, v_member.user_id, v_amount,
    (p_settlement ->> 'method')::public.payment_method, v_user
  );

  v_left := v_amount;
  for v_due in
    select sale_id, due
    from public.sale_dues
    where membership_id = v_member.id and due > 0
    order by (sale_id = any (v_preferred)) desc, sold_at, sale_id
  loop
    exit when v_left = 0;
    v_part := least(v_left, v_due.due);
    insert into public.settlement_allocations (settlement_id, sale_id, amount)
    values (v_id, v_due.sale_id, v_part);
    v_left := v_left - v_part;

    if v_part = v_due.due then
      update public.consignments
      set status = 'SETTLED'
      where id = (select consignment_id from public.sales where id = v_due.sale_id);
    end if;
  end loop;

  return v_id;
end;
$$;

revoke all on function public.set_installments(uuid, jsonb) from public, anon;
revoke all on function public.set_installment_paid(uuid, boolean) from public, anon;
revoke all on function public.record_settlement(jsonb) from public, anon;
grant execute on function public.set_installments(uuid, jsonb) to authenticated;
grant execute on function public.set_installment_paid(uuid, boolean) to authenticated;
grant execute on function public.record_settlement(jsonb) to authenticated;
