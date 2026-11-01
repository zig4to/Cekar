"use client";

import { useState } from "react";
import Link from "next/link";
import { createListAction } from "@/actions/cekar";
import Button from "@/components/ui/Button";
import PromptDialog from "@/components/ui/PromptDialog";
import { IconBasket, IconChevronRight, IconPlus } from "@/components/ui/icons";
import type { CekarListSummary } from "@/lib/types/database.types";

// Domača stran: vsi aktivni nakupovalni seznami gospodinjstva.
export default function ListsHome({
  lists,
  householdName,
}: {
  lists: CekarListSummary[];
  householdName: string;
}) {
  const [creating, setCreating] = useState(false);

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
              <li key={l.id}>
                <Link
                  href={`/seznam/${l.id}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-emerald-400 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-700"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.name}</p>
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                      {l.storeNames.length ? l.storeNames.join(" · ") : "Brez trgovin"}
                    </p>
                  </div>
                  <span
                    className={
                      allDone
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    }
                  >
                    {l.checked}/{l.total}
                  </span>
                  <IconChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              </li>
            );
          })}
        </ul>
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
