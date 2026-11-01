"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { addItemAction, createListAction } from "@/actions/cekar";
import Button from "@/components/ui/Button";
import PromptDialog from "@/components/ui/PromptDialog";
import QuickAddDialog from "@/components/cekar/QuickAddDialog";
import { rememberLists } from "@/lib/cekar/preview";
import { IconBasket, IconChevronRight, IconPlus } from "@/components/ui/icons";
import type {
  CekarListSummary,
  CekarProduct,
  CekarStore,
} from "@/lib/types/database.types";

// Domača stran: vsi aktivni nakupovalni seznami gospodinjstva. Vsaka kartica
// ima gumb za hitro dodajanje izdelka, ne da bi odprl seznam.
export default function ListsHome({
  lists,
  householdName,
  stores,
  products,
}: {
  lists: CekarListSummary[];
  householdName: string;
  stores: CekarStore[];
  products: CekarProduct[];
}) {
  const [creating, setCreating] = useState(false);
  const [quickList, setQuickList] = useState<CekarListSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Za takojšnji pogled ob odprtju seznama / vrnitvi sem (loading.tsx).
  useEffect(() => {
    rememberLists(lists, stores, householdName);
  }, [lists, stores, householdName]);

  const quickAdd = (storeId: string, name: string, quantity: number) => {
    const list = quickList;
    if (!list) return;
    setError(null);
    startTransition(async () => {
      const res = await addItemAction(list.id, storeId, name, quantity);
      if (res.error) setError(res.error);
    });
  };

  // Po dodajanju se seznami osvežijo (revalidatePath) — vzamemo svežo
  // različico izbranega seznama (nove trgovine, izdelki).
  const quickListFresh = quickList
    ? (lists.find((l) => l.id === quickList.id) ?? quickList)
    : null;
  // Trgovine izbranega seznama (v vrstnem redu seznama) za QuickAddDialog.
  const storeById = new Map(stores.map((s) => [s.id, s]));
  const quickListStores = (quickListFresh?.storeIds ?? [])
    .map((id) => storeById.get(id))
    .filter((s) => s !== undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Nakupovalni seznami</h1>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
            {householdName}
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="flex-shrink-0">
          <IconPlus />
          Nov seznam
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {lists.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center dark:border-gray-700">
          <IconBasket className="h-10 w-10 text-gray-400 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Še ni seznamov. Ustvari prvega, npr. &bdquo;Sobotni nakup&ldquo;.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {lists.map((l) => {
            const allDone = l.total > 0 && l.checked === l.total;
            return (
              <li
                key={l.id}
                className="flex items-stretch overflow-hidden rounded-lg border border-gray-200 bg-white hover:border-emerald-400 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-700"
              >
                <Link
                  href={`/seznam/${l.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    {/* naslov ima celo vrstico zase (po potrebi se prelomi),
                        števec je v vrstici s trgovinami pod njim */}
                    <p className="break-words font-medium">{l.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm text-gray-500 dark:text-gray-400">
                        {l.storeNames.length ? l.storeNames.join(" · ") : "Brez trgovin"}
                      </p>
                      <span
                        className={
                          allDone
                            ? "flex-shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        }
                      >
                        {l.checked}/{l.total}
                      </span>
                    </div>
                  </div>
                  <IconChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                </Link>
                <button
                  type="button"
                  aria-label={`Hitro dodaj na ${l.name}`}
                  title="Hitro dodaj"
                  onClick={() => setQuickList(l)}
                  className="flex w-14 flex-shrink-0 items-center justify-center border-l border-gray-100 text-emerald-700 hover:bg-emerald-50 dark:border-gray-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  <IconPlus className="h-5 w-5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <QuickAddDialog
        title={quickList ? `Dodaj na „${quickList.name}“` : undefined}
        open={quickList !== null}
        onClose={() => setQuickList(null)}
        listStores={quickListStores}
        allStores={stores}
        products={products}
        items={quickListFresh?.items ?? []}
        onAdd={quickAdd}
      />
      <PromptDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Nov nakupovalni seznam"
        label="Ime seznama"
        placeholder="npr. Sobotni nakup"
        submitLabel="Ustvari"
        onSubmit={createListAction}
      />
    </div>
  );
}
