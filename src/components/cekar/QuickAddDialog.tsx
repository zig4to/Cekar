"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { IconPlus, IconStore } from "@/components/ui/icons";
import { norm } from "@/lib/cekar/text";
import type { CekarItem, CekarProduct, CekarStore } from "@/lib/types/database.types";

const MAX_SUGGESTIONS = 8;

// Hitro dodajanje na seznam brez iskanja prave trgovine: med pisanjem se
// pokažejo izdelki iz kataloga VSEH trgovin skupaj s trgovino, kjer so bili
// že kupljeni (npr. "Malinovec · Lidl"). Klik doda izdelek pod to trgovino —
// če trgovine še ni na seznamu, jo strežnik doda sam (addItemAction).
// Za nov izdelek izbereš trgovino z gumbi pod predlogi.
export default function QuickAddDialog({
  open,
  onClose,
  listStores,
  allStores,
  products,
  items,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  listStores: CekarStore[];
  allStores: CekarStore[];
  products: CekarProduct[]; // že razvrščeni po use_count / last_used_at
  items: CekarItem[];
  onAdd: (storeId: string, name: string) => void;
}) {
  const [value, setValue] = useState("");
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // Ponastavi polje ob vsakem odprtju dialoga.
    /* eslint-disable react-hooks/set-state-in-effect */
    setValue("");
    setLastAdded(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const storeName = new Map(allStores.map((s) => [s.id, s.name]));
  // Izdelki, ki so že neodkljukani na seznamu (v isti trgovini), se ne ponujajo.
  const onList = new Set(
    items.filter((i) => !i.checked).map((i) => `${i.store_id}:${norm(i.name)}`)
  );

  const q = norm(value);
  const suggestions = products
    .filter(
      (p) =>
        storeName.has(p.store_id) &&
        !onList.has(`${p.store_id}:${norm(p.name)}`) &&
        (!q || norm(p.name).includes(q))
    )
    .sort((a, b) =>
      q ? Number(norm(b.name).startsWith(q)) - Number(norm(a.name).startsWith(q)) : 0
    )
    .slice(0, MAX_SUGGESTIONS);

  // Trgovine za nov izdelek: najprej tiste na seznamu, nato ostale.
  const storeChoices = [
    ...listStores,
    ...allStores.filter((s) => !listStores.some((ls) => ls.id === s.id)),
  ];

  const add = (storeId: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    onAdd(storeId, clean);
    setLastAdded(`${clean} → ${storeName.get(storeId) ?? ""}`);
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <Modal open={open} onClose={onClose} title="Hitro dodaj izdelek">
      <div className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Enter doda prvi predlog (najboljše ujemanje), če obstaja.
            if (q && suggestions[0]) add(suggestions[0].store_id, suggestions[0].name);
          }}
        >
          <input
            ref={inputRef}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Kaj potrebuješ? npr. Malinovec"
            enterKeyHint="done"
            className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:placeholder:text-gray-500"
          />
        </form>

        {lastAdded && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">Dodano: {lastAdded}</p>
        )}

        {suggestions.length > 0 && (
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {q ? "Predlogi" : "Pogosto kupljeno"}
            </p>
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-md border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => add(p.store_id, p.name)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    <IconPlus className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <IconStore className="h-3 w-3" />
                      {storeName.get(p.store_id)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {q && (
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Dodaj „{value.trim()}“ v
            </p>
            <div className="flex flex-wrap gap-1.5">
              {storeChoices.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(s.id, value)}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
                >
                  <IconStore className="h-3 w-3" />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
