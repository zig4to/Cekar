"use client";

import { useState, useTransition } from "react";
import Menu, { MenuItem } from "@/components/ui/Menu";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { IconCheck, IconEuro, IconMinus, IconPlus, IconTrash } from "@/components/ui/icons";
import StoreLogo from "@/components/cekar/StoreLogo";
import QuantityBadge from "@/components/cekar/QuantityBadge";
import { setStoreUnitPriceAction } from "@/actions/cekar";
import { MAX_QUANTITY, formatEur, parseAmount } from "@/lib/cekar/text";
import clsx from "@/lib/utils/clsx";
import type { CekarItem, CekarStore } from "@/lib/types/database.types";

// Trgovina z enim samim izdelkom (Mlekarica → Domače mleko, Domača Jajca →
// Jajca): namesto sekcije trgovine ena vrstica — logo, izdelek, kljukica in
// količina. Če izdelka na seznamu ni (npr. izbrisan), ga + doda.
// Z nastavljeno ceno za kos (meni ⋯) je ob izdelku znesek količina × cena,
// ki se ob odkljukanju zapiše kot zapravljeno v tej trgovini.
export default function SingleItemStore({
  listId,
  store,
  item,
  template = false,
  onToggle,
  onQuantity,
  onAdd,
  onRemoveStore,
}: {
  listId: string;
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
  const [priceOpen, setPriceOpen] = useState(false);
  const price = store.unit_price === null ? null : Number(store.unit_price);

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
        className="flex min-w-0 flex-1 items-center gap-3 py-4 pl-3 text-left sm:py-2.5"
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
        <StoreLogo name={store.name} className="h-7 w-7 sm:h-5 sm:w-5" />
        <span
          className={clsx(
            "min-w-0 break-words text-lg font-medium sm:text-base",
            checked && "text-gray-400 line-through dark:text-gray-500",
            !item && "text-gray-400 dark:text-gray-500"
          )}
        >
          {name}
        </span>
        {item && <QuantityBadge quantity={item.quantity} checked={checked} />}
        {!template && item && price !== null && (
          <span
            title={`${item.quantity} × ${formatEur(price)}`}
            className={clsx(
              "ml-auto whitespace-nowrap text-xs font-semibold tabular-nums",
              checked
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            {formatEur(Math.round(item.quantity * price * 100) / 100)}
          </span>
        )}
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
          <>
            <MenuItem
              onClick={() => {
                close();
                setPriceOpen(true);
              }}
            >
              <IconEuro />
              {price === null ? `Nastavi ceno: ${name}` : `Cena: ${formatEur(price)} / kos`}
            </MenuItem>
            <MenuItem
              danger
              onClick={() => {
                close();
                onRemoveStore();
              }}
            >
              <IconTrash /> Odstrani s seznama
            </MenuItem>
          </>
        )}
      </Menu>
      <UnitPriceDialog
        open={priceOpen}
        onClose={() => setPriceOpen(false)}
        listId={listId}
        storeId={store.id}
        productName={name}
        price={price}
      />
    </section>
  );
}

// Cena za kos; prazno polje ceno pobriše (znesek se potem ne računa več).
function UnitPriceDialog({
  open,
  onClose,
  listId,
  storeId,
  productName,
  price,
}: {
  open: boolean;
  onClose: () => void;
  listId: string;
  storeId: string;
  productName: string;
  price: number | null;
}) {
  const initial = price === null ? "" : price.toFixed(2).replace(".", ",");
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [wasOpen, setWasOpen] = useState(open);

  // ob vsakem odprtju začni z aktualno ceno
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValue(initial);
      setError(null);
    }
  }

  const submit = () => {
    const amount = parseAmount(value);
    if (Number.isNaN(amount)) {
      setError("Vpiši ceno, npr. 1,20.");
      return;
    }
    startTransition(async () => {
      const res = await setStoreUnitPriceAction(listId, storeId, amount);
      if (res.error) setError(res.error);
      else onClose();
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Cena · ${productName}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <Field label="Cena za kos (€)" htmlFor="unit-price">
          <Input
            id="unit-price"
            autoFocus
            inputMode="decimal"
            placeholder="0,00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Ko izdelek odkljukaš, se zapravljeno izračuna kot količina × cena. Prazno
          polje ceno pobriše.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Prekliči
          </Button>
          <Button type="submit" disabled={pending}>
            Shrani
          </Button>
        </div>
      </form>
    </Modal>
  );
}
