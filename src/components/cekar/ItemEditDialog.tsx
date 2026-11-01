"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import QuantityStepper from "@/components/cekar/QuantityStepper";
import type { CekarItem } from "@/lib/types/database.types";

// Urejanje izdelka na seznamu: ime in količina. Shrani optimistično
// (ListView), zato se dialog zapre takoj.
export default function ItemEditDialog({
  item,
  onClose,
  onSave,
}: {
  item: CekarItem | null;
  onClose: () => void;
  onSave: (item: CekarItem, name: string, quantity: number) => void;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    // Ponastavi polja ob vsakem odprtju dialoga.
    /* eslint-disable react-hooks/set-state-in-effect */
    setName(item.name);
    setQuantity(item.quantity);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [item]);

  const submit = () => {
    if (!item) return;
    const clean = name.trim();
    if (!clean) {
      setError("Polje ne sme biti prazno.");
      return;
    }
    onSave(item, clean, quantity);
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
