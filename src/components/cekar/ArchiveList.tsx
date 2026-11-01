import Link from "next/link";
import { IconArrowLeft, IconChevronRight } from "@/components/ui/icons";
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

// Seznam opravljenih nakupov (najnovejši najprej). Klik odpre seznam, kjer
// ga lahko tudi vrneš med aktualne.
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
        <ul className="space-y-2">
          {lists.map((l) => (
            <li key={l.id}>
              <Link
                href={`/seznam/${l.id}`}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-emerald-400 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-700"
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
                  {l.storeNames.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                      {l.storeNames.join(" · ")}
                    </p>
                  )}
                </div>
                <IconChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
