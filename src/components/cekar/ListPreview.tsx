"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { IconArrowLeft, IconCheck, IconChevronDown } from "@/components/ui/icons";
import { collapsedKey } from "@/components/cekar/StoreSection";
import StoreLogo from "@/components/cekar/StoreLogo";
import QuantityBadge from "@/components/cekar/QuantityBadge";
import { cachedList, cachedStoreName } from "@/lib/cekar/preview";
import clsx from "@/lib/utils/clsx";

function isCollapsed(listId: string, storeId: string) {
  try {
    return localStorage.getItem(collapsedKey(listId, storeId)) === "1";
  } catch {
    return false;
  }
}

// Takojšnji pogled seznama med nalaganjem (loading.tsx): iz povzetka, ki ga
// je domača stran že imela, nariše glavo, trgovine in izdelke v enaki
// postavitvi kot ListView. Ko strežnik vrne sveže podatke, ga ListView
// zamenja. Brez povzetka (neposreden obisk URL-ja) pokaže okostje.
export default function ListPreview() {
  const { id } = useParams<{ id: string }>();
  const summary = cachedList(id);

  if (!summary) return <ListSkeleton />;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Nazaj na sezname"
          className="-ml-2 rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <IconArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{summary.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {summary.total === 0
              ? "Prazen seznam"
              : `${summary.checked} od ${summary.total} v košarici`}
          </p>
        </div>
        {/* prostor za meni, da se glava ob zamenjavi ne premakne */}
        <span className="h-9 w-9" />
      </div>

      {summary.total > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${(summary.checked / summary.total) * 100}%` }}
          />
        </div>
      )}

      {summary.storeIds.map((storeId) => {
        const items = summary.items.filter((i) => i.store_id === storeId);
        const sorted = [...items.filter((i) => !i.checked), ...items.filter((i) => i.checked)];
        const collapsed = isCollapsed(summary.id, storeId);
        return (
          <section
            key={storeId}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          >
            <header
              className={clsx(
                "flex items-center gap-2 bg-emerald-50/60 py-2 pl-3 pr-12 dark:bg-emerald-950/20",
                !collapsed && "border-b border-gray-100 dark:border-gray-800"
              )}
            >
              <IconChevronDown
                className={clsx(
                  "h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400",
                  collapsed && "-rotate-90"
                )}
              />
              <StoreLogo name={cachedStoreName(storeId)} />
              <h2 className="min-w-0 flex-1 truncate font-semibold">
                {cachedStoreName(storeId)}
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {items.filter((i) => i.checked).length}/{items.length}
              </span>
            </header>
            {!collapsed && (
              <>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {sorted.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 px-3 py-2.5">
                      <span
                        className={clsx(
                          "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2",
                          item.checked
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-gray-300 dark:border-gray-600"
                        )}
                      >
                        {item.checked && <IconCheck className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <span
                        className={clsx(
                          "min-w-0 break-words",
                          item.checked && "text-gray-400 line-through dark:text-gray-500"
                        )}
                      >
                        {item.name}
                      </span>
                      <QuantityBadge quantity={item.quantity} checked={item.checked} />
                    </li>
                  ))}
                </ul>
                <div className="border-t border-gray-100 p-2 dark:border-gray-800">
                  <div className="h-10 rounded-md border border-gray-200 dark:border-gray-700" />
                </div>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Bar({ className }: { className: string }) {
  return <div className={clsx("animate-pulse rounded bg-gray-200 dark:bg-gray-800", className)} />;
}

export function ListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2 py-1">
        <Bar className="h-6 w-1/2" />
        <Bar className="h-4 w-1/3" />
      </div>
      {[0, 1].map((n) => (
        <div
          key={n}
          className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
        >
          <Bar className="h-5 w-1/3" />
          <Bar className="h-4 w-3/4" />
          <Bar className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
