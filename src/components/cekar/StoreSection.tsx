"use client";

import { useEffect, useState } from "react";
import Menu, { MenuItem } from "@/components/ui/Menu";
import {
  IconCheck,
  IconChevronDown,
  IconMinus,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "@/components/ui/icons";
import AddItemInput from "@/components/cekar/AddItemInput";
import StoreLogo from "@/components/cekar/StoreLogo";
import QuantityBadge from "@/components/cekar/QuantityBadge";
import { MAX_QUANTITY } from "@/lib/cekar/text";
import { setCollapsed } from "@/lib/cekar/collapsed";
import clsx from "@/lib/utils/clsx";
import type { CekarItem, CekarProduct, CekarStore } from "@/lib/types/database.types";

// Izdelek, ki še čaka na potrditev strežnika (optimistično dodan).
const isTemp = (item: CekarItem) => item.id.startsWith("temp-");

// Starejša različica je zloženost hranila v localStorage — enkrat prenesemo v piškotek.
const legacyKey = (listId: string, storeId: string) => `cekar-collapsed:${listId}:${storeId}`;

// Ena trgovina na seznamu: glava, checklista (neodkljukani po vrstnem redu
// dodajanja, odkljukani na dnu) in vnos novega izdelka s predlogi.
export default function StoreSection({
  listId,
  store,
  items,
  products,
  onToggle,
  onAdd,
  onDelete,
  onEdit,
  onQuantity,
  onRemoveStore,
  initialCollapsed,
}: {
  listId: string;
  store: CekarStore;
  items: CekarItem[];
  products: CekarProduct[];
  onToggle: (item: CekarItem) => void;
  onAdd: (name: string, quantity: number) => void;
  onDelete: (item: CekarItem) => void;
  onEdit: (item: CekarItem) => void;
  onQuantity: (item: CekarItem, quantity: number) => void;
  onRemoveStore: () => void;
  initialCollapsed: boolean; // iz piškotka, prebranega na strežniku
}) {
  const open = items
    .filter((i) => !i.checked)
    .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  const checked = items
    .filter((i) => i.checked)
    .sort((a, b) => (a.checked_at ?? "").localeCompare(b.checked_at ?? ""));
  const openNames = open.map((i) => i.name);

  const [collapsed, setCollapsedState] = useState(initialCollapsed);
  useEffect(() => {
    try {
      if (localStorage.getItem(legacyKey(listId, store.id)) === "1") {
        localStorage.removeItem(legacyKey(listId, store.id));
        setCollapsed(listId, store.id, true);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCollapsedState(true);
      }
    } catch {
      /* zasebni način */
    }
  }, [listId, store.id]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsedState(next);
    setCollapsed(listId, store.id, next);
  };

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <header
        className={clsx(
          "flex items-center gap-1 bg-emerald-50/60 pr-2 dark:bg-emerald-950/20",
          !collapsed && "border-b border-gray-100 dark:border-gray-800"
        )}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-3 text-left"
        >
          <IconChevronDown
            className={clsx(
              "h-4 w-4 flex-shrink-0 text-gray-500 transition-transform dark:text-gray-400",
              collapsed && "-rotate-90"
            )}
          />
          <StoreLogo name={store.name} />
          <h2 className="min-w-0 flex-1 truncate font-semibold">{store.name}</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {checked.length}/{items.length}
          </span>
        </button>
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

      {!collapsed && (
        <>
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
                  <QuantityBadge quantity={item.quantity} checked={item.checked} />
                </button>
                {!isTemp(item) && (
                  <>
                    {/* hitra sprememba količine — oznaka "3×" ob imenu se posodobi takoj (optimistično) */}
                    {!item.checked && (
                      <>
                        <button
                          type="button"
                          aria-label={`Manj: ${item.name}`}
                          disabled={item.quantity <= 1}
                          onClick={() => onQuantity(item, item.quantity - 1)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        >
                          <IconMinus />
                        </button>
                        <button
                          type="button"
                          aria-label={`Več: ${item.name}`}
                          disabled={item.quantity >= MAX_QUANTITY}
                          onClick={() => onQuantity(item, item.quantity + 1)}
                          className="rounded p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-30 dark:hover:bg-emerald-950 dark:hover:text-emerald-300"
                        >
                          <IconPlus />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      aria-label={`Uredi ${item.name}`}
                      onClick={() => onEdit(item)}
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
        </>
      )}
    </section>
  );
}
