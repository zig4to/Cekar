"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addItemAction,
  clearCheckedAction,
  deleteItemAction,
  deleteListAction,
  removeStoreFromListAction,
  renameListAction,
  toggleItemAction,
  updateItemAction,
} from "@/actions/cekar";
import { createClient } from "@/lib/supabase/client";
import { rememberList } from "@/lib/cekar/preview";
import { makeCategoryOf } from "@/lib/cekar/categories";
import Menu, { MenuItem } from "@/components/ui/Menu";
import PromptDialog from "@/components/ui/PromptDialog";
import { IconArrowLeft, IconPencil, IconPlus, IconTrash } from "@/components/ui/icons";
import StoreSection from "@/components/cekar/StoreSection";
import AddStoreDialog from "@/components/cekar/AddStoreDialog";
import QuickAddDialog from "@/components/cekar/QuickAddDialog";
import ItemEditDialog from "@/components/cekar/ItemEditDialog";
import type { CekarItem, CekarListDetail, CekarProduct } from "@/lib/types/database.types";

type CategoryOp = { productId: string; categoryId: string | null };

function applyCategoryOp(products: CekarProduct[], op: CategoryOp): CekarProduct[] {
  return products.map((p) => (p.id === op.productId ? { ...p, category_id: op.categoryId } : p));
}

type OptimisticOp =
  | { type: "toggle"; id: string; checked: boolean }
  | { type: "add"; item: CekarItem }
  | { type: "delete"; id: string }
  | { type: "edit"; id: string; name: string; quantity: number };

function applyOp(items: CekarItem[], op: OptimisticOp): CekarItem[] {
  switch (op.type) {
    case "toggle":
      return items.map((i) =>
        i.id === op.id
          ? { ...i, checked: op.checked, checked_at: op.checked ? new Date().toISOString() : null }
          : i
      );
    case "add":
      return [...items, op.item];
    case "delete":
      return items.filter((i) => i.id !== op.id);
    case "edit":
      return items.map((i) =>
        i.id === op.id ? { ...i, name: op.name, quantity: op.quantity } : i
      );
  }
}

// Pogled enega nakupovalnega seznama: trgovine (v vrstnem redu seznama),
// pod vsako checklista izdelkov in vnos s predlogi iz kataloga te trgovine.
// Spremembe se prikažejo takoj (useOptimistic), strežnik jih potrdi prek
// revalidatePath; spremembe drugih članov pridejo prek Supabase realtime.
export default function ListView({
  detail,
  collapsedStoreIds,
}: {
  detail: CekarListDetail;
  collapsedStoreIds: string[];
}) {
  const { list, stores, allStores, categories } = detail;
  const router = useRouter();
  const [items, applyOptimistic] = useOptimistic(detail.items, applyOp);
  // Katalog z optimistično spremembo kategorije: izdelek se takoj premakne v
  // novo skupino, še preden strežnik potrdi.
  const [products, applyCategory] = useOptimistic(detail.products, applyCategoryOp);
  const categoryOf = makeCategoryOf(products, categories);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [renamingList, setRenamingList] = useState(false);
  const [editingItem, setEditingItem] = useState<CekarItem | null>(null);
  const [addingStore, setAddingStore] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const tempSeq = useRef(0);

  // Živo osveževanje: ob katerikoli spremembi izdelkov/trgovin na seznamih
  // gospodinjstva (RLS omeji dogodke) osvežimo strežniške podatke.
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };
    const channel = supabase
      .channel(`cekar-list-${list.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cekar_items" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "cekar_list_stores" }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [list.id, router]);

  // Povzetek za takojšnji pogled ob naslednjem odprtju (loading.tsx).
  useEffect(() => {
    rememberList(
      {
        id: list.id,
        name: list.name,
        storeNames: stores.map((s) => s.name),
        storeIds: stores.map((s) => s.id),
        items: detail.items.map(({ store_id, product_id, name, checked, quantity }) => ({
          store_id,
          product_id,
          name,
          checked,
          quantity,
        })),
        total: detail.items.length,
        checked: detail.items.filter((i) => i.checked).length,
      },
      allStores,
      detail.products,
      categories
    );
  }, [list.id, list.name, stores, allStores, detail.items, detail.products, categories]);

  const run = (op: OptimisticOp, action: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      applyOptimistic(op);
      const res = await action();
      if (res.error) setError(res.error);
    });
  };

  const onToggle = (item: CekarItem) =>
    run({ type: "toggle", id: item.id, checked: !item.checked }, () =>
      toggleItemAction(item.id, !item.checked)
    );

  const onAdd = (storeId: string, name: string, quantity = 1) => {
    const now = new Date().toISOString();
    run(
      {
        type: "add",
        item: {
          id: `temp-${++tempSeq.current}`,
          list_id: list.id,
          store_id: storeId,
          product_id: null,
          name,
          note: null,
          checked: false,
          checked_at: null,
          position: Number.MAX_SAFE_INTEGER,
          quantity,
          created_at: now,
        },
      },
      () => addItemAction(list.id, storeId, name, quantity)
    );
  };

  const onSaveEdit = (
    item: CekarItem,
    name: string,
    quantity: number,
    categoryId: string | null
  ) => {
    const categoryChanged = categoryId !== categoryOf(item);
    setError(null);
    startTransition(async () => {
      applyOptimistic({ type: "edit", id: item.id, name, quantity });
      if (categoryChanged && item.product_id) {
        applyCategory({ productId: item.product_id, categoryId });
      }
      // kategorijo vedno zapišemo: tudi ugibana (še neshranjena) se tako potrdi
      const res = await updateItemAction(item.id, name, quantity, categoryId);
      if (res.error) setError(res.error);
    });
  };

  const onDelete = (item: CekarItem) =>
    run({ type: "delete", id: item.id }, () => deleteItemAction(item.id));

  const onRemoveStore = (storeId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await removeStoreFromListAction(list.id, storeId);
      if (res.error) setError(res.error);
    });
  };

  const total = items.length;
  const checked = items.filter((i) => i.checked).length;
  const availableStores = allStores.filter((s) => !stores.some((ls) => ls.id === s.id));

  return (
    // pb-24: zadnja trgovina ne sme ostati pod plavajočim gumbom
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Nazaj na sezname"
          className="-ml-2 rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <IconArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{list.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total === 0 ? "Prazen seznam" : `${checked} od ${total} v košarici`}
          </p>
        </div>
        <Menu label="Možnosti seznama">
          {(close) => (
            <>
              <MenuItem
                onClick={() => {
                  close();
                  setRenamingList(true);
                }}
              >
                <IconPencil /> Preimenuj
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  startTransition(async () => {
                    await clearCheckedAction(list.id);
                  });
                }}
              >
                <IconTrash /> Počisti odkljukane
              </MenuItem>
              <MenuItem
                danger
                onClick={() => {
                  close();
                  if (window.confirm(`Izbrišem seznam „${list.name}“?`)) {
                    startTransition(async () => {
                      await deleteListAction(list.id);
                    });
                  }
                }}
              >
                <IconTrash /> Izbriši seznam
              </MenuItem>
            </>
          )}
        </Menu>
      </div>

      {total > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${(checked / total) * 100}%` }}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {stores.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Dodaj trgovino, v kateri boš nakupoval, nato pod njo izdelke.
        </p>
      )}

      {stores.map((store) => (
        <StoreSection
          key={store.id}
          listId={list.id}
          store={store}
          items={items.filter((i) => i.store_id === store.id)}
          products={products.filter((p) => p.store_id === store.id)}
          onToggle={onToggle}
          onAdd={(name, quantity) => onAdd(store.id, name, quantity)}
          onDelete={onDelete}
          onEdit={setEditingItem}
          onQuantity={(item, quantity) =>
            run({ type: "edit", id: item.id, name: item.name, quantity }, () =>
              updateItemAction(item.id, item.name, quantity)
            )
          }
          onRemoveStore={() => onRemoveStore(store.id)}
          initialCollapsed={collapsedStoreIds.includes(store.id)}
          categories={categories}
          categoryOf={categoryOf}
        />
      ))}

      <button
        type="button"
        onClick={() => setAddingStore(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-400 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
      >
        <IconPlus /> Dodaj trgovino
      </button>

      <button
        type="button"
        onClick={() => setQuickAdd(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3.5 font-medium text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-700"
      >
        <IconPlus className="h-5 w-5" />
        Hitro dodaj
      </button>

      <QuickAddDialog
        open={quickAdd}
        onClose={() => setQuickAdd(false)}
        listStores={stores}
        allStores={allStores}
        products={products}
        items={items}
        onAdd={onAdd}
      />
      <AddStoreDialog
        open={addingStore}
        onClose={() => setAddingStore(false)}
        listId={list.id}
        stores={availableStores}
      />
      <PromptDialog
        open={renamingList}
        onClose={() => setRenamingList(false)}
        title="Preimenuj seznam"
        label="Ime seznama"
        initialValue={list.name}
        onSubmit={(name) => renameListAction(list.id, name)}
      />
      <ItemEditDialog
        item={editingItem}
        onClose={() => setEditingItem(null)}
        categories={categories}
        categoryOf={categoryOf}
        onSave={onSaveEdit}
      />
    </div>
  );
}
