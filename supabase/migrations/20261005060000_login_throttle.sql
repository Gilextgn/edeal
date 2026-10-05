-- Frein contre les essais de mots de passe en série.
-- Après 5 échecs en 15 minutes sur un même identifiant (sans connexion
-- réussie entre-temps), la connexion est bloquée 15 minutes.
--
-- L'identifiant n'est pas stocké en clair : l'application envoie son empreinte
-- (SHA-256). Ces fonctions ne sont appelables que par le serveur de
-- l'application (clé secrète), jamais par un navigateur.

create table private.login_attempts (
  identifier_hash text not null,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);

create index login_attempts_lookup_idx
  on private.login_attempts (identifier_hash, attempted_at desc);

-- Nombre de secondes à attendre avant un nouvel essai (0 = essai autorisé).
create function public.login_lock_seconds(p_identifier_hash text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with recent_failures as (
    select attempted_at
    from private.login_attempts
    where identifier_hash = p_identifier_hash
      and not succeeded
      and attempted_at > now() - interval '15 minutes'
      and attempted_at > coalesce(
        (
          select max(attempted_at) from private.login_attempts
          where identifier_hash = p_identifier_hash and succeeded
        ),
        '-infinity'
      )
  )
  select case
    when count(*) >= 5
      then greatest(0, ceil(extract(epoch from max(attempted_at) + interval '15 minutes' - now())))::integer
    else 0
  end
  from recent_failures
$$;

create function public.record_login_attempt(p_identifier_hash text, p_succeeded boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.login_attempts (identifier_hash, succeeded)
  values (p_identifier_hash, p_succeeded);
  -- Rien n'est gardé plus d'un jour.
  delete from private.login_attempts where attempted_at < now() - interval '1 day';
end;
$$;

revoke all on function public.login_lock_seconds(text) from public, anon, authenticated;
revoke all on function public.record_login_attempt(text, boolean) from public, anon, authenticated;
grant execute on function public.login_lock_seconds(text) to service_role;
grant execute on function public.record_login_attempt(text, boolean) to service_role;
