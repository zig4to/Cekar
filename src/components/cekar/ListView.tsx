"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addItemAction,
  clearCheckedAction,
  deleteItemAction,
  archiveListAction,
  deleteListAction,
  unarchiveListAction,
  removeStoreFromListAction,
  renameListAction,
  toggleItemAction,
  updateItemAction,
} from "@/actions/cekar";
import { createClient } from "@/lib/supabase/client";
import { rememberList } from "@/lib/cekar/preview";
import { makeCategoryOf } from "@/lib/cekar/categories";
import { formatEur, itemsLabel } from "@/lib/cekar/text";
import Menu, { MenuItem } from "@/components/ui/Menu";
import PromptDialog from "@/components/ui/PromptDialog";
import { IconArrowLeft, IconCheck, IconPencil, IconPlus, IconTrash } from "@/components/ui/icons";
import StoreSection from "@/components/cekar/StoreSection";
import SingleItemStore from "@/components/cekar/SingleItemStore";
import AddStoreDialog from "@/components/cekar/AddStoreDialog";
import QuickAddDialog from "@/components/cekar/QuickAddDialog";
import WriteToListDialog from "@/components/cekar/WriteToListDialog";
import Button from "@/components/ui/Button";
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
  shoppingLists,
}: {
  detail: CekarListDetail;
  collapsedStoreIds: string[];
  shoppingLists: { id: string; name: string }[]; // cilji za "Zapiši na seznam"
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
  const [writing, setWriting] = useState(false);
  const isTemplate = list.is_template;
  const archived = list.archived_at !== null;
  const spentTotal = Object.values(detail.spent).reduce((a, b) => a + b, 0);
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
        isTemplate: list.is_template,
        storeNames: stores.map((s) => s.name),
        storeIds: stores.map((s) => s.id),
        items: detail.items.map(({ id, store_id, product_id, name, checked, quantity }) => ({
          id,
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
  }, [archived, list.id, list.name, list.is_template, stores, allStores, detail.items, detail.products, categories]);

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

  const onQuantity = (item: CekarItem, quantity: number) =>
    run({ type: "edit", id: item.id, name: item.name, quantity }, () =>
      updateItemAction(item.id, item.name, quantity)
    );

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
          href={archived ? "/arhiv" : "/"}
          aria-label="Nazaj na sezname"
          className="-ml-2 rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <IconArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{list.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isTemplate
              ? `Stalni seznam · ${itemsLabel(total)}`
              : total === 0
                ? "Prazen seznam"
                : `${checked} od ${total} v košarici`}
            {!isTemplate && spentTotal > 0 && ` · zapravljeno ${formatEur(spentTotal)}`}
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
              {/* stalni seznam se ne odkljukuje in ne briše */}
              {!isTemplate && (
                <>
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
            </>
          )}
        </Menu>
      </div>

      {isTemplate && (
        <Button
          onClick={() => setWriting(true)}
          disabled={total === 0}
          className="w-full"
        >
          <IconPlus />
          Zapiši na seznam
        </Button>
      )}

      {archived && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="min-w-0 flex-1 text-amber-900 dark:text-amber-200">
            Nakup opravljen{" "}
            {new Date(list.archived_at!).toLocaleDateString("sl-SI", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · seznam je v arhivu.
          </p>
          <Button
            variant="secondary"
            className="flex-shrink-0"
            onClick={() =>
              startTransition(async () => {
                const res = await unarchiveListAction(list.id);
                if (res.error) setError(res.error);
              })
            }
          >
            Vrni med sezname
          </Button>
        </div>
      )}

      {!isTemplate && total > 0 && (
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

      {stores.map((store) => {
        const own = items.filter((i) => i.store_id === store.id);
        if (store.single_item) {
          return (
            <SingleItemStore
              listId={list.id}
              key={store.id}
              store={store}
              item={own.find((i) => !i.checked) ?? own[0]}
              template={isTemplate}
              onToggle={onToggle}
              onQuantity={onQuantity}
              onAdd={(name) => onAdd(store.id, name)}
              onRemoveStore={() => onRemoveStore(store.id)}
            />
          );
        }
        return (
        <StoreSection
          key={store.id}
          listId={list.id}
          store={store}
          items={own}
          products={products.filter((p) => p.store_id === store.id)}
          onToggle={onToggle}
          onAdd={(name, quantity) => onAdd(store.id, name, quantity)}
          onDelete={onDelete}
          onEdit={setEditingItem}
          onQuantity={onQuantity}
          onRemoveStore={() => onRemoveStore(store.id)}
          initialCollapsed={collapsedStoreIds.includes(store.id)}
          categories={categories}
          categoryOf={categoryOf}
          receiptProps={{
            householdId: list.household_id,
            listId: list.id,
            receipts: detail.receipts.filter((r) => r.store_id === store.id),
            onError: setError,
          }}
          spent={detail.spent[store.id] ?? null}
          template={isTemplate}
        />
        );
      })}

      <button
        type="button"
        onClick={() => setAddingStore(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-400 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
      >
        <IconPlus /> Dodaj trgovino
      </button>

      {/* nakup opravljen → potrditev v istem mestu → seznam v arhiv */}
      {!isTemplate && !archived && <FinishShopping listId={list.id} />}

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
      {isTemplate && (
        <WriteToListDialog
          open={writing}
          onClose={() => setWriting(false)}
          items={items.filter((i) => !i.id.startsWith("temp-"))}
          stores={stores}
          lists={shoppingLists}
        />
      )}
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

// "Nakup opravljen" pod "Dodaj trgovino": prvi klik odpre majhno potrditev
// na istem mestu (ne okna čez zaslon), potrditev seznam premakne v arhiv.
function FinishShopping({ listId }: { listId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        <IconCheck className="h-5 w-5" /> Nakup opravljen
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
      <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
        Ali ste prepričani?
      </p>
      <p className="mt-0.5 text-xs text-emerald-800/80 dark:text-emerald-200/70">
        Seznam se premakne v arhiv nakupov. Od tam ga lahko kadar koli vrnete.
      </p>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
          Prekliči
        </Button>
        <Button
          autoFocus
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await archiveListAction(listId);
              if (res?.error) setError(res.error);
            })
          }
        >
          Da, v arhiv
        </Button>
      </div>
    </div>
  );
}
