"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  addProductStoreAction,
  createCatalogProductAction,
  deleteCatalogRowsAction,
  renameCatalogProductAction,
  setCatalogCategoryAction,
} from "@/actions/cekar";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import InlineName from "@/components/cekar/InlineName";
import StoreLogo from "@/components/cekar/StoreLogo";
import { IconArrowLeft, IconChevronDown, IconPlus, IconTrash } from "@/components/ui/icons";
import { norm } from "@/lib/cekar/text";
import clsx from "@/lib/utils/clsx";
import type { CekarCategory, CekarProduct, CekarStore } from "@/lib/types/database.types";

// En izdelek iz kataloga z vsemi trgovinami, kjer ga dobiš. V bazi je to ena
// vrstica cekar_products na trgovino z istim imenom (zato ga predlogi ob
// dodajanju v vsako od teh trgovin najdejo sami).
type CatalogProduct = {
  key: string; // lower(name) — enako kot unikatni indeks v bazi
  name: string;
  categoryId: string | null;
  rows: Map<string, string>; // store_id → id vrstice
};

function groupProducts(products: CekarProduct[]): CatalogProduct[] {
  const map = new Map<string, CatalogProduct>();
  // products so razvrščeni po use_count — ime in kategorija pridejo od
  // najpogosteje uporabljene vrstice
  for (const p of products) {
    const key = p.name.trim().toLowerCase();
    let g = map.get(key);
    if (!g) {
      g = { key, name: p.name, categoryId: p.category_id, rows: new Map() };
      map.set(key, g);
    }
    g.rows.set(p.store_id, p.id);
  }
  return [...map.values()].sort((a, b) => norm(a.name).localeCompare(norm(b.name), "sl"));
}

const CHIP =
  "flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors";
const CHIP_ON =
  "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200";
const CHIP_OFF =
  "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300";

export default function ProductsCatalog({
  products,
  stores,
  categories,
}: {
  products: CekarProduct[];
  stores: CekarStore[];
  categories: CekarCategory[];
}) {
  const catalog = useMemo(() => groupProducts(products), [products]);
  const [query, setQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) setError(res.error);
    });
  };

  const q = norm(query.trim());
  const shown = catalog.filter(
    (p) => (!q || norm(p.name).includes(q)) && (!storeFilter || p.rows.has(storeFilter))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Nazaj na seznam"
          className="flex-shrink-0 rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <IconArrowLeft />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold">Izdelki</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {catalog.length} izdelkov · klikni izdelek in izberi, v katerih trgovinah ga dobiš
          </p>
        </div>
        <Button className="flex-shrink-0" onClick={() => setAdding(true)}>
          <IconPlus /> Dodaj
        </Button>
      </div>

      <Input
        type="search"
        placeholder="Išči izdelek …"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* filter po trgovini — telefon: drsenje vstran, računalnik: prelom v več vrstic */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <button
          type="button"
          onClick={() => setStoreFilter(null)}
          className={clsx(CHIP, storeFilter === null ? CHIP_ON : CHIP_OFF)}
        >
          Vse
        </button>
        {stores.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStoreFilter(storeFilter === s.id ? null : s.id)}
            className={clsx(CHIP, storeFilter === s.id ? CHIP_ON : CHIP_OFF)}
          >
            <StoreLogo name={s.name} className="h-4 w-4" />
            {s.name}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <section
        className={clsx(
          "rounded-lg border border-gray-200 bg-white px-3 py-1 dark:border-gray-800 dark:bg-gray-900",
          pending && "opacity-80"
        )}
      >
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {catalog.length === 0 ? "Ni še izdelkov." : "Ni zadetkov."}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {shown.map((p) => (
              <ProductRow
                key={p.key}
                product={p}
                stores={stores}
                categories={categories}
                open={expanded === p.key}
                onToggleOpen={() => setExpanded(expanded === p.key ? null : p.key)}
                run={run}
              />
            ))}
          </ul>
        )}
      </section>

      <AddProductDialog
        open={adding}
        onClose={() => setAdding(false)}
        stores={stores}
        initialStoreId={storeFilter}
      />
    </div>
  );
}

function ProductRow({
  product: p,
  stores,
  categories,
  open,
  onToggleOpen,
  run,
}: {
  product: CatalogProduct;
  stores: CekarStore[];
  categories: CekarCategory[];
  open: boolean;
  onToggleOpen: () => void;
  run: (action: () => Promise<{ error?: string }>) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ids = [...p.rows.values()];
  const own = stores.filter((s) => p.rows.has(s.id));

  return (
    <li className="py-1.5">
      <div className="flex items-center gap-1">
        <InlineName
          name={p.name}
          onSave={(name) => run(() => renameCatalogProductAction(ids, name))}
        />
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          aria-label={`Trgovine za ${p.name}`}
          className="flex flex-shrink-0 items-center gap-1 rounded px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <span className="flex -space-x-1">
            {own.slice(0, 4).map((s) => (
              <span key={s.id} title={s.name} className="rounded ring-2 ring-white dark:ring-gray-900">
                <StoreLogo name={s.name} className="h-5 w-5" />
              </span>
            ))}
          </span>
          {own.length > 4 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">+{own.length - 4}</span>
          )}
          <IconChevronDown
            className={clsx("h-4 w-4 text-gray-400 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && (
        <div className="space-y-3 pb-2 pl-1 pt-2">
          <div>
            <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">Kje ga dobiš:</p>
            <div className="flex flex-wrap gap-1.5">
              {stores.map((s) => {
                const rowId = p.rows.get(s.id);
                const last = rowId !== undefined && p.rows.size === 1;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={last}
                    title={last ? "Zadnja trgovina — izdelek izbriši s košem" : undefined}
                    onClick={() =>
                      run(() =>
                        rowId
                          ? deleteCatalogRowsAction([rowId])
                          : addProductStoreAction(p.name, s.id, p.categoryId)
                      )
                    }
                    className={clsx(CHIP, rowId ? CHIP_ON : CHIP_OFF, last && "cursor-default")}
                  >
                    <StoreLogo name={s.name} className="h-4 w-4" />
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label={`Kategorija za ${p.name}`}
              value={p.categoryId ?? ""}
              onChange={(e) => run(() => setCatalogCategoryAction(ids, e.target.value || null))}
              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="">Ostalo (brez kategorije)</option>
            </select>
            {confirmDelete ? (
              <>
                <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                  Ne
                </Button>
                <button
                  type="button"
                  onClick={() => run(() => deleteCatalogRowsAction(ids))}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                >
                  Izbriši izdelek
                </button>
              </>
            ) : (
              <button
                type="button"
                aria-label={`Izbriši ${p.name}`}
                onClick={() => setConfirmDelete(true)}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
              >
                <IconTrash />
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function AddProductDialog({
  open,
  onClose,
  stores,
  initialStoreId,
}: {
  open: boolean;
  onClose: () => void;
  stores: CekarStore[];
  initialStoreId: string | null;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [wasOpen, setWasOpen] = useState(open);

  // ob vsakem odprtju prazno polje; izbrana je trgovina iz filtra
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setSelected(initialStoreId ? [initialStoreId] : []);
      setError(null);
    }
  }

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = () => {
    if (!name.trim()) return setError("Vpiši ime izdelka.");
    if (selected.length === 0) return setError("Izberi vsaj eno trgovino.");
    startTransition(async () => {
      const res = await createCatalogProductAction(name, selected);
      if (res.error) setError(res.error);
      else onClose();
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Nov izdelek">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <Field label="Ime izdelka" htmlFor="catalog-name">
          <Input
            id="catalog-name"
            autoFocus
            placeholder="npr. Pršut"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">Kje ga dobiš</p>
          <div className="flex flex-wrap gap-1.5">
            {stores.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                className={clsx(CHIP, selected.includes(s.id) ? CHIP_ON : CHIP_OFF)}
              >
                <StoreLogo name={s.name} className="h-4 w-4" />
                {s.name}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Prekliči
          </Button>
          <Button type="submit" disabled={pending}>
            Dodaj
          </Button>
        </div>
      </form>
    </Modal>
  );
}
