-- Connexion avec un compte Google.
-- Le profil est créé à la première connexion. Google fournit le nom dans
-- « name » ou « full_name » ; à défaut, on prend le début de l'adresse e-mail,
-- pour que la création du compte n'échoue jamais faute de nom.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := nullif(new.phone, '');
  v_email text := nullif(lower(new.email), '');
  v_name text := left(
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    ),
    80
  );
begin
  insert into public.users (id, name, phone, email)
  values (new.id, v_name, v_phone, v_email);

  -- Les invitations en attente pour ce téléphone ou cet e-mail deviennent
  -- des memberships.
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
