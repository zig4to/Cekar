"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import QuantityStepper from "@/components/cekar/QuantityStepper";
import type { CekarCategory, CekarItem } from "@/lib/types/database.types";

// Urejanje izdelka na seznamu: ime, količina in kategorija (ta je na izdelku
// v katalogu, zato velja tudi za naslednja dodajanja). Shrani optimistično
// (ListView), zato se dialog zapre takoj.
export default function ItemEditDialog({
  item,
  categories,
  categoryOf,
  onClose,
  onSave,
}: {
  item: CekarItem | null;
  categories: CekarCategory[];
  categoryOf: (item: CekarItem) => string | null;
  onClose: () => void;
  onSave: (item: CekarItem, name: string, quantity: number, categoryId: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    // Ponastavi polja ob vsakem odprtju dialoga.
    /* eslint-disable react-hooks/set-state-in-effect */
    setName(item.name);
    setQuantity(item.quantity);
    setCategoryId(categoryOf(item));
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    // categoryOf se spremeni ob vsakem izrisu ListView — beremo ga samo ob odprtju
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  const submit = () => {
    if (!item) return;
    const clean = name.trim();
    if (!clean) {
      setError("Polje ne sme biti prazno.");
      return;
    }
    onSave(item, clean, quantity, categoryId);
    onClose();
  };

  return (
    <Modal open={item !== null} onClose={onClose} title="Uredi izdelek">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <Field label="Izdelek" htmlFor="item-name">
          <Input
            id="item-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Količina
          </span>
          <QuantityStepper value={quantity} onChange={setQuantity} size="lg" />
        </div>
        <Field label="Kategorija" htmlFor="item-category">
          <select
            id="item-category"
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value || null)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="">Brez kategorije (Ostalo)</option>
          </select>
        </Field>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Prekliči
          </Button>
          <Button type="submit">Shrani</Button>
        </div>
      </form>
    </Modal>
  );
}
