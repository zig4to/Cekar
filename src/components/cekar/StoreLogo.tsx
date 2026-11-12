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
  [/merkur/, "/logos/merkur.png"],
  [/sloga/, "/logos/sloga.png"],
  [/lekarn/, "/logos/lekarna.svg"],
  [/mlekar/, "/logos/mlekarica.svg"],
  [/jajc/, "/logos/domaca-jajca.svg"],
  [/\bmeso\b|mesnic/, "/logos/domace-meso.svg"],
  [/sanolabor/, "/logos/sanolabor.svg"],
];

// Barve trgovin (iz logotipov) — obroba polja za vnos izdelka. Svetle dovolj,
// da se vidijo na beli in temni podlagi. Neznana trgovina → null (zelena).
const COLORS: [RegExp, string][] = [
  [/lidl/, "#f5d000"], // rumena
  [/hofer|aldi/, "#2f8fd8"], // modra (proge v logotipu)
  [/mercator/, "#e30613"], // rdeča
  [/spar/, "#00843d"], // zelena (jelka)
  [/\btus\b/, "#f2c200"], // rumena zvezda
  [/^dm\b/, "#2d4fa3"], // temno modra
  [/muller|mueller/, "#f18700"], // oranžna
  [/merkur/, "#2e7d32"], // zelena črka M
  [/sloga/, "#8b5a2b"], // rjava njiva
  [/lekarn/, "#16a34a"], // zelen križ
  [/mlekar/, "#38bdf8"], // svetlo modra (mleko, nebo)
  [/jajc/, "#d97706"], // jantarna
  [/\bmeso\b|mesnic/, "#c2410c"], // rdečerjava
  [/sanolabor/, "#b3127f"], // magenta
];

export function storeColor(name: string) {
  const n = norm(name);
  return COLORS.find(([re]) => re.test(n))?.[1] ?? null;
}

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
