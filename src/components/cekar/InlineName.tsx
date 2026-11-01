"use client";

import { useState } from "react";

// Ime, ki se ob kliku spremeni v vnosno polje (telefon in računalnik).
// Enter ali klik drugam shrani, Esc prekliče; nespremenjeno/prazno ne shrani.
export default function InlineName({
  name,
  onSave,
}: {
  name: string;
  onSave: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  const finish = (save: boolean) => {
    setEditing(false);
    const clean = value.trim();
    if (save && clean && clean !== name) onSave(clean);
  };

  if (!editing) {
    return (
      <button
        type="button"
        title="Klikni za urejanje"
        onClick={() => {
          setValue(name);
          setEditing(true);
        }}
        className="min-w-0 flex-1 truncate rounded px-1 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {name}
      </button>
    );
  }

  return (
    <input
      autoFocus
      aria-label="Ime izdelka"
      value={value}
      enterKeyHint="done"
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setValue(name);
          setEditing(false);
        }
      }}
      className="min-w-0 flex-1 rounded border border-emerald-500 bg-white px-1 py-1 text-base outline-none ring-1 ring-emerald-500 sm:text-sm dark:bg-gray-800"
    />
  );
}
