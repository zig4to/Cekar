"use client";

import Menu, { MenuItem } from "@/components/ui/Menu";
import { IconCheck, IconPencil, IconStore, IconTrash, IconX } from "@/components/ui/icons";
import AddItemInput from "@/components/cekar/AddItemInput";
import clsx from "@/lib/utils/clsx";
import type { CekarItem, CekarProduct, CekarStore } from "@/lib/types/database.types";

// Izdelek, ki še čaka na potrditev strežnika (optimistično dodan).
const isTemp = (item: CekarItem) => item.id.startsWith("temp-");

// Ena trgovina na seznamu: glava, checklista (neodkljukani po vrstnem redu
// dodajanja, odkljukani na dnu) in vnos novega izdelka s predlogi.
export default function StoreSection({
  store,
  items,
  products,
  onToggle,
  onAdd,
  onDelete,
  onRename,
  onRemoveStore,
}: {
  store: CekarStore;
  items: CekarItem[];
  products: CekarProduct[];
  onToggle: (item: CekarItem) => void;
  onAdd: (name: string) => void;
  onDelete: (item: CekarItem) => void;
  onRename: (item: CekarItem) => void;
  onRemoveStore: () => void;
}) {
  const open = items
    .filter((i) => !i.checked)
    .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  const checked = items
    .filter((i) => i.checked)
    .sort((a, b) => (a.checked_at ?? "").localeCompare(b.checked_at ?? ""));
  const openNames = open.map((i) => i.name);

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <header className="flex items-center gap-2 border-b border-gray-100 bg-emerald-50/60 px-3 py-2 dark:border-gray-800 dark:bg-emerald-950/20">
        <IconStore className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
        <h2 className="min-w-0 flex-1 truncate font-semibold">{store.name}</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {checked.length}/{items.length}
        </span>
        <Menu label={`Možnosti za ${store.name}`}>
          {(close) => (
            <MenuItem
              danger
              onClick={() => {
                close();
                if (
                  items.length === 0 ||
                  window.confirm(`Odstranim ${store.name} in njene izdelke s tega seznama?`)
                ) {
                  onRemoveStore();
                }
              }}
            >
              <IconTrash /> Odstrani s seznama
            </MenuItem>
          )}
        </Menu>
      </header>

      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {[...open, ...checked].map((item) => (
          <li
            key={item.id}
            className={clsx("flex items-center gap-1 pr-1", isTemp(item) && "opacity-60")}
          >
            <button
              type="button"
              disabled={isTemp(item)}
              onClick={() => onToggle(item)}
              className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
            >
              <span
                className={clsx(
                  "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2",
                  item.checked
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-gray-300 dark:border-gray-600"
                )}
              >
                {item.checked && <IconCheck className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span
                className={clsx(
                  "min-w-0 break-words",
                  item.checked && "text-gray-400 line-through dark:text-gray-500"
                )}
              >
                {item.name}
              </span>
            </button>
            {!isTemp(item) && (
              <>
                <button
                  type="button"
                  aria-label={`Uredi ${item.name}`}
                  onClick={() => onRename(item)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  <IconPencil />
                </button>
                <button
                  type="button"
                  aria-label={`Odstrani ${item.name}`}
                  onClick={() => onDelete(item)}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                >
                  <IconX />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <AddItemInput
        storeName={store.name}
        products={products}
        exclude={openNames}
        onAdd={onAdd}
      />
    </section>
  );
}
