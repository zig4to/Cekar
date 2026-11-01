-- Stalni seznam: en na gospodinjstvo, pripet na vrh domače strani. Ureja se
-- kot navaden seznam, gumb "Zapiši na seznam" izbrane izdelke prepiše na
-- nakupovalni seznam (copyTemplateAction).

alter table public.cekar_lists
  add column is_template boolean not null default false;

create unique index cekar_lists_one_template
  on public.cekar_lists (household_id) where is_template;

-- Novo gospodinjstvo dobi tudi stalni seznam.
create or replace function public.cekar_create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nisi prijavljen.';
  end if;
  if exists (select 1 from cekar_members where user_id = auth.uid()) then
    raise exception 'Si že član gospodinjstva.';
  end if;

  insert into cekar_households (name)
  values (coalesce(nullif(trim(p_name), ''), 'Moje gospodinjstvo'))
  returning id into v_id;

  insert into cekar_members (user_id, household_id, display_name)
  values (auth.uid(), v_id, coalesce(trim(p_display_name), ''));

  insert into cekar_stores (household_id, name, position) values
    (v_id, 'Lidl', 1),
    (v_id, 'Hofer', 2),
    (v_id, 'Mercator', 3),
    (v_id, 'Spar', 4);

  perform cekar_seed_categories(v_id);

  insert into cekar_lists (household_id, name, created_by, is_template)
  values (v_id, 'Stalni seznam', auth.uid(), true);

  return v_id;
end;
$$;

insert into public.cekar_lists (household_id, name, is_template)
select id, 'Stalni seznam', true from public.cekar_households h
where not exists (
  select 1 from public.cekar_lists l where l.household_id = h.id and l.is_template
);
