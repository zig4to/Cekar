"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createProductAction,
  deleteProductAction,
  renameProductAction,
  setProductCategoryAction,
} from "@/actions/cekar";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import PromptDialog from "@/components/ui/PromptDialog";
import StoreLogo from "@/components/cekar/StoreLogo";
import InlineName from "@/components/cekar/InlineName";
import { IconArrowLeft, IconPlus, IconTrash } from "@/components/ui/icons";
import { norm } from "@/lib/cekar/text";
import type { CekarCategory, CekarProduct, CekarStore } from "@/lib/types/database.types";

const ICON_BTN =
  "rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-gray-200";

// Urejanje kataloga izdelkov ene trgovine — iz njega prihajajo predlogi ob
// dodajanju. Spremembe ne vplivajo na izdelke, ki so že na seznamih.
export default function StoreProducts({
  store,
  products,
  categories,
  back,
}: {
  store: CekarStore;
  products: CekarProduct[];
  categories: CekarCategory[];
  back: string;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const run = (action: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) setError(res.error);
    });
  };

  const q = norm(query.trim());
  const shown = q ? products.filter((p) => norm(p.name).includes(q)) : products;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={back}
          aria-label="Nazaj"
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <IconArrowLeft />
        </Link>
        <StoreLogo name={store.name} className="h-6 w-6" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{store.name}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Shranjeni izdelki ({products.length}) — predlogi ob dodajanju
          </p>
        </div>
        <Button variant="secondary" className="flex-shrink-0" onClick={() => setAdding(true)}>
          <IconPlus /> Dodaj
        </Button>
      </div>

      {products.length > 0 && (
        <Input
          type="search"
          placeholder="Išči izdelek …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <section className="rounded-lg border border-gray-200 bg-white px-4 py-1 dark:border-gray-800 dark:bg-gray-900">
        {shown.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {products.length === 0
              ? "Ni še shranjenih izdelkov. Dodajo se sami, ko jih vpišeš na seznam."
              : "Ni zadetkov."}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {shown.map((p) => (
              <li key={p.id} className="py-1.5">
                <div className="flex items-center gap-1">
                  <InlineName
                    name={p.name}
                    onSave={(name) => run(() => renameProductAction(p.id, name))}
                  />
                  <select
                    aria-label={`Kategorija za ${p.name}`}
                    value={p.category_id ?? ""}
                    onChange={(e) =>
                      run(() => setProductCategoryAction(p.id, e.target.value || null))
                    }
                    className="w-28 flex-shrink-0 truncate rounded border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="">Ostalo</option>
                  </select>
                  <button
                    type="button"
                    aria-label={`Izbriši ${p.name}`}
                    className={ICON_BTN}
                    onClick={() => setConfirmId(confirmId === p.id ? null : p.id)}
                  >
                    <IconTrash />
                  </button>
                </div>
                {confirmId === p.id && (
                  <div className="mt-1.5 flex items-center justify-end gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Odstranim iz predlogov?
                    </span>
                    <Button variant="secondary" onClick={() => setConfirmId(null)}>
                      Ne
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmId(null);
                        run(() => deleteProductAction(p.id));
                      }}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                    >
                      Izbriši
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <PromptDialog
        open={adding}
        onClose={() => setAdding(false)}
        title={`Nov izdelek · ${store.name}`}
        label="Ime izdelka"
        submitLabel="Dodaj"
        onSubmit={(name) => createProductAction(store.id, name)}
      />
    </div>
  );
}
