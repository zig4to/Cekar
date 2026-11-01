-- Funkcije v public imajo privzeto EXECUTE za PUBLIC, zato `revoke ... from
-- anon` v 0001 ni zadoščal. Klicati jih smejo samo prijavljeni uporabniki.
revoke execute on function public.cekar_my_household() from public, anon;
revoke execute on function public.cekar_create_household(text, text) from public, anon;
revoke execute on function public.cekar_join_household(text, text) from public, anon;
revoke execute on function public.cekar_add_item(uuid, uuid, text) from public, anon;
grant execute on function public.cekar_my_household() to authenticated;
grant execute on function public.cekar_create_household(text, text) to authenticated;
grant execute on function public.cekar_join_household(text, text) to authenticated;
grant execute on function public.cekar_add_item(uuid, uuid, text) to authenticated;
