-- Cena za kos pri trgovini z enim izdelkom (Mlekarica → mleko, Domača Jajca →
-- jajca). Ko izdelek na seznamu odkljukaš, toggleItemAction zapiše
-- cekar_list_stores.spent = količina × cena (in s tem v statistiko).
alter table public.cekar_stores
  add column if not exists unit_price numeric(10, 2) check (unit_price >= 0);
