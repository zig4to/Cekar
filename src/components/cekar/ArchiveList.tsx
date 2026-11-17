"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { IconArrowLeft, IconChevronRight, IconRepeat } from "@/components/ui/icons";
import { moveOpenItemsToNewListAction } from "@/actions/cekar";
import StoreLogo from "@/components/cekar/StoreLogo";
import SpentButton from "@/components/cekar/SpentButton";
import ReceiptButtons from "@/components/cekar/ReceiptButtons";
import { formatEur, itemsLabel } from "@/lib/cekar/text";
import type { CekarArchivedList } from "@/lib/types/database.types";

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("sl-SI", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Ljubljana",
  });

// Seznam opravljenih nakupov (najnovejši najprej). Na kartici so trgovine
// nakupa z gumboma za znesek (€) in račun (kamera) — tudi po nakupu, brez
// odpiranja seznama. Klik na glavo odpre seznam (tam "Vrni med sezname").
export default function ArchiveList({ lists }: { lists: CekarArchivedList[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Nazaj na sezname"
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <IconArrowLeft />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold">Arhiv nakupov</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {lists.length === 0 ? "Še ni opravljenih nakupov" : `${lists.length} opravljenih nakupov`}
          </p>
        </div>
      </div>

      {lists.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Ko na seznamu klikneš „Nakup opravljen“, se seznam premakne sem.
        </p>
      ) : (
        <ul className="space-y-3">
          {lists.map((l) => (
            <ArchiveCard key={l.id} list={l} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ArchiveCard({ list: l }: { list: CekarArchivedList }) {
  const [error, setError] = useState<string | null>(null);
  const movable = l.stores.filter(
    (s) => s.open > 0 && !(s.store.single_item && s.store.unit_price !== null)
  );
  const openStores = movable.length;
  const openTotal = movable.reduce((sum, s) => sum + s.open, 0);

  return (
    <li className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <Link
        href={`/seznam/${l.id}`}
        className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="min-w-0 flex-1 break-words font-medium">{l.name}</p>
            {l.spent > 0 && (
              <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatEur(l.spent)}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {dateLabel(l.archivedAt)} · {itemsLabel(l.itemCount)}
          </p>
        </div>
        <IconChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
      </Link>
      {openStores > 1 && (
        <div className="-mt-2 px-4 pb-2">
          <MoveOpenItems
            listId={l.id}
            storeId={null}
            label={`Prenesi vse neodkljukane (${openTotal}) na nov seznam`}
            onError={setError}
          />
        </div>
      )}

      {l.stores.length > 0 && (
        <ul className="divide-y divide-gray-100 border-t border-gray-100 bg-emerald-50/40 dark:divide-gray-800 dark:border-gray-800 dark:bg-emerald-950/10">
          {l.stores.map(({ store, spent, open, receipts }) => (
            <li key={store.id} className="py-1 pl-4 pr-2">
              <div className="flex items-center gap-1">
                <StoreLogo name={store.name} />
                <span className="ml-1 min-w-0 flex-1 truncate text-sm">{store.name}</span>
                <SpentButton listId={l.id} storeId={store.id} storeName={store.name} spent={spent} />
                <ReceiptButtons
                  householdId={l.householdId}
                  listId={l.id}
                  store={store}
                  receipts={receipts}
                  onError={setError}
                />
              </div>
              {/* trgovina s ceno za kos šteje izdelek kot kupljen (znesek ob zaključku) */}
              {open > 0 && !(store.single_item && store.unit_price !== null) && (
                <div className="ml-7">
                  <MoveOpenItems
                    listId={l.id}
                    storeId={store.id}
                    label={`Prenesi neodkljukane (${open}) na nov seznam`}
                    onError={setError}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="px-4 pb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </li>
  );
}

// Neodkljukane (nekupljene) izdelke trgovine (storeId null = vseh trgovin)
// prenese na nov seznam s trgovinami vred; potrditev na mestu, nato
// preusmeritev na nov seznam.
function MoveOpenItems({
  listId,
  storeId,
  label,
  onError,
}: {
  listId: string;
  storeId: string | null;
  label: string;
  onError: (error: string | null) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={
          storeId === null
            ? // "vse" pod datumom: poln gumb z obrobo
              "my-1 flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:border-emerald-400 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-900"
            : "mb-1 flex items-center gap-1.5 rounded px-1.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-950"
        }
      >
        <IconRepeat className="h-3.5 w-3.5" /> {label}
      </button>
    );
  }

  return (
    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-gray-600 dark:text-gray-300">
        Izdelki gredo z arhiva na nov seznam.
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            onError(null);
            const res = await moveOpenItemsToNewListAction(listId, storeId);
            if (res?.error) onError(res.error);
          })
        }
        className="rounded bg-emerald-600 px-2 py-1 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Prenašam …" : "Prenesi"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        Prekliči
      </button>
    </div>
  );
}
