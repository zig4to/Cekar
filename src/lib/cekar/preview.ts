import type {
  CekarCategory,
  CekarListSummary,
  CekarProduct,
  CekarStore,
} from "@/lib/types/database.types";

// Predpomnilnik v pomnilniku brskalnika (živi do osvežitve strani): zadnji
// znani povzetki seznamov. loading.tsx iz njih takoj nariše seznam (ime,
// trgovine, izdelki), medtem ko strežnik nalaga sveže podatke — klik na
// seznam se tako odpre brez čakanja.
let lists: CekarListSummary[] = [];
let storeNames = new Map<string, string>();
let householdName = "";
// Trgovine z enim izdelkom (Mlekarica …) se v predogledu narišejo kot ena vrstica.
let singleStores = new Set<string>();
// Za razvrstitev po kategorijah v takojšnjem pogledu.
let catalog: CekarProduct[] = [];
let categories: CekarCategory[] = [];

export function rememberLists(
  next: CekarListSummary[],
  stores: Pick<CekarStore, "id" | "name" | "single_item">[],
  household: string,
  products: CekarProduct[],
  cats: CekarCategory[]
) {
  lists = next;
  householdName = household;
  catalog = products;
  categories = cats;
  storeNames = new Map(stores.map((s) => [s.id, s.name]));
  singleStores = new Set(stores.filter((s) => s.single_item).map((s) => s.id));
}

// Po obisku seznama posodobi njegov povzetek (npr. na novo dodani izdelki).
export function rememberList(
  summary: CekarListSummary,
  stores: Pick<CekarStore, "id" | "name" | "single_item">[],
  products: CekarProduct[],
  cats: CekarCategory[]
) {
  catalog = products;
  categories = cats;
  for (const s of stores) {
    storeNames.set(s.id, s.name);
    if (s.single_item) singleStores.add(s.id);
    else singleStores.delete(s.id);
  }
  const i = lists.findIndex((l) => l.id === summary.id);
  if (i >= 0) lists = lists.map((l, j) => (j === i ? summary : l));
  else lists = [summary, ...lists];
}

export function cachedLists() {
  return lists;
}

export function cachedList(id: string) {
  return lists.find((l) => l.id === id) ?? null;
}

export function cachedStoreName(id: string) {
  return storeNames.get(id) ?? "";
}

export function cachedHouseholdName() {
  return householdName;
}

export function cachedCatalog() {
  return { products: catalog, categories };
}

export function isCachedSingleStore(id: string) {
  return singleStores.has(id);
}
