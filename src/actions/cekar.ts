"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";

export type CekarResult = { error?: string };

type Supa = Awaited<ReturnType<typeof createClient>>;

// Prijavljen uporabnik + njegovo gospodinjstvo. Vse mutacije gredo skozi to,
// RLS pa poskrbi, da se ne da pisati v tuje gospodinjstvo.
async function ctx(): Promise<
  | { supabase: Supa; userId: string; householdId: string; error?: undefined }
  | { error: string }
> {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return { error: "Nisi prijavljen." };
  const { data } = await supabase
    .from("cekar_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { error: "Nisi član gospodinjstva." };
  return { supabase, userId: user.id, householdId: data.household_id };
}

function done(): CekarResult {
  revalidatePath("/", "layout");
  return {};
}

// Supabase/Postgres napake iz `raise exception` nosijo slovensko sporočilo.
function fail(message: string | undefined, fallback: string): CekarResult {
  return { error: message || fallback };
}

// ===== Gospodinjstvo =====

export async function createHouseholdAction(
  name: string,
  displayName: string
): Promise<CekarResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cekar_create_household", {
    p_name: name,
    p_display_name: displayName,
  });
  if (error) return fail(error.message, "Gospodinjstva ni bilo mogoče ustvariti.");
  return done();
}

export async function joinHouseholdAction(
  code: string,
  displayName: string
): Promise<CekarResult> {
  if (!code.trim()) return { error: "Vnesi kodo." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cekar_join_household", {
    p_code: code,
    p_display_name: displayName,
  });
  if (error) return fail(error.message, "Pridružitev ni uspela.");
  return done();
}

export async function renameHouseholdAction(name: string): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_households")
    .update({ name: name.trim() })
    .eq("id", c.householdId);
  if (error) return fail(undefined, "Preimenovanje ni uspelo.");
  return done();
}

export async function setDisplayNameAction(name: string): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_members")
    .update({ display_name: name.trim() })
    .eq("user_id", c.userId);
  if (error) return fail(undefined, "Shranjevanje ni uspelo.");
  return done();
}

export async function leaveHouseholdAction(): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_members")
    .delete()
    .eq("user_id", c.userId);
  if (error) return fail(undefined, "Izstop ni uspel.");
  revalidatePath("/", "layout");
  redirect("/");
}

// ===== Seznami =====

export async function createListAction(name: string): Promise<CekarResult> {
  const clean = name.trim();
  if (!clean) return { error: "Ime seznama ne sme biti prazno." };
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { data, error } = await c.supabase
    .from("cekar_lists")
    .insert({ household_id: c.householdId, name: clean, created_by: c.userId })
    .select("id")
    .single();
  if (error || !data) return fail(undefined, "Seznama ni bilo mogoče ustvariti.");
  revalidatePath("/", "layout");
  redirect(`/seznam/${data.id}`);
}

export async function renameListAction(
  listId: string,
  name: string
): Promise<CekarResult> {
  const clean = name.trim();
  if (!clean) return { error: "Ime seznama ne sme biti prazno." };
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_lists")
    .update({ name: clean })
    .eq("id", listId);
  if (error) return fail(undefined, "Preimenovanje ni uspelo.");
  return done();
}

export async function deleteListAction(listId: string): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase.from("cekar_lists").delete().eq("id", listId);
  if (error) return fail(undefined, "Brisanje ni uspelo.");
  revalidatePath("/", "layout");
  redirect("/");
}

export async function addStoreToListAction(
  listId: string,
  storeId: string
): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { data: last } = await c.supabase
    .from("cekar_list_stores")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await c.supabase.from("cekar_list_stores").insert({
    list_id: listId,
    store_id: storeId,
    position: (last?.position ?? 0) + 1,
  });
  if (error) return fail(undefined, "Trgovine ni bilo mogoče dodati.");
  return done();
}

export async function removeStoreFromListAction(
  listId: string,
  storeId: string
): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  // Izdelki te trgovine na tem seznamu gredo z njo (katalog ostane).
  await c.supabase
    .from("cekar_items")
    .delete()
    .eq("list_id", listId)
    .eq("store_id", storeId);
  const { error } = await c.supabase
    .from("cekar_list_stores")
    .delete()
    .eq("list_id", listId)
    .eq("store_id", storeId);
  if (error) return fail(undefined, "Odstranitev ni uspela.");
  return done();
}

// ===== Izdelki na seznamu =====

export async function addItemAction(
  listId: string,
  storeId: string,
  name: string,
  quantity = 1
): Promise<CekarResult> {
  if (!name.trim()) return { error: "Izdelek ne sme biti prazen." };
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  // Hitro dodajanje lahko izbere trgovino, ki še ni na seznamu — dodamo jo.
  const { data: link } = await c.supabase
    .from("cekar_list_stores")
    .select("id")
    .eq("list_id", listId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!link) {
    const res = await addStoreToListAction(listId, storeId);
    if (res.error) return res;
  }
  const { error } = await c.supabase.rpc("cekar_add_item", {
    p_list_id: listId,
    p_store_id: storeId,
    p_name: name,
    p_quantity: quantity,
  });
  if (error) return fail(undefined, "Izdelka ni bilo mogoče dodati.");
  return done();
}

export async function toggleItemAction(
  itemId: string,
  checked: boolean
): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_items")
    .update({ checked, checked_at: checked ? new Date().toISOString() : null })
    .eq("id", itemId);
  if (error) return fail(undefined, "Shranjevanje ni uspelo.");
  return done();
}

export async function updateItemAction(
  itemId: string,
  name: string,
  quantity: number
): Promise<CekarResult> {
  const clean = name.trim();
  if (!clean) return { error: "Izdelek ne sme biti prazen." };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    return { error: "Količina mora biti med 1 in 999." };
  }
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_items")
    .update({ name: clean, quantity })
    .eq("id", itemId);
  if (error) return fail(undefined, "Shranjevanje ni uspelo.");
  return done();
}

export async function deleteItemAction(itemId: string): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase.from("cekar_items").delete().eq("id", itemId);
  if (error) return fail(undefined, "Brisanje ni uspelo.");
  return done();
}

export async function clearCheckedAction(listId: string): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_items")
    .delete()
    .eq("list_id", listId)
    .eq("checked", true);
  if (error) return fail(undefined, "Brisanje ni uspelo.");
  return done();
}

// ===== Trgovine gospodinjstva =====

export async function createStoreAction(
  name: string,
  addToListId?: string
): Promise<CekarResult> {
  const clean = name.trim();
  if (!clean) return { error: "Ime trgovine ne sme biti prazno." };
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { data: last } = await c.supabase
    .from("cekar_stores")
    .select("position")
    .eq("household_id", c.householdId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await c.supabase
    .from("cekar_stores")
    .insert({
      household_id: c.householdId,
      name: clean,
      position: (last?.position ?? 0) + 1,
    })
    .select("id")
    .single();
  if (error || !data) {
    return fail(
      error?.code === "23505" ? "Trgovina s tem imenom že obstaja." : undefined,
      "Trgovine ni bilo mogoče dodati."
    );
  }
  if (addToListId) return addStoreToListAction(addToListId, data.id);
  return done();
}

export async function renameStoreAction(
  storeId: string,
  name: string
): Promise<CekarResult> {
  const clean = name.trim();
  if (!clean) return { error: "Ime trgovine ne sme biti prazno." };
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_stores")
    .update({ name: clean })
    .eq("id", storeId);
  if (error) {
    return fail(
      error.code === "23505" ? "Trgovina s tem imenom že obstaja." : undefined,
      "Preimenovanje ni uspelo."
    );
  }
  return done();
}

export async function deleteStoreAction(storeId: string): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase.from("cekar_stores").delete().eq("id", storeId);
  if (error) return fail(undefined, "Brisanje ni uspelo.");
  return done();
}

export async function reorderStoresAction(
  orderedIds: string[]
): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      c.supabase.from("cekar_stores").update({ position: i + 1 }).eq("id", id)
    )
  );
  if (results.some((r) => r.error)) return fail(undefined, "Shranjevanje ni uspelo.");
  return done();
}
