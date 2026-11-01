"use client";

import { useState, useTransition } from "react";
import { addStoreToListAction, createStoreAction } from "@/actions/cekar";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconStore } from "@/components/ui/icons";
import type { CekarStore } from "@/lib/types/database.types";

// Dodajanje trgovine na seznam: izbira med trgovinami gospodinjstva, ki še
// niso na seznamu, ali nova trgovina (doda se v gospodinjstvo in na seznam).
export default function AddStoreDialog({
  open,
  onClose,
  listId,
  stores,
}: {
  open: boolean;
  onClose: () => void;
  listId: string;
  stores: CekarStore[];
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const finish = (res: { error?: string }) => {
    if (res.error) {
      setError(res.error);
      return;
    }
    setName("");
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Dodaj trgovino">
      <div className="space-y-4">
        {stores.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {stores.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => finish(await addStoreToListAction(listId, s.id)))
                }
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-3 text-left text-sm font-medium hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50 dark:border-gray-700 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40"
              >
                <IconStore className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">{s.name}</span>
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            startTransition(async () => finish(await createStoreAction(name, listId)));
          }}
          className="flex gap-2"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nova trgovina, npr. Tuš"
            aria-label="Nova trgovina"
          />
          <Button type="submit" disabled={pending || !name.trim()} className="flex-shrink-0">
            Dodaj
          </Button>
        </form>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}
