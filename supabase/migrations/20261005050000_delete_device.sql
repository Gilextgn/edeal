-- Suppression d'un appareil saisi par erreur.
-- Possible seulement tant qu'il n'a aucune histoire (ni constat, ni dépôt,
-- ni vente) : sinon on le retire du stock, pour garder la trace.

create function public.delete_device(p_device_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_write_device(p_device_id) then
    raise exception 'not_allowed';
  end if;
  if exists (select 1 from public.condition_reports where device_id = p_device_id)
    or exists (select 1 from public.consignments where device_id = p_device_id)
    or exists (select 1 from public.sales where device_id = p_device_id) then
    raise exception 'device_has_history';
  end if;

  delete from public.devices where id = p_device_id;
end;
$$;

revoke all on function public.delete_device(uuid) from public, anon;
grant execute on function public.delete_device(uuid) to authenticated;
