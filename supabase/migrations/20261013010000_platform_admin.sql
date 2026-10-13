-- Espace superadmin : le propriétaire de la plateforme voit et gère toutes
-- les boutiques et tous les comptes.
--
-- Qui est superadmin : la table ci-dessous. Elle n'est lisible ni modifiable
-- par aucun utilisateur de l'application (RLS active, aucune politique) :
-- seul le serveur, avec la clé secrète, la consulte. On y ajoute quelqu'un
-- à la main (voir CLAUDE.md), jamais depuis l'application.
create table public.platform_admins (
  user_id uuid primary key references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

-- Boutique suspendue par le superadmin : plus aucun membre n'y a accès, mais
-- rien n'est effacé. Toutes les règles d'accès passent par private.my_role :
-- il suffit qu'il ne renvoie plus de rôle pour une boutique suspendue.
alter table public.shops add column suspended_at timestamptz;

create or replace function private.my_role(p_shop_id uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.memberships m
  join public.shops s on s.id = m.shop_id
  where m.shop_id = p_shop_id
    and m.user_id = (select auth.uid())
    and m.active
    and s.suspended_at is null
$$;
