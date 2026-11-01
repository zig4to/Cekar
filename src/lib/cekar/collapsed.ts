// Zložene trgovine na seznamu so shranjene v piškotku (en na seznam), ne v
// localStorage: strežnik ga prebere in stran ob osvežitvi takoj nariše s
// pravilno zloženimi trgovinami — brez utripa "odpri → zapri".

export const collapsedCookie = (listId: string) => `cekar-zlozeno-${listId}`;

export function parseCollapsed(value: string | undefined): string[] {
  return value ? value.split(".").filter(Boolean) : [];
}

// Samo v brskalniku.
export function readCollapsed(listId: string): string[] {
  const name = `${collapsedCookie(listId)}=`;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(name));
  return parseCollapsed(hit?.slice(name.length));
}

export function setCollapsed(listId: string, storeId: string, collapsed: boolean) {
  const ids = new Set(readCollapsed(listId));
  if (collapsed) ids.add(storeId);
  else ids.delete(storeId);
  const name = collapsedCookie(listId);
  document.cookie = ids.size
    ? `${name}=${[...ids].join(".")}; path=/; max-age=31536000; samesite=lax`
    : `${name}=; path=/; max-age=0`;
}

// Trgovine s skritimi kategorijami (oko v glavi trgovine). Velja za trgovino
// na vseh seznamih, zato en piškotek za vse; tudi tega bere strežnik.
export const NO_CATEGORIES_COOKIE = "cekar-brez-kategorij";

// Samo v brskalniku.
export function readNoCategories(): string[] {
  const name = `${NO_CATEGORIES_COOKIE}=`;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(name));
  return parseCollapsed(hit?.slice(name.length));
}

export function setNoCategories(storeId: string, hidden: boolean) {
  const ids = new Set(readNoCategories());
  if (hidden) ids.add(storeId);
  else ids.delete(storeId);
  document.cookie = ids.size
    ? `${NO_CATEGORIES_COOKIE}=${[...ids].join(".")}; path=/; max-age=31536000; samesite=lax`
    : `${NO_CATEGORIES_COOKIE}=; path=/; max-age=0`;
}
