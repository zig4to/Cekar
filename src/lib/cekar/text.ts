// Primerjava brez velikih črk in šumnikov ("cesen" najde "Česen").
export function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export const MAX_QUANTITY = 999;

// Količina, vpisana v ime: "2 mleko", "2x mleko", "mleko x2", "mleko 2x".
// Brez količine vrne fallback (vrednost števca ob polju).
export function parseQuantity(text: string, fallback = 1) {
  const t = text.trim();
  const pre = t.match(/^(\d{1,3})\s*[x×]?\s+(.+)$/i);
  const post = t.match(/^(.+?)\s+(?:[x×](\d{1,3})|(\d{1,3})[x×])$/i);
  let name: string, qty: string;
  if (pre) [name, qty] = [pre[2], pre[1]];
  else if (post) [name, qty] = [post[1], post[2] ?? post[3]];
  else return { name: t, quantity: fallback };
  const quantity = Math.min(MAX_QUANTITY, Number(qty));
  return quantity >= 1 ? { name: name.trim(), quantity } : { name: t, quantity: fallback };
}

// "1 izdelek", "2 izdelka", "3 izdelki", "5 izdelkov" (slovenska dvojina/množina).
export function itemsLabel(n: number) {
  const r = n % 100;
  const word = r === 1 ? "izdelek" : r === 2 ? "izdelka" : r === 3 || r === 4 ? "izdelki" : "izdelkov";
  return `${n} ${word}`;
}
