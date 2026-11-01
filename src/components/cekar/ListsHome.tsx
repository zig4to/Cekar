"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { addItemAction, createListAction } from "@/actions/cekar";
import Button from "@/components/ui/Button";
import PromptDialog from "@/components/ui/PromptDialog";
import QuickAddDialog from "@/components/cekar/QuickAddDialog";
import WriteToListDialog from "@/components/cekar/WriteToListDialog";
import { rememberLists } from "@/lib/cekar/preview";
import { itemsLabel } from "@/lib/cekar/text";
import {
  IconBasket,
  IconBook,
  IconChevronRight,
  IconPlus,
  IconRepeat,
} from "@/components/ui/icons";
import clsx from "@/lib/utils/clsx";
import type {
  CekarCategory,
  CekarListSummary,
  CekarProduct,
  CekarStore,
} from "@/lib/types/database.types";

// Domača stran: vsi aktivni nakupovalni seznami, pod njimi stalni seznam
// (tedenski nakup, gumb "Zapiši na seznam"). Vsaka kartica ima gumb
// za hitro dodajanje izdelka, ne da bi odprl seznam.
export default function ListsHome({
  lists,
  householdName,
  stores,
  products,
  categories,
}: {
  lists: CekarListSummary[];
  householdName: string;
  stores: CekarStore[];
  products: CekarProduct[];
  categories: CekarCategory[];
}) {
  const [creating, setCreating] = useState(false);
  const [quickList, setQuickList] = useState<CekarListSummary | null>(null);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Za takojšnji pogled ob odprtju seznama / vrnitvi sem (loading.tsx).
  useEffect(() => {
    rememberLists(lists, stores, householdName, products, categories);
  }, [lists, stores, householdName, products, categories]);

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
  const template = lists.find((l) => l.isTemplate) ?? null;
  const shoppingLists = lists.filter((l) => !l.isTemplate);

  // Trgovine izbranega seznama (v vrstnem redu seznama) za QuickAddDialog.
  const storeById = new Map(stores.map((s) => [s.id, s]));
  const quickListStores = (quickListFresh?.storeIds ?? [])
    .map((id) => storeById.get(id))
    .filter((s) => s !== undefined);

  return (
    // na telefonu vsaj višina zaslona (minus zgornja vrstica in odmik), da gre
    // stalni seznam z arhivom na dno
    <div className="flex flex-col space-y-4 max-sm:min-h-[calc(100dvh-5.5rem)]">
      {/* naslov ima celo vrstico zase (brez preloma), gumb je v vrstici pod njim */}
      <div className="space-y-3">
        <h1 className="whitespace-nowrap text-xl font-semibold">Nakupovalni seznami</h1>
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm text-gray-500 dark:text-gray-400">
            {householdName}
          </p>
          <Button onClick={() => setCreating(true)} className="flex-shrink-0">
            <IconPlus />
            Nov seznam
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {shoppingLists.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center dark:border-gray-700">
          <IconBasket className="h-10 w-10 text-gray-400 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Še ni seznamov. Ustvari prvega, npr. &bdquo;Sobotni nakup&ldquo;.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 pt-2">
          {shoppingLists.map((l, i) => {
            // najnovejši seznam (razvrščeni po created_at padajoče) = aktualni nakup;
            // njegova kartica nima overflow-hidden, ker oznaka sedi na zgornjem robu
            const current = i === 0;
            return (
              <li
                key={l.id}
                className={clsx(
                  "relative flex items-stretch rounded-lg border bg-white hover:border-emerald-400 dark:bg-gray-900 dark:hover:border-emerald-700",
                  current
                    ? "border-emerald-400 ring-1 ring-emerald-400 dark:border-emerald-700 dark:ring-emerald-700"
                    : "overflow-hidden border-gray-200 dark:border-gray-800"
                )}
              >
                {current && (
                  <span className="absolute -top-2.5 left-4 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold uppercase leading-4 tracking-wide text-white shadow-sm">
                    Aktualno
                  </span>
                )}
                <Link
                  href={`/seznam/${l.id}`}
                  className={clsx(
                    "flex min-w-0 flex-1 items-center gap-3",
                    current ? "px-4 py-6" : "p-4"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    {/* naslov ima celo vrstico zase (po potrebi se prelomi), pod njim trgovine */}
                    <p className={clsx("break-words font-medium", current && "text-lg")}>{l.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm text-gray-500 dark:text-gray-400">
                        {l.storeNames.length ? l.storeNames.join(" · ") : "Brez trgovin"}
                      </p>
                    </div>
                  </div>
                  <IconChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                </Link>
                <button
                  type="button"
                  aria-label={`Hitro dodaj na ${l.name}`}
                  title="Hitro dodaj"
                  onClick={() => setQuickList(l)}
                  className="flex w-14 flex-shrink-0 items-center justify-center rounded-r-lg border-l border-gray-100 text-emerald-700 hover:bg-emerald-50 dark:border-gray-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  <IconPlus className="h-5 w-5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* stalni seznam + arhiv: na telefonu prilepljena na dno zaslona (mt-auto) */}
      <div className="space-y-4 max-sm:mt-auto">
        {template && <hr className="border-gray-300 dark:border-gray-700" />}
        {template && (
          <section className="overflow-hidden rounded-lg border border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30">
            <Link
              href={`/seznam/${template.id}`}
              className="flex items-center gap-3 px-4 pb-2 pt-4"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <IconRepeat className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{template.name}</p>
                <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                  {template.total === 0
                    ? "Dodaj izdelke, ki jih kupuješ vsak teden"
                    : `${itemsLabel(template.total)} · ${template.storeNames.join(" · ")}`}
                </p>
              </div>
              <IconChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
            </Link>
            <div className="px-4 pb-4 pt-1">
              <Button
                onClick={() => setWriting(true)}
                disabled={template.total === 0}
                className="w-full"
              >
                <IconPlus />
                Zapiši na seznam
              </Button>
            </div>
          </section>
        )}

        <Link
          href="/arhiv"
          className="flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <IconBook className="h-4 w-4" /> Arhiv nakupov
        </Link>
      </div>

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
      {template && (
        <WriteToListDialog
          open={writing}
          onClose={() => setWriting(false)}
          items={template.items}
          stores={template.storeIds.map((id) => ({ id, name: storeById.get(id)?.name ?? "" }))}
          lists={shoppingLists}
        />
      )}
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
