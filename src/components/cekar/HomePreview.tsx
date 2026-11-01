"use client";

import { usePathname } from "next/navigation";
import { IconChevronRight, IconPlus, IconRepeat } from "@/components/ui/icons";
import { itemsLabel } from "@/lib/cekar/text";
import { ListSkeleton } from "@/components/cekar/ListPreview";
import { cachedHouseholdName, cachedLists } from "@/lib/cekar/preview";

// Takojšnji pogled domače strani med nalaganjem: zadnji znani seznami v
// enaki postavitvi kot ListsHome (brez interakcije, dokler ne pride
// ListsHome). Drugje (nastavitve) ali brez predpomnilnika — okostje.
export default function HomePreview() {
  const pathname = usePathname();
  const all = cachedLists();
  if (pathname !== "/" || all.length === 0) return <ListSkeleton />;
  const template = all.find((l) => l.isTemplate);
  const lists = all.filter((l) => !l.isTemplate);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="whitespace-nowrap text-xl font-semibold">Nakupovalni seznami</h1>
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm text-gray-500 dark:text-gray-400">
            {cachedHouseholdName()}
          </p>
          <span className="inline-flex h-9 flex-shrink-0 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white opacity-80">
            <IconPlus />
            Nov seznam
          </span>
        </div>
      </div>
      <ul className="space-y-2">
        {lists.map((l) => (
          <li
            key={l.id}
            className="flex items-stretch overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{l.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm text-gray-500 dark:text-gray-400">
                    {l.storeNames.length ? l.storeNames.join(" · ") : "Brez trgovin"}
                  </p>
                  <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {l.checked}/{l.total}
                  </span>
                </div>
              </div>
              <IconChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
            </div>
            <span className="flex w-14 flex-shrink-0 items-center justify-center border-l border-gray-100 text-emerald-700 dark:border-gray-800 dark:text-emerald-400">
              <IconPlus className="h-5 w-5" />
            </span>
          </li>
        ))}
      </ul>
      {template && <hr className="border-gray-300 dark:border-gray-700" />}
      {template && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3 px-4 pb-2 pt-4">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <IconRepeat className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium">{template.name}</p>
              <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                {itemsLabel(template.total)}
              </p>
            </div>
          </div>
          <div className="px-4 pb-4 pt-1">
            <div className="h-9 rounded-md bg-emerald-600 opacity-80" />
          </div>
        </div>
      )}
    </div>
  );
}
