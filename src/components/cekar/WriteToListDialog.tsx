"use client";

import { useEffect, useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { IconCheck } from "@/components/ui/icons";
import StoreLogo from "@/components/cekar/StoreLogo";
import QuantityBadge from "@/components/cekar/QuantityBadge";
import { copyTemplateAction } from "@/actions/cekar";
import clsx from "@/lib/utils/clsx";

type TemplateItem = { id: string; store_id: string; name: string; quantity: number };

const NEW_LIST = "";

function defaultListName() {
  const d = new Date();
  return `Nakup ${d.getDate()}. ${d.getMonth() + 1}.`;
}

// Stalni seznam → nakupovalni seznam. Pregled izdelkov po trgovinah (vsi
// izbrani, odkljukaš, česar ta teden ne rabiš), izbira ciljnega seznama ali
// nov seznam. Po zapisu strežnik preusmeri na ciljni seznam.
export default function WriteToListDialog({
  open,
  onClose,
  items,
  stores,
  lists,
}: {
  open: boolean;
  onClose: () => void;
  items: TemplateItem[];
  stores: { id: string; name: string }[]; // trgovine stalnega seznama, v vrstnem redu
  lists: { id: string; name: string }[]; // nakupovalni seznami (brez stalnega)
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState(NEW_LIST);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    // Ob vsakem odprtju: vse izbrano, nov seznam z današnjim datumom.
    /* eslint-disable react-hooks/set-state-in-effect */
    setSelected(new Set(items.map((i) => i.id)));
    setTarget(NEW_LIST);
    setNewName(defaultListName());
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = () => {
    setError(null);
    startTransition(async () => {
      // ob uspehu strežnik preusmeri na ciljni seznam (redirect)
      const res = await copyTemplateAction([...selected], target || null, newName);
      if (res?.error) setError(res.error);
    });
  };

  const allSelected = selected.size === items.length;

  return (
    <Modal open={open} onClose={onClose} title="Zapiši na seznam">
      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Stalni seznam je prazen. Odpri ga in dodaj izdelke, ki jih kupuješ vsak teden.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Izbrano {selected.size} od {items.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))
                }
                className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                {allSelected ? "Odznači vse" : "Izberi vse"}
              </button>
            </div>
            <div className="max-h-[45vh] space-y-3 overflow-y-auto">
              {stores.map((store) => {
                const own = items.filter((i) => i.store_id === store.id);
                if (!own.length) return null;
                return (
                  <div key={store.id}>
                    <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                      <StoreLogo name={store.name} className="h-4 w-4" />
                      {store.name}
                    </p>
                    <ul className="divide-y divide-gray-100 overflow-hidden rounded-md border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
                      {own.map((item) => {
                        const on = selected.has(item.id);
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => toggle(item.id)}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left"
                            >
                              <span
                                className={clsx(
                                  "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2",
                                  on
                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                    : "border-gray-300 dark:border-gray-600"
                                )}
                              >
                                {on && <IconCheck className="h-3.5 w-3.5" strokeWidth={3} />}
                              </span>
                              <span
                                className={clsx(
                                  "min-w-0 break-words",
                                  !on && "text-gray-400 dark:text-gray-500"
                                )}
                              >
                                {item.name}
                              </span>
                              <QuantityBadge quantity={item.quantity} checked={!on} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>

            <Field label="Na seznam" htmlFor="write-target">
              <select
                id="write-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800"
              >
                <option value={NEW_LIST}>+ Nov seznam</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            {target === NEW_LIST && (
              <Field label="Ime novega seznama" htmlFor="write-name">
                <Input
                  id="write-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </Field>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Prekliči
          </Button>
          {items.length > 0 && (
            <Button onClick={submit} disabled={pending || selected.size === 0}>
              {pending ? "Zapisujem …" : `Zapiši (${selected.size})`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
