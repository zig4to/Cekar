-- Kdaj je bil znesek vnesen (za mesečno statistiko). Nastavi ga trigger ob
-- prvem vnosu; popravek zneska datuma ne premakne, brisanje ga pobriše.
alter table public.cekar_list_stores add column spent_at timestamptz;
update public.cekar_list_stores set spent_at = now() where spent is not null;

create or replace function public.cekar_list_stores_spent_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.spent is null then
    new.spent_at := null;
  elsif old.spent is null then
    new.spent_at := now();
  end if;
  return new;
end $$;
revoke execute on function public.cekar_list_stores_spent_at() from public, anon, authenticated;

create trigger cekar_list_stores_spent_at
  before update of spent on public.cekar_list_stores
  for each row execute function public.cekar_list_stores_spent_at();
