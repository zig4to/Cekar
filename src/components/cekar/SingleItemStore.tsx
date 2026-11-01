"use client";

import Menu, { MenuItem } from "@/components/ui/Menu";
import { IconCheck, IconMinus, IconPlus, IconTrash } from "@/components/ui/icons";
import StoreLogo from "@/components/cekar/StoreLogo";
import QuantityBadge from "@/components/cekar/QuantityBadge";
import { MAX_QUANTITY } from "@/lib/cekar/text";
import clsx from "@/lib/utils/clsx";
import type { CekarItem, CekarStore } from "@/lib/types/database.types";

// Trgovina z enim samim izdelkom (Mlekarica → Domače mleko, Domača Jajca →
// Jajca): namesto sekcije trgovine ena vrstica — logo, izdelek, kljukica in
// količina. Če izdelka na seznamu ni (npr. izbrisan), ga + doda.
export default function SingleItemStore({
  store,
  item,
  template = false,
  onToggle,
  onQuantity,
  onAdd,
  onRemoveStore,
}: {
  store: CekarStore;
  item: CekarItem | undefined;
  template?: boolean; // stalni seznam: brez odkljukanja
  onToggle: (item: CekarItem) => void;
  onQuantity: (item: CekarItem, quantity: number) => void;
  onAdd: (name: string) => void;
  onRemoveStore: () => void;
}) {
  const name = item?.name ?? store.default_items[0] ?? store.name;
  const pending = item?.id.startsWith("temp-") ?? false;
  const checked = item?.checked ?? false;

  return (
    <section
      className={clsx(
        "flex items-center gap-1 rounded-lg border border-gray-200 bg-white pr-1 dark:border-gray-800 dark:bg-gray-900",
        pending && "opacity-60"
      )}
    >
      <button
        type="button"
        disabled={!item || pending || template}
        onClick={() => item && onToggle(item)}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left"
      >
        {!template && item && (
          <span
            className={clsx(
              "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2",
              checked
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-gray-300 dark:border-gray-600"
            )}
          >
            {checked && <IconCheck className="h-3.5 w-3.5" strokeWidth={3} />}
          </span>
        )}
        <StoreLogo name={store.name} />
        <span
          className={clsx(
            "min-w-0 break-words font-medium",
            checked && "text-gray-400 line-through dark:text-gray-500",
            !item && "text-gray-400 dark:text-gray-500"
          )}
        >
          {name}
        </span>
        {item && <QuantityBadge quantity={item.quantity} checked={checked} />}
      </button>

      {!item ? (
        <button
          type="button"
          aria-label={`Dodaj ${name}`}
          onClick={() => onAdd(name)}
          className="rounded p-1.5 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
        >
          <IconPlus />
        </button>
      ) : (
        !checked &&
        !pending && (
          <>
            <button
              type="button"
              aria-label={`Manj: ${name}`}
              disabled={item.quantity <= 1}
              onClick={() => onQuantity(item, item.quantity - 1)}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <IconMinus />
            </button>
            <button
              type="button"
              aria-label={`Več: ${name}`}
              disabled={item.quantity >= MAX_QUANTITY}
              onClick={() => onQuantity(item, item.quantity + 1)}
              className="rounded p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-30 dark:hover:bg-emerald-950 dark:hover:text-emerald-300"
            >
              <IconPlus />
            </button>
          </>
        )
      )}
      <Menu label={`Možnosti za ${store.name}`}>
        {(close) => (
          <MenuItem
            danger
            onClick={() => {
              close();
              onRemoveStore();
            }}
          >
            <IconTrash /> Odstrani s seznama
          </MenuItem>
        )}
      </Menu>
    </section>
  );
}
