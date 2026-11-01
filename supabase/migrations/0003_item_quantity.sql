-- Količina izdelka na seznamu (privzeto 1).

alter table public.cekar_items
  add column quantity integer not null default 1
  check (quantity between 1 and 999);

-- cekar_add_item dobi p_quantity (privzeto 1). Staro 3-argumentno različico
-- odstranimo, sicer bi bil klic s tremi argumenti dvoumen.
drop function if exists public.cekar_add_item(uuid, uuid, text);

create or replace function public.cekar_add_item(
  p_list_id uuid,
  p_store_id uuid,
  p_name text,
  p_quantity integer default 1
)
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

  insert into cekar_items (list_id, store_id, product_id, name, position, quantity)
  values (p_list_id, p_store_id, v_product, v_name, v_pos,
          greatest(1, least(999, coalesce(p_quantity, 1))))
  returning id into v_item;

  return v_item;
end;
$$;

revoke execute on function public.cekar_add_item(uuid, uuid, text, integer) from public, anon;
grant execute on function public.cekar_add_item(uuid, uuid, text, integer) to authenticated;
