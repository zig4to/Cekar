import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CekarListDetail,
  CekarListSummary,
  CekarArchivedList,
  CekarSpentPeriod,
  CekarMember,
  CekarMembership,
  Database,
} from "@/lib/types/database.types";

// Samo branje. RLS omeji vse poizvedbe na gospodinjstvo prijavljenega
// uporabnika (cekar_my_household()), zato poizvedbe po trgovinah, seznamih
// in izdelkih ne potrebujejo household_id in jih strani poženejo vzporedno
// z getMembership — en krog do baze namesto verige zaporednih.
type Supa = SupabaseClient<Database>;

export async function getMembership(
  supabase: Supa,
  userId: string
): Promise<CekarMembership | null> {
  const { data: member } = await supabase
    .from("cekar_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) return null;

  const { data: household } = await supabase
    .from("cekar_households")
    .select("*")
    .eq("id", member.household_id)
    .maybeSingle();
  if (!household) return null;

  return { member, household };
}

export async function getMembers(
  supabase: Supa,
  householdId: string
): Promise<CekarMember[]> {
  const { data } = await supabase
    .from("cekar_members")
    .select("*")
    .eq("household_id", householdId)
    .order("joined_at");
  return data ?? [];
}

export async function getStores(supabase: Supa) {
  const { data } = await supabase
    .from("cekar_stores")
    .select("*")
    .order("position")
    .order("created_at");
  return data ?? [];
}

// Kategorije v vrstnem redu (= vrstni red skupin znotraj trgovine).
export async function getCategories(supabase: Supa) {
  const { data } = await supabase
    .from("cekar_categories")
    .select("*")
    .order("position")
    .order("created_at");
  return data ?? [];
}

// Katalog izdelkov gospodinjstva (vse trgovine), najpogostejši najprej.
export async function getProducts(supabase: Supa) {
  const { data } = await supabase
    .from("cekar_products")
    .select("*")
    .order("use_count", { ascending: false })
    .order("last_used_at", { ascending: false });
  return data ?? [];
}

// Ena trgovina in njen katalog izdelkov (stran za urejanje kataloga).
export async function getStore(supabase: Supa, storeId: string) {
  const { data } = await supabase
    .from("cekar_stores")
    .select("*")
    .eq("id", storeId)
    .maybeSingle();
  return data;
}

export async function getStoreProducts(supabase: Supa, storeId: string) {
  const { data } = await supabase
    .from("cekar_products")
    .select("*")
    .eq("store_id", storeId)
    .order("name");
  return data ?? [];
}

// Predlagano ime novega seznama: "Trgovina November #3" — zaporedna številka
// = nakupovalni seznami (tudi arhivirani), ustvarjeni ta mesec (ljubljanski
// čas), + 1.
export async function getNewListName(supabase: Supa) {
  const now = new Date();
  const since = new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("cekar_lists")
    .select("created_at")
    .eq("is_template", false)
    .gte("created_at", since);
  const key = monthKey(now);
  const count = (data ?? []).filter((l) => monthKey(new Date(l.created_at)) === key).length;
  const month = new Intl.DateTimeFormat("sl-SI", {
    month: "long",
    timeZone: "Europe/Ljubljana",
  }).format(now);
  return `Trgovina ${month.charAt(0).toUpperCase()}${month.slice(1)} #${count + 1}`;
}

// Zadnji opravljeni nakupi za domačo stran (kompaktne kartice pod Aktualno).
export async function getRecentArchived(supabase: Supa, limit = 3) {
  const { data } = await supabase
    .from("cekar_lists")
    .select("id, name")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getListSummaries(supabase: Supa): Promise<CekarListSummary[]> {
  const [{ data: lists }, { data: listStores }, { data: items }, stores] =
    await Promise.all([
      supabase
        .from("cekar_lists")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("cekar_list_stores")
        .select("list_id, store_id, position")
        .order("position"),
      // vrstni red kot v ListView — loading.tsx iz tega riše takojšnji pogled
      supabase
        .from("cekar_items")
        .select("id, list_id, store_id, product_id, name, checked, quantity")
        .order("position")
        .order("created_at"),
      getStores(supabase),
    ]);
  if (!lists?.length) return [];
  const storeName = new Map(stores.map((s) => [s.id, s.name]));

  return lists.map((l) => {
    const own = (items ?? []).filter((i) => i.list_id === l.id);
    const storeIds = (listStores ?? [])
      .filter((ls) => ls.list_id === l.id && storeName.has(ls.store_id))
      .map((ls) => ls.store_id);
    return {
      id: l.id,
      name: l.name,
      isTemplate: l.is_template,
      storeNames: storeIds.map((id) => storeName.get(id) ?? ""),
      storeIds,
      items: own.map(({ id, store_id, product_id, name, checked, quantity }) => ({
        id,
        store_id,
        product_id,
        name,
        checked,
        quantity,
      })),
      total: own.length,
      checked: own.filter((i) => i.checked).length,
    };
  });
}

export async function getListDetail(
  supabase: Supa,
  listId: string
): Promise<CekarListDetail | null> {
  const [
    { data: list },
    { data: listStores },
    { data: items },
    allStores,
    products,
    categories,
    { data: receipts },
  ] =
    await Promise.all([
      supabase.from("cekar_lists").select("*").eq("id", listId).maybeSingle(),
      supabase
        .from("cekar_list_stores")
        .select("*")
        .eq("list_id", listId)
        .order("position")
        .order("created_at"),
      supabase
        .from("cekar_items")
        .select("*")
        .eq("list_id", listId)
        .order("position")
        .order("created_at"),
      getStores(supabase),
      getProducts(supabase),
      getCategories(supabase),
      supabase
        .from("cekar_receipts")
        .select("*")
        .eq("list_id", listId)
        .order("created_at"),
    ]);
  if (!list) return null;

  const byId = new Map(allStores.map((s) => [s.id, s]));
  const stores = (listStores ?? [])
    .map((ls) => byId.get(ls.store_id))
    .filter((s) => s !== undefined);

  return {
    list,
    stores,
    items: items ?? [],
    allStores,
    products,
    categories,
    receipts: receipts ?? [],
    spent: Object.fromEntries(
      (listStores ?? [])
        .filter((ls) => ls.spent !== null)
        .map((ls) => [ls.store_id, Number(ls.spent)])
    ),
  };
}

// Arhiv nakupov: opravljeni (arhivirani) seznami, najnovejši najprej, s
// trgovinami, številom izdelkov in zapravljenim.
export async function getArchivedLists(supabase: Supa): Promise<CekarArchivedList[]> {
  const { data: lists } = await supabase
    .from("cekar_lists")
    .select("id, household_id, name, archived_at")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });
  if (!lists?.length) return [];
  const ids = lists.map((l) => l.id);
  const [{ data: listStores }, { data: items }, { data: receipts }, stores] = await Promise.all([
    supabase
      .from("cekar_list_stores")
      .select("list_id, store_id, spent, position")
      .in("list_id", ids)
      .order("position"),
    supabase
      .from("cekar_items")
      .select("id, list_id, store_id, checked, name, quantity")
      .in("list_id", ids)
      .order("position")
      .order("created_at"),
    supabase.from("cekar_receipts").select("*").in("list_id", ids).order("created_at"),
    getStores(supabase),
  ]);
  const storeById = new Map(stores.map((s) => [s.id, s]));
  return lists.map((l) => {
    const own = (listStores ?? []).filter((ls) => ls.list_id === l.id);
    const listStoresFull = own.flatMap((ls) => {
      const store = storeById.get(ls.store_id);
      if (!store) return [];
      return [
        {
          store,
          spent: ls.spent === null ? null : Number(ls.spent),
          openItems: (items ?? [])
            .filter((i) => i.list_id === l.id && i.store_id === ls.store_id && !i.checked)
            .map(({ id, name, quantity }) => ({ id, name, quantity })),
          receipts: (receipts ?? []).filter(
            (r) => r.list_id === l.id && r.store_id === ls.store_id
          ),
        },
      ];
    });
    return {
      id: l.id,
      householdId: l.household_id,
      name: l.name,
      archivedAt: l.archived_at!,
      stores: listStoresFull,
      itemCount: (items ?? []).filter((i) => i.list_id === l.id).length,
      spent: listStoresFull.reduce((sum, s) => sum + (s.spent ?? 0), 0),
    };
  });
}

// Nakupovalni seznami (brez stalnega) — cilji za "Zapiši na seznam".
export async function getShoppingListNames(supabase: Supa) {
  const { data } = await supabase
    .from("cekar_lists")
    .select("id, name")
    .eq("is_template", false)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// Ključ meseca ("2026-11") po ljubljanskem času.
export const monthKey = (d: Date) => DAY_KEY.format(d).slice(0, 7);

// Ključ tedna = ponedeljek tega tedna ("2026-11-16") po ljubljanskem času.
export function weekKey(d: Date) {
  const day = new Date(`${DAY_KEY.format(d)}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

const DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Ljubljana",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Zneski iz vseh seznamov (tudi arhiviranih), združeni po mesecu in po tednu
// vnosa (spent_at). Najnovejše obdobje prvo.
export async function getSpentByPeriod(
  supabase: Supa
): Promise<{ months: CekarSpentPeriod[]; weeks: CekarSpentPeriod[] }> {
  const [{ data: rows }, stores] = await Promise.all([
    supabase
      .from("cekar_list_stores")
      .select("list_id, store_id, spent, spent_at, cekar_lists(name)")
      .not("spent", "is", null)
      .order("spent_at"),
    getStores(supabase),
  ]);
  const byId = new Map(stores.map((s) => [s.id, s]));
  type Group = { perStore: Map<string, number>; lists: string[] };
  const months = new Map<string, Group>();
  const weeks = new Map<string, Group>();
  // Nakup (seznam) je označen samo v enem obdobju — v tistem, kamor pade največ
  // njegovega zneska (npr. znesek, popravljen teden pozneje, ga ne podvoji).
  const listShare = { months: new Map<string, Map<string, number>>(), weeks: new Map<string, Map<string, number>>() };
  const listName = new Map<string, string>();
  const add = (into: Map<string, Group>, key: string, storeId: string, v: number) => {
    const g = into.get(key) ?? { perStore: new Map<string, number>(), lists: [] };
    g.perStore.set(storeId, (g.perStore.get(storeId) ?? 0) + v);
    into.set(key, g);
  };
  const share = (into: Map<string, Map<string, number>>, listId: string, key: string, v: number) => {
    const perKey = into.get(listId) ?? new Map<string, number>();
    perKey.set(key, (perKey.get(key) ?? 0) + v);
    into.set(listId, perKey);
  };
  for (const r of rows ?? []) {
    if (!byId.has(r.store_id) || r.spent === null || !r.spent_at) continue;
    const at = new Date(r.spent_at);
    const v = Number(r.spent);
    const name = (r.cekar_lists as unknown as { name: string } | null)?.name;
    if (name) listName.set(r.list_id, name);
    add(months, monthKey(at), r.store_id, v);
    add(weeks, weekKey(at), r.store_id, v);
    share(listShare.months, r.list_id, monthKey(at), v);
    share(listShare.weeks, r.list_id, weekKey(at), v);
  }
  // vrstice so po spent_at, zato so seznami v obdobju v vrstnem redu nakupov
  for (const [groups, shares] of [
    [months, listShare.months],
    [weeks, listShare.weeks],
  ] as const) {
    for (const [listId, perKey] of shares) {
      const name = listName.get(listId);
      if (!name) continue;
      const main = [...perKey].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
      groups.get(main)?.lists.push(name);
    }
  }
  const toList = (groups: Map<string, Group>) =>
    [...groups]
      .map(([key, { perStore, lists }]) => {
        const list = [...perStore]
          .map(([id, total]) => ({ store: byId.get(id)!, total }))
          .sort((a, b) => b.total - a.total);
        return { key, total: list.reduce((a, s) => a + s.total, 0), stores: list, lists };
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  return { months: toList(months), weeks: toList(weeks) };
}
