import { norm } from "@/lib/cekar/text";
import type { CekarCategory, CekarProduct } from "@/lib/types/database.types";

// Kategorija po imenu izdelka: ključne besede kategorij so začetki besed brez
// šumnikov ("mlek" → "Domače mleko"); zmaga najdaljša ujemajoča (ista
// logika kot backfill v 0006_categories.sql, zato "Malinovec" → Pijače, ne
// Sadje po "malin").
export function guessCategory(
  name: string,
  categories: Pick<CekarCategory, "id" | "keywords">[]
): string | null {
  const text = ` ${norm(name)}`;
  let best: { id: string; len: number } | null = null;
  for (const c of categories) {
    for (const kw of c.keywords) {
      if (kw.length > (best?.len ?? 0) && text.includes(` ${kw}`)) {
        best = { id: c.id, len: kw.length };
      }
    }
  }
  return best?.id ?? null;
}

type ItemRef = { store_id: string; product_id: string | null; name: string };

// Kategorija vrstice na seznamu: iz kataloga (product_id), sicer po imenu v
// isti trgovini, sicer ugibanje — tako pade tudi optimistično dodan izdelek
// (temp-, še brez product_id) takoj v pravo skupino.
export function makeCategoryOf(
  products: Pick<CekarProduct, "id" | "store_id" | "name" | "category_id">[],
  categories: Pick<CekarCategory, "id" | "keywords">[]
) {
  const byId = new Map(products.map((p) => [p.id, p.category_id]));
  const byName = new Map(products.map((p) => [`${p.store_id}:${norm(p.name)}`, p.category_id]));
  const known = new Set(categories.map((c) => c.id));
  return (item: ItemRef): string | null => {
    const fromCatalog =
      (item.product_id ? byId.get(item.product_id) : undefined) ??
      byName.get(`${item.store_id}:${norm(item.name)}`);
    if (fromCatalog !== undefined) return fromCatalog && known.has(fromCatalog) ? fromCatalog : null;
    return guessCategory(item.name, categories);
  };
}

// Neodkljukani izdelki v skupinah po vrstnem redu kategorij; brez kategorije
// ("Ostalo") na koncu. Vrstni red znotraj skupine ostane kot v vhodu.
export function groupByCategory<T extends ItemRef>(
  items: T[],
  categoryOf: (item: T) => string | null,
  categories: Pick<CekarCategory, "id" | "name">[]
): { id: string | null; name: string; items: T[] }[] {
  const groups = new Map<string | null, T[]>();
  for (const item of items) {
    const id = categoryOf(item);
    groups.set(id, [...(groups.get(id) ?? []), item]);
  }
  const ordered = categories
    .filter((c) => groups.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, items: groups.get(c.id)! }));
  const rest = groups.get(null);
  return rest ? [...ordered, { id: null, name: "Ostalo", items: rest }] : ordered;
}
