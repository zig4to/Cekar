-- Znesek, zapravljen v trgovini na seznamu (vnese se ročno ob nakupu).
alter table public.cekar_list_stores
  add column spent numeric(10, 2) check (spent >= 0);
