import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CekarListDetail,
  CekarListSummary,
  CekarArchivedList,
  CekarSpentMonth,
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
    supabase.from("cekar_items").select("list_id").in("list_id", ids),
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
export const monthKey = (d: Date) => MONTH_KEY.format(d).slice(0, 7);

const MONTH_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Ljubljana",
  year: "numeric",
  month: "2-digit",
});

// Zneski iz vseh seznamov (tudi arhiviranih), združeni po mesecu vnosa.
export async function getSpentByMonth(supabase: Supa): Promise<CekarSpentMonth[]> {
  const [{ data: rows }, stores] = await Promise.all([
    supabase
      .from("cekar_list_stores")
      .select("store_id, spent, spent_at")
      .not("spent", "is", null),
    getStores(supabase),
  ]);
  const byId = new Map(stores.map((s) => [s.id, s]));
  const months = new Map<string, Map<string, number>>();
  for (const r of rows ?? []) {
    const store = byId.get(r.store_id);
    if (!store || r.spent === null || !r.spent_at) continue;
    const key = monthKey(new Date(r.spent_at));
    const perStore = months.get(key) ?? new Map<string, number>();
    perStore.set(r.store_id, (perStore.get(r.store_id) ?? 0) + Number(r.spent));
    months.set(key, perStore);
  }
  return [...months]
    .map(([month, perStore]) => {
      const list = [...perStore]
        .map(([id, total]) => ({ store: byId.get(id)!, total }))
        .sort((a, b) => b.total - a.total);
      return { month, total: list.reduce((a, s) => a + s.total, 0), stores: list };
    })
    .sort((a, b) => b.month.localeCompare(a.month));
}
