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
