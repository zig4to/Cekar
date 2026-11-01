"use client";

import { useRef, useState } from "react";
import { IconPlus } from "@/components/ui/icons";
import { norm } from "@/lib/cekar/text";
import type { CekarProduct } from "@/lib/types/database.types";

const MAX_SUGGESTIONS = 12;

// Vnos izdelka za eno trgovino. Med pisanjem (ali ob fokusu) se pod poljem
// pokažejo predlogi iz kataloga SAMO te trgovine — izdelki, ki so bili tu
// že kdaj dodani, najpogostejši najprej. Izdelki, ki so že neodkljukani na
// seznamu, se ne predlagajo.
export default function AddItemInput({
  storeName,
  products,
  exclude,
  onAdd,
}: {
  storeName: string;
  products: CekarProduct[]; // že razvrščeni po use_count / last_used_at
  exclude: string[];
  onAdd: (name: string) => void;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = norm(value);
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
    onAdd(clean);
    setValue("");
    // fokus ostane v polju, da lahko na telefonu dodajaš zapored
    inputRef.current?.focus();
  };

  const showSuggestions = (focused || q) && suggestions.length > 0;

  return (
    <div className="border-t border-gray-100 p-2 dark:border-gray-800">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(value);
        }}
        className="flex items-center gap-2"
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={`Dodaj v ${storeName} …`}
          enterKeyHint="done"
          className="min-w-0 flex-1 rounded-md border border-transparent bg-gray-50 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:placeholder:text-gray-500"
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
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(p.name)}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
            >
              <IconPlus className="h-3 w-3" />
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
