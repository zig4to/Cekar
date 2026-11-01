"use client";

import { useState } from "react";
import Link from "next/link";
import { IconArrowLeft, IconChevronRight } from "@/components/ui/icons";
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

      {l.stores.length > 0 && (
        <ul className="divide-y divide-gray-100 border-t border-gray-100 bg-emerald-50/40 dark:divide-gray-800 dark:border-gray-800 dark:bg-emerald-950/10">
          {l.stores.map(({ store, spent, receipts }) => (
            <li key={store.id} className="flex items-center gap-1 py-1 pl-4 pr-2">
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
            </li>
          ))}
        </ul>
      )}
      {error && <p className="px-4 pb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </li>
  );
}
