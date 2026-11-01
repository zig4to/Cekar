"use client";

import { useRef, useState } from "react";
import { IconPlus } from "@/components/ui/icons";
import { norm, parseQuantity } from "@/lib/cekar/text";
import QuantityStepper from "@/components/cekar/QuantityStepper";
import type { CekarProduct } from "@/lib/types/database.types";

const MAX_SUGGESTIONS = 8;

// Vnos izdelka za eno trgovino. Šele med pisanjem se pod poljem
// pokažejo predlogi iz kataloga SAMO te trgovine — izdelki, ki so bili tu
// že kdaj dodani, najpogostejši najprej. Izdelki, ki so že neodkljukani na
// seznamu, se ne predlagajo. Količino nastaviš s števcem ob polju ali jo
// vpišeš v ime ("2 mleko", "mleko x2").
export default function AddItemInput({
  storeName,
  products,
  exclude,
  onAdd,
}: {
  storeName: string;
  products: CekarProduct[]; // že razvrščeni po use_count / last_used_at
  exclude: string[];
  onAdd: (name: string, quantity: number) => void;
}) {
  const [value, setValue] = useState("");
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  // predlogi iščejo po imenu brez vpisane količine ("2 mle" najde "Mleko")
  const parsed = parseQuantity(value, quantity);
  const q = norm(parsed.name);
  const excluded = new Set(exclude.map(norm));
  const suggestions = products
    .filter((p) => !excluded.has(norm(p.name)) && (!q || norm(p.name).includes(q)))
    // ujemanje na začetku imena pred ujemanjem v sredini (sort je stabilen,
    // znotraj skupine ostane vrstni red po pogostosti)
    .sort((a, b) =>
      q ? Number(norm(b.name).startsWith(q)) - Number(norm(a.name).startsWith(q)) : 0
    )
    .slice(0, MAX_SUGGESTIONS);

  const add = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    onAdd(clean, parsed.quantity);
    setValue("");
    setQuantity(1);
    // fokus ostane v polju, da lahko na telefonu dodajaš zapored
    inputRef.current?.focus();
  };

  // predlogi samo med pisanjem (prazno polje = brez predlogov)
  const showSuggestions = q !== "" && suggestions.length > 0;

  return (
    <div className="border-t border-gray-100 p-2 dark:border-gray-800">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(parsed.name);
        }}
        className="flex items-center gap-2"
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Dodaj v ${storeName} …`}
          enterKeyHint="done"
          className="min-w-0 flex-1 rounded-md border border-transparent bg-gray-50 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:placeholder:text-gray-500"
        />
        <QuantityStepper
          value={parsed.quantity}
          onChange={(n) => {
            // količina, vpisana v ime, se ob kliku prenese v števec
            if (parsed.name !== value.trim()) setValue(parsed.name);
            setQuantity(n);
          }}
        />
        <button
          type="submit"
          aria-label="Dodaj"
          disabled={!value.trim()}
          // preventDefault: klik ne vzame fokusa polju (tipkovnica ostane odprta)
          onMouseDown={(e) => e.preventDefault()}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
        >
          <IconPlus className="h-5 w-5" />
        </button>
      </form>

      {showSuggestions && (
        // seznam ujemanj pod poljem — klik na vrstico doda izdelek
        <ul className="mt-2 divide-y divide-gray-100 overflow-hidden rounded-md border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
          {suggestions.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(p.name)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <IconPlus className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
