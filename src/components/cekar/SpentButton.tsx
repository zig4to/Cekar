"use client";

import { useOptimistic, useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { IconEuro } from "@/components/ui/icons";
import { setStoreSpentAction } from "@/actions/cekar";
import { formatEur, parseAmount } from "@/lib/cekar/text";
import clsx from "@/lib/utils/clsx";

// V glavi trgovine: koliko smo zapravili v tej trgovini na tem seznamu.
// Brez vnosa ikona €, z vnosom znesek; prazno polje vnos pobriše.
export default function SpentButton({
  listId,
  storeId,
  storeName,
  spent,
}: {
  listId: string;
  storeId: string;
  storeName: string;
  spent: number | null;
}) {
  const [shown, setShown] = useOptimistic(spent);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openDialog = () => {
    setValue(shown === null ? "" : shown.toFixed(2).replace(".", ","));
    setError(null);
    setOpen(true);
  };

  const submit = () => {
    const amount = parseAmount(value);
    if (Number.isNaN(amount)) {
      setError("Vpiši znesek, npr. 23,45.");
      return;
    }
    setOpen(false);
    startTransition(async () => {
      setShown(amount);
      const res = await setStoreSpentAction(listId, storeId, amount);
      if (res.error) {
        setError(res.error);
        setOpen(true);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Zapravljeno v ${storeName}`}
        title="Zapravljeno"
        onClick={openDialog}
        className={clsx(
          "rounded p-1.5 hover:bg-white/70 dark:hover:bg-gray-800",
          shown === null
            ? "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
            : "whitespace-nowrap px-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400",
          pending && "animate-pulse"
        )}
      >
        {shown === null ? <IconEuro /> : formatEur(shown)}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Zapravljeno · ${storeName}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <Field label="Znesek (€)" htmlFor="spent-value">
            <Input
              id="spent-value"
              autoFocus
              inputMode="decimal"
              placeholder="0,00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={value === ""}
              onClick={() => {
                setValue("");
                setError(null);
                document.getElementById("spent-value")?.focus();
              }}
            >
              Počisti
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Prekliči
            </Button>
            <Button type="submit" disabled={pending}>
              Shrani
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
