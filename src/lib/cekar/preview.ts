import type {
  CekarCategory,
  CekarListSummary,
  CekarProduct,
} from "@/lib/types/database.types";

// Predpomnilnik v pomnilniku brskalnika (živi do osvežitve strani): zadnji
// znani povzetki seznamov. loading.tsx iz njih takoj nariše seznam (ime,
// trgovine, izdelki), medtem ko strežnik nalaga sveže podatke — klik na
// seznam se tako odpre brez čakanja.
let lists: CekarListSummary[] = [];
let storeNames = new Map<string, string>();
let householdName = "";
// Za razvrstitev po kategorijah v takojšnjem pogledu.
let catalog: CekarProduct[] = [];
let categories: CekarCategory[] = [];

export function rememberLists(
  next: CekarListSummary[],
  stores: { id: string; name: string }[],
  household: string,
  products: CekarProduct[],
  cats: CekarCategory[]
) {
  lists = next;
  householdName = household;
  catalog = products;
  categories = cats;
  storeNames = new Map(stores.map((s) => [s.id, s.name]));
}

// Po obisku seznama posodobi njegov povzetek (npr. na novo dodani izdelki).
export function rememberList(
  summary: CekarListSummary,
  stores: { id: string; name: string }[],
  products: CekarProduct[],
  cats: CekarCategory[]
) {
  catalog = products;
  categories = cats;
  for (const s of stores) storeNames.set(s.id, s.name);
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
