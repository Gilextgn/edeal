-- Profil applicatif lié au compte d'authentification (auth.users).
-- Le mot de passe haché reste dans auth.users, jamais ici.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  phone text unique,
  email text unique,
  created_at timestamptz not null default now(),
  constraint users_has_identifier check (phone is not null or email is not null)
);

alter table public.users enable row level security;

create policy users_select_own on public.users
  for select to authenticated
  using (id = (select auth.uid()));

create policy users_update_own on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.users from anon, authenticated;
grant select on public.users to authenticated;
grant update (name) on public.users to authenticated;

-- Crée le profil à l'inscription. Un nom manquant fait échouer l'inscription.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, name, phone, email)
  values (
    new.id,
    trim(new.raw_user_meta_data ->> 'name'),
    nullif(new.phone, ''),
    nullif(new.email, '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
