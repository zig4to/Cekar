"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { guessCategory } from "@/lib/cekar/categories";
import { RECEIPT_BUCKET } from "@/lib/cekar/receipt-bucket";

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

// Samodejna kategorija za nov izdelek v katalogu (cekar_add_item jo uporabi
// samo, če izdelek še nima kategorije — ročno izbrana ostane).
async function guessCategoryFor(supabase: Supa, name: string) {
  const { data } = await supabase.from("cekar_categories").select("id, keywords");
  return guessCategory(name, data ?? []);
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
  // stalni seznam se ne briše
  const { error } = await c.supabase
    .from("cekar_lists")
    .delete()
    .eq("id", listId)
    .eq("is_template", false);
  if (error) return fail(undefined, "Brisanje ni uspelo.");
  revalidatePath("/", "layout");
  redirect("/");
}

// Stalni seznam → nakupovalni seznam: izbrane izdelke (id-ji vrstic stalnega
// seznama) zapiše na obstoječi seznam ali na nov seznam (targetListId null).
// Izdelek, ki je na ciljnem seznamu v isti trgovini že neodkljukan, preskoči.
// Trgovine doda brez privzetih izdelkov (ti so lahko že na stalnem seznamu).
export async function copyTemplateAction(
  itemIds: string[],
  targetListId: string | null,
  newListName: string
): Promise<CekarResult> {
  if (!itemIds.length) return { error: "Izberi vsaj en izdelek." };
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };

  const { data: template } = await c.supabase
    .from("cekar_lists")
    .select("id")
    .eq("is_template", true)
    .maybeSingle();
  if (!template) return { error: "Stalnega seznama ni." };
  const { data: picked } = await c.supabase
    .from("cekar_items")
    .select("store_id, name, quantity, position, created_at")
    .eq("list_id", template.id)
    .in("id", itemIds)
    .order("position")
    .order("created_at");
  if (!picked?.length) return { error: "Izbrani izdelki niso več na stalnem seznamu." };

  let listId = targetListId;
  if (!listId) {
    const name = newListName.trim();
    if (!name) return { error: "Ime seznama ne sme biti prazno." };
    const { data, error } = await c.supabase
      .from("cekar_lists")
      .insert({ household_id: c.householdId, name, created_by: c.userId })
      .select("id")
      .single();
    if (error || !data) return fail(undefined, "Seznama ni bilo mogoče ustvariti.");
    listId = data.id;
  }

  const [{ data: linked }, { data: open }] = await Promise.all([
    c.supabase.from("cekar_list_stores").select("store_id, position").eq("list_id", listId),
    c.supabase
      .from("cekar_items")
      .select("store_id, name")
      .eq("list_id", listId)
      .eq("checked", false),
  ]);
  const storeIds = new Set((linked ?? []).map((l) => l.store_id));
  let position = Math.max(0, ...(linked ?? []).map((l) => l.position));
  const onList = new Set((open ?? []).map((i) => `${i.store_id}:${i.name.toLowerCase()}`));

  for (const item of picked) {
    if (onList.has(`${item.store_id}:${item.name.toLowerCase()}`)) continue;
    if (!storeIds.has(item.store_id)) {
      await c.supabase
        .from("cekar_list_stores")
        .insert({ list_id: listId, store_id: item.store_id, position: ++position });
      storeIds.add(item.store_id);
    }
    // izdelek je v katalogu že s stalnega seznama — kategorija ostane njegova
    await c.supabase.rpc("cekar_add_item", {
      p_list_id: listId,
      p_store_id: item.store_id,
      p_name: item.name,
      p_quantity: item.quantity,
    });
  }
  revalidatePath("/", "layout");
  redirect(`/seznam/${listId}`);
}

// Doda trgovino na seznam in nanj privzete izdelke trgovine (default_items,
// npr. Mlekarica → Domače mleko). skipItem: izdelek, ki ga addItemAction
// doda takoj zatem — da ne pride dvakrat.
export async function addStoreToListAction(
  listId: string,
  storeId: string,
  skipItem?: string
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

  const { data: store } = await c.supabase
    .from("cekar_stores")
    .select("default_items")
    .eq("id", storeId)
    .maybeSingle();
  const skip = skipItem?.trim().toLowerCase();
  for (const name of store?.default_items ?? []) {
    if (name.trim().toLowerCase() === skip) continue;
    await c.supabase.rpc("cekar_add_item", {
      p_list_id: listId,
      p_store_id: storeId,
      p_name: name,
      p_category_id: await guessCategoryFor(c.supabase, name),
    });
  }
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
  const [{ data: link }, categoryId] = await Promise.all([
    c.supabase
      .from("cekar_list_stores")
      .select("id")
      .eq("list_id", listId)
      .eq("store_id", storeId)
      .maybeSingle(),
    guessCategoryFor(c.supabase, name),
  ]);
  if (!link) {
    const res = await addStoreToListAction(listId, storeId, name);
    if (res.error) return res;
  }
  const { error } = await c.supabase.rpc("cekar_add_item", {
    p_list_id: listId,
    p_store_id: storeId,
    p_name: name,
    p_quantity: quantity,
    p_category_id: categoryId,
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
  const { data: item, error } = await c.supabase
    .from("cekar_items")
    .update({ checked, checked_at: checked ? new Date().toISOString() : null })
    .eq("id", itemId)
    .select("list_id, store_id, quantity")
    .maybeSingle();
  if (error) return fail(undefined, "Shranjevanje ni uspelo.");
  if (item) {
    const res = await syncUnitPriceSpent(c.supabase, item.list_id, item.store_id, checked ? item.quantity : null);
    if (res.error) return res;
  }
  return done();
}

// Trgovina z enim izdelkom in nastavljeno ceno: zapravljeno = količina × cena
// (quantity null = ni kupljeno → znesek pobriši). Drugih trgovin ne tika.
async function syncUnitPriceSpent(
  supabase: Supa,
  listId: string,
  storeId: string,
  quantity: number | null
): Promise<CekarResult> {
  const { data: store } = await supabase
    .from("cekar_stores")
    .select("single_item, unit_price")
    .eq("id", storeId)
    .maybeSingle();
  if (!store?.single_item || store.unit_price === null) return {};
  const spent =
    quantity === null ? null : Math.round(quantity * Number(store.unit_price) * 100) / 100;
  const { error } = await supabase
    .from("cekar_list_stores")
    .update({ spent })
    .eq("list_id", listId)
    .eq("store_id", storeId);
  return error ? fail(undefined, "Zneska ni bilo mogoče shraniti.") : {};
}

// Cena za kos (Mlekarica, Domača Jajca). Če je izdelek na tem seznamu že
// kupljen, se znesek takoj preračuna; drugi (pretekli) seznami ostanejo.
export async function setStoreUnitPriceAction(
  listId: string,
  storeId: string,
  price: number | null
): Promise<CekarResult> {
  if (price !== null && !(price >= 0 && price < 100_000_000)) {
    return { error: "Neveljavna cena." };
  }
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_stores")
    .update({ unit_price: price === null ? null : Math.round(price * 100) / 100 })
    .eq("id", storeId);
  if (error) return fail(undefined, "Cene ni bilo mogoče shraniti.");
  const { data: bought } = await c.supabase
    .from("cekar_items")
    .select("quantity")
    .eq("list_id", listId)
    .eq("store_id", storeId)
    .eq("checked", true);
  if (bought && bought.length > 0) {
    const qty = bought.reduce((a, b) => a + b.quantity, 0);
    if (price === null) {
      // brez cene zneska ne računamo več — pobrišemo izračunanega
      await c.supabase
        .from("cekar_list_stores")
        .update({ spent: null })
        .eq("list_id", listId)
        .eq("store_id", storeId);
    } else {
      const res = await syncUnitPriceSpent(c.supabase, listId, storeId, qty);
      if (res.error) return res;
    }
  }
  return done();
}

// categoryId: undefined = kategorije ne spreminjaj, null = brez kategorije.
// Kategorija je na izdelku v katalogu, zato velja tudi za naslednja dodajanja.
export async function updateItemAction(
  itemId: string,
  name: string,
  quantity: number,
  categoryId?: string | null
): Promise<CekarResult> {
  const clean = name.trim();
  if (!clean) return { error: "Izdelek ne sme biti prazen." };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    return { error: "Količina mora biti med 1 in 999." };
  }
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { data: item, error } = await c.supabase
    .from("cekar_items")
    .update({ name: clean, quantity })
    .eq("id", itemId)
    .select("product_id")
    .maybeSingle();
  if (error) return fail(undefined, "Shranjevanje ni uspelo.");
  if (categoryId !== undefined && item?.product_id) {
    const { error: catError } = await c.supabase
      .from("cekar_products")
      .update({ category_id: categoryId })
      .eq("id", item.product_id);
    if (catError) return fail(undefined, "Kategorije ni bilo mogoče shraniti.");
  }
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

// ===== Katalog izdelkov trgovine (vir predlogov) =====
// Urejanje kataloga ne spreminja vrstic na seznamih (te imajo svoje ime).

const PRODUCT_DUP = "Ta izdelek v tej trgovini že obstaja.";

export async function createProductAction(
  storeId: string,
  name: string
): Promise<CekarResult> {
  const clean = name.trim();
  if (!clean) return { error: "Izdelek ne sme biti prazen." };
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const categoryId = await guessCategoryFor(c.supabase, clean);
  const { error } = await c.supabase.from("cekar_products").insert({
    household_id: c.householdId,
    store_id: storeId,
    name: clean,
    category_id: categoryId,
    use_count: 0,
  });
  if (error) {
    return fail(error.code === "23505" ? PRODUCT_DUP : undefined, "Izdelka ni bilo mogoče dodati.");
  }
  return done();
}

export async function renameProductAction(
  productId: string,
  name: string
): Promise<CekarResult> {
  const clean = name.trim();
  if (!clean) return { error: "Izdelek ne sme biti prazen." };
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_products")
    .update({ name: clean })
    .eq("id", productId);
  if (error) {
    return fail(error.code === "23505" ? PRODUCT_DUP : undefined, "Preimenovanje ni uspelo.");
  }
  return done();
}

export async function setProductCategoryAction(
  productId: string,
  categoryId: string | null
): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_products")
    .update({ category_id: categoryId })
    .eq("id", productId);
  if (error) return fail(undefined, "Kategorije ni bilo mogoče shraniti.");
  return done();
}

// Vrstice na seznamih ostanejo (product_id → null), izgine le predlog.
export async function deleteProductAction(productId: string): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase.from("cekar_products").delete().eq("id", productId);
  if (error) return fail(undefined, "Brisanje ni uspelo.");
  return done();
}

// ===== Skupni seznam izdelkov (/izdelki) =====
// Izdelek "v več trgovinah" = ena vrstica cekar_products na trgovino z istim
// imenom. Tako ga predlogi ob dodajanju v vsako od teh trgovin najdejo sami.
// ids = vse vrstice izdelka (po ena na trgovino).

// chosenCategoryId: undefined = ugani iz imena, null = brez kategorije
export async function createCatalogProductAction(
  name: string,
  storeIds: string[],
  chosenCategoryId?: string | null
): Promise<CekarResult> {
  const clean = name.trim();
  if (!clean) return { error: "Izdelek ne sme biti prazen." };
  if (storeIds.length === 0) return { error: "Izberi vsaj eno trgovino." };
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const categoryId =
    chosenCategoryId !== undefined ? chosenCategoryId : await guessCategoryFor(c.supabase, clean);
  // unikatni indeks je na (store_id, lower(name)) — že obstoječe preskočimo
  const results = await Promise.all(
    storeIds.map((storeId) =>
      c.supabase.from("cekar_products").insert({
        household_id: c.householdId,
        store_id: storeId,
        name: clean,
        category_id: categoryId,
        use_count: 0,
      })
    )
  );
  if (results.some((r) => r.error && r.error.code !== "23505")) {
    return fail(undefined, "Izdelka ni bilo mogoče dodati.");
  }
  return done();
}

// Izdelek dobi še eno trgovino (z enako kategorijo kot drugje).
export async function addProductStoreAction(
  name: string,
  storeId: string,
  categoryId: string | null
): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase.from("cekar_products").insert({
    household_id: c.householdId,
    store_id: storeId,
    name: name.trim(),
    category_id: categoryId,
    use_count: 0,
  });
  if (error && error.code !== "23505") return fail(undefined, "Trgovine ni bilo mogoče dodati.");
  return done();
}

export async function renameCatalogProductAction(
  ids: string[],
  name: string
): Promise<CekarResult> {
  const clean = name.trim();
  if (!clean) return { error: "Izdelek ne sme biti prazen." };
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_products")
    .update({ name: clean })
    .in("id", ids);
  if (error) {
    return fail(
      error.code === "23505" ? "Izdelek s tem imenom v eni od trgovin že obstaja." : undefined,
      "Preimenovanje ni uspelo."
    );
  }
  return done();
}

export async function setCatalogCategoryAction(
  ids: string[],
  categoryId: string | null
): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_products")
    .update({ category_id: categoryId })
    .in("id", ids);
  if (error) return fail(undefined, "Kategorije ni bilo mogoče shraniti.");
  return done();
}

// Odstrani trgovino(e) pri izdelku ali cel izdelek (vse vrstice). Vrstice na
// seznamih ostanejo (product_id → null).
export async function deleteCatalogRowsAction(ids: string[]): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase.from("cekar_products").delete().in("id", ids);
  if (error) return fail(undefined, "Brisanje ni uspelo.");
  return done();
}

// ===== Kategorije izdelkov =====

export async function createCategoryAction(name: string): Promise<CekarResult> {
  const clean = name.trim();
  if (!clean) return { error: "Ime kategorije ne sme biti prazno." };
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { data: last } = await c.supabase
    .from("cekar_categories")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await c.supabase.from("cekar_categories").insert({
    household_id: c.householdId,
    name: clean,
    position: (last?.position ?? 0) + 1,
  });
  if (error) {
    return fail(
      error.code === "23505" ? "Kategorija s tem imenom že obstaja." : undefined,
      "Kategorije ni bilo mogoče dodati."
    );
  }
  return done();
}

export async function renameCategoryAction(
  categoryId: string,
  name: string
): Promise<CekarResult> {
  const clean = name.trim();
  if (!clean) return { error: "Ime kategorije ne sme biti prazno." };
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_categories")
    .update({ name: clean })
    .eq("id", categoryId);
  if (error) {
    return fail(
      error.code === "23505" ? "Kategorija s tem imenom že obstaja." : undefined,
      "Preimenovanje ni uspelo."
    );
  }
  return done();
}

// Izdelki izbrisane kategorije ostanejo, le brez kategorije (on delete set null).
export async function deleteCategoryAction(categoryId: string): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase.from("cekar_categories").delete().eq("id", categoryId);
  if (error) return fail(undefined, "Brisanje ni uspelo.");
  return done();
}

export async function reorderCategoriesAction(
  orderedIds: string[]
): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      c.supabase.from("cekar_categories").update({ position: i + 1 }).eq("id", id)
    )
  );
  if (results.some((r) => r.error)) return fail(undefined, "Shranjevanje ni uspelo.");
  return done();
}

// ===== Računi (slike) =====

// Slika je že naložena (iz brskalnika, src/lib/cekar/receipts.ts) — tu jo
// samo povežemo s seznamom in trgovino.
export async function addReceiptAction(
  listId: string,
  storeId: string,
  path: string
): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase.from("cekar_receipts").insert({
    household_id: c.householdId,
    list_id: listId,
    store_id: storeId,
    path,
  });
  if (error) {
    await c.supabase.storage.from(RECEIPT_BUCKET).remove([path]);
    return fail(undefined, "Računa ni bilo mogoče shraniti.");
  }
  return done();
}

export async function deleteReceiptAction(receiptId: string): Promise<CekarResult> {
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { data: receipt, error } = await c.supabase
    .from("cekar_receipts")
    .delete()
    .eq("id", receiptId)
    .select("path")
    .maybeSingle();
  if (error) return fail(undefined, "Brisanje ni uspelo.");
  if (receipt) await c.supabase.storage.from(RECEIPT_BUCKET).remove([receipt.path]);
  return done();
}

// ===== Zapravljeno =====

// Znesek za trgovino na seznamu; null pobriše vnos.
export async function setStoreSpentAction(
  listId: string,
  storeId: string,
  amount: number | null
): Promise<CekarResult> {
  if (amount !== null && !(amount >= 0 && amount < 100_000_000)) {
    return { error: "Neveljaven znesek." };
  }
  const c = await ctx();
  if (c.error !== undefined) return { error: c.error };
  const { error } = await c.supabase
    .from("cekar_list_stores")
    .update({ spent: amount === null ? null : Math.round(amount * 100) / 100 })
    .eq("list_id", listId)
    .eq("store_id", storeId);
  if (error) return fail(undefined, "Shranjevanje ni uspelo.");
  return done();
}
