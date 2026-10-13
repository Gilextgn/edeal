-- Bénin : depuis fin 2024, les numéros ont 10 chiffres (l'ancien numéro à
-- 8 chiffres précédé de « 01 »). L'application ramène désormais toute saisie
-- à la nouvelle forme (src/domain/identifier.ts). Cette migration fait de
-- même pour les numéros déjà enregistrés, puis rattache les invitations qui
-- correspondent maintenant à un compte existant.

-- Comptes : la connexion se fait avec le numéro de auth.users. On ne touche
-- pas un numéro dont la nouvelle forme appartient déjà à un autre compte.
update auth.users u
set phone = '22901' || substr(u.phone, 4)
where u.phone ~ '^229[0-9]{8}$'
  and not exists (
    select 1 from auth.users other where other.phone = '22901' || substr(u.phone, 4)
  );

update public.users u
set phone = '22901' || substr(u.phone, 4)
where u.phone ~ '^229[0-9]{8}$'
  and not exists (
    select 1 from public.users other where other.phone = '22901' || substr(u.phone, 4)
  );

update public.invitations i
set phone = '22901' || substr(i.phone, 4)
where i.phone ~ '^229[0-9]{8}$'
  and not exists (
    select 1 from public.invitations other
    where other.shop_id = i.shop_id
      and other.phone = '22901' || substr(i.phone, 4)
  );

-- Invitations dont le numéro (ou l'e-mail) appartient déjà à un compte : la
-- personne rejoint la boutique, comme si elle venait de s'inscrire.
with accepted as (
  delete from public.invitations i
  using public.users u
  where (i.phone is not null and i.phone = u.phone)
     or (i.email is not null and i.email = u.email)
  returning i.shop_id, u.id as user_id, i.role, i.commission_rate_bps
)
insert into public.memberships (shop_id, user_id, role, commission_rate_bps)
select shop_id, user_id, role, commission_rate_bps from accepted
on conflict do nothing;
