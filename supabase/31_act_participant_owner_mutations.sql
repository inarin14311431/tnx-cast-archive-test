grant update, delete on table public.act_participants to authenticated;

drop policy if exists act_participants_delete_owner on public.act_participants;
create policy act_participants_delete_owner
on public.act_participants
for delete
to authenticated
using (
  exists (
    select 1
    from public.characters c
    where c.id = act_participants.character_id
      and c.owner_id = auth.uid()
  )
);
