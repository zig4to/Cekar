import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CekarListDetail,
  CekarListSummary,
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

// Katalog izdelkov gospodinjstva (vse trgovine), najpogostejši najprej.
export async function getProducts(supabase: Supa) {
  const { data } = await supabase
    .from("cekar_products")
    .select("*")
    .order("use_count", { ascending: false })
    .order("last_used_at", { ascending: false });
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
        .select("list_id, store_id, name, checked, quantity")
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
      storeNames: storeIds.map((id) => storeName.get(id) ?? ""),
      storeIds,
      items: own.map(({ store_id, name, checked, quantity }) => ({
        store_id,
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
  const [{ data: list }, { data: listStores }, { data: items }, allStores, products] =
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
  };
}
