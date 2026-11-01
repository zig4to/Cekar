-- Cekar — skupni nakupovalni seznami.
--
-- Deljenje poteka prek gospodinjstva: vsak uporabnik je član največ enega
-- gospodinjstva in vsi člani vidijo iste sezname, trgovine in katalog
-- izdelkov. Član se pridruži s kodo za povabilo (cekar_join_household).
--
-- Poženi ročno v Supabase Dashboard → SQL Editor (isti projekt kot Pisi/Vzlet).

-- ===== Tabele =====

create table public.cekar_households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique
    default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  created_at timestamptz not null default now()
);

create table public.cekar_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.cekar_households (id) on delete cascade,
  display_name text not null default '',
  joined_at timestamptz not null default now()
);
create index cekar_members_household_idx on public.cekar_members (household_id);

create table public.cekar_stores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.cekar_households (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index cekar_stores_household_idx on public.cekar_stores (household_id);
create unique index cekar_stores_name_uniq on public.cekar_stores (household_id, lower(name));

-- Katalog izdelkov: vsak izdelek je vezan na trgovino. Iz njega nastajajo
-- predlogi pri dodajanju na seznam (razvrščeni po use_count / last_used_at).
create table public.cekar_products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.cekar_households (id) on delete cascade,
  store_id uuid not null references public.cekar_stores (id) on delete cascade,
  name text not null,
  use_count integer not null default 1,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index cekar_products_name_uniq on public.cekar_products (store_id, lower(name));

create table public.cekar_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.cekar_households (id) on delete cascade,
  name text not null,
  created_by uuid references auth.users (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index cekar_lists_household_idx on public.cekar_lists (household_id);

create table public.cekar_list_stores (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.cekar_lists (id) on delete cascade,
  store_id uuid not null references public.cekar_stores (id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (list_id, store_id)
);

create table public.cekar_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.cekar_lists (id) on delete cascade,
  store_id uuid not null references public.cekar_stores (id) on delete cascade,
  product_id uuid references public.cekar_products (id) on delete set null,
  name text not null,
  note text,
  checked boolean not null default false,
  checked_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index cekar_items_list_idx on public.cekar_items (list_id);

-- ===== Pomožne funkcije =====

-- Gospodinjstvo prijavljenega uporabnika (security definer, da police na
-- cekar_members ne kličejo same sebe rekurzivno).
create or replace function public.cekar_my_household()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.cekar_members where user_id = auth.uid()
$$;

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

  return v_id;
end;
$$;

create or replace function public.cekar_join_household(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_current uuid;
begin
  if auth.uid() is null then
    raise exception 'Nisi prijavljen.';
  end if;

  select id into v_id from cekar_households
  where invite_code = upper(trim(p_code));
  if v_id is null then
    raise exception 'Neveljavna koda.';
  end if;

  select household_id into v_current from cekar_members where user_id = auth.uid();
  if v_current = v_id then
    return v_id;
  end if;
  if v_current is not null then
    raise exception 'Najprej zapusti trenutno gospodinjstvo.';
  end if;

  insert into cekar_members (user_id, household_id, display_name)
  values (auth.uid(), v_id, coalesce(trim(p_display_name), ''));

  return v_id;
end;
$$;

-- Doda izdelek na seznam pod trgovino in ga hkrati zapiše/posodobi v katalogu
-- (use_count + 1). Security invoker: RLS velja kot pri navadnih poizvedbah.
create or replace function public.cekar_add_item(p_list_id uuid, p_store_id uuid, p_name text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_name text := trim(p_name);
  v_household uuid := cekar_my_household();
  v_product uuid;
  v_item uuid;
  v_pos integer;
begin
  if v_name = '' then
    raise exception 'Izdelek ne sme biti prazen.';
  end if;

  insert into cekar_products (household_id, store_id, name)
  values (v_household, p_store_id, v_name)
  on conflict (store_id, lower(name)) do update
    set use_count = cekar_products.use_count + 1,
        last_used_at = now()
  returning id into v_product;

  select coalesce(max(position), 0) + 1 into v_pos
  from cekar_items where list_id = p_list_id and store_id = p_store_id;

  insert into cekar_items (list_id, store_id, product_id, name, position)
  values (p_list_id, p_store_id, v_product, v_name, v_pos)
  returning id into v_item;

  return v_item;
end;
$$;

revoke execute on function public.cekar_create_household(text, text) from anon;
revoke execute on function public.cekar_join_household(text, text) from anon;
revoke execute on function public.cekar_add_item(uuid, uuid, text) from anon;

-- ===== RLS =====

alter table public.cekar_households enable row level security;
alter table public.cekar_members enable row level security;
alter table public.cekar_stores enable row level security;
alter table public.cekar_products enable row level security;
alter table public.cekar_lists enable row level security;
alter table public.cekar_list_stores enable row level security;
alter table public.cekar_items enable row level security;

create policy "cekar_households select" on public.cekar_households
  for select to authenticated using (id = cekar_my_household());
create policy "cekar_households update" on public.cekar_households
  for update to authenticated using (id = cekar_my_household())
  with check (id = cekar_my_household());

-- Člani: vidiš vse iz svojega gospodinjstva; urejaš/brišeš (= zapustiš) samo
-- svojo vrstico. Vstop gre izključno prek RPC-jev zgoraj.
create policy "cekar_members select" on public.cekar_members
  for select to authenticated using (household_id = cekar_my_household());
create policy "cekar_members update own" on public.cekar_members
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid() and household_id = cekar_my_household());
create policy "cekar_members delete own" on public.cekar_members
  for delete to authenticated using (user_id = auth.uid());

create policy "cekar_stores all" on public.cekar_stores
  for all to authenticated using (household_id = cekar_my_household())
  with check (household_id = cekar_my_household());

create policy "cekar_products all" on public.cekar_products
  for all to authenticated
  using (household_id = cekar_my_household())
  with check (
    household_id = cekar_my_household()
    and exists (select 1 from cekar_stores s
                where s.id = store_id and s.household_id = cekar_my_household())
  );

create policy "cekar_lists all" on public.cekar_lists
  for all to authenticated using (household_id = cekar_my_household())
  with check (household_id = cekar_my_household());

create policy "cekar_list_stores all" on public.cekar_list_stores
  for all to authenticated
  using (exists (select 1 from cekar_lists l
                 where l.id = list_id and l.household_id = cekar_my_household()))
  with check (
    exists (select 1 from cekar_lists l
            where l.id = list_id and l.household_id = cekar_my_household())
    and exists (select 1 from cekar_stores s
                where s.id = store_id and s.household_id = cekar_my_household())
  );

create policy "cekar_items all" on public.cekar_items
  for all to authenticated
  using (exists (select 1 from cekar_lists l
                 where l.id = list_id and l.household_id = cekar_my_household()))
  with check (
    exists (select 1 from cekar_lists l
            where l.id = list_id and l.household_id = cekar_my_household())
    and exists (select 1 from cekar_stores s
                where s.id = store_id and s.household_id = cekar_my_household())
  );

-- ===== Realtime =====
-- Odkljukanje in dodajanje se drugim članom pokaže živo (ListView posluša
-- spremembe in osveži stran).
alter publication supabase_realtime add table public.cekar_items;
alter publication supabase_realtime add table public.cekar_list_stores;
