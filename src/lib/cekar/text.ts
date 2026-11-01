// Primerjava brez velikih črk in šumnikov ("cesen" najde "Česen").
export function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
