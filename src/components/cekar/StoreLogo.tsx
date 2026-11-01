import { norm } from "@/lib/cekar/text";
import clsx from "@/lib/utils/clsx";

// Logotipi znanih trgovin (public/logos). Trgovina se prepozna po imenu,
// zato logo dobi tudi npr. "Interspar" ali "Lidl Kranj". Za ostale trgovine
// se pokaže prva črka v zelenem kvadratku.
const LOGOS: [RegExp, string][] = [
  [/lidl/, "/logos/lidl.svg"],
  [/hofer|aldi/, "/logos/hofer.png"],
  [/mercator/, "/logos/mercator.png"],
  [/spar/, "/logos/spar.png"],
  [/\btus\b/, "/logos/tus.png"],
  [/^dm\b/, "/logos/dm.png"],
  [/muller|mueller/, "/logos/mueller.png"],
];

export function storeLogo(name: string) {
  const n = norm(name);
  return LOGOS.find(([re]) => re.test(n))?.[1] ?? null;
}

export default function StoreLogo({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const src = storeLogo(name);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- majhna statična ikona
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={clsx("flex-shrink-0 rounded-[4px] object-contain", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "flex flex-shrink-0 items-center justify-center rounded-[4px] bg-emerald-600 font-semibold leading-none text-white",
        className
      )}
      style={{ fontSize: "0.6em" }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
