begin;

create or replace function public.delete_owned_experience_spending(
  p_spending_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  perform 1
  from public.character_experience_spending ces
  join public.characters c on c.id = ces.character_id
  where ces.id = p_spending_id
    and c.owner_id = v_user_id
  for update of ces;

  if not found then
    raise exception 'The experience spending record does not exist or is not owned by the current user.'
      using errcode = '42501';
  end if;

  delete from public.character_experience_spending
  where id = p_spending_id;

  get diagnostics v_deleted_count = row_count;
  if v_deleted_count <> 1 then
    raise exception 'The experience spending record could not be deleted.';
  end if;

  return true;
end;
$$;

revoke all on function public.delete_owned_experience_spending(bigint) from public;
grant execute on function public.delete_owned_experience_spending(bigint) to authenticated;

notify pgrst, 'reload schema';
commit;
