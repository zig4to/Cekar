"use client";

import { useRef, useState } from "react";
import { IconCamera, IconReceipt } from "@/components/ui/icons";
import ReceiptsDialog from "@/components/cekar/ReceiptsDialog";
import { addReceiptAction } from "@/actions/cekar";
import { uploadReceipt } from "@/lib/cekar/receipts";
import clsx from "@/lib/utils/clsx";
import type { CekarReceipt, CekarStore } from "@/lib/types/database.types";

const BTN =
  "relative rounded p-1.5 text-gray-500 hover:bg-white/70 hover:text-gray-800 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100";

// V glavi trgovine: kamera (slikaj račun → shrani za to trgovino na tem
// seznamu) in, ko račun že obstaja, ikona računa s številom za ogled.
// capture="environment" na telefonu odpre zadnjo kamero, na računalniku izbiro
// datoteke.
export default function ReceiptButtons({
  householdId,
  listId,
  store,
  receipts,
  onError,
}: {
  householdId: string;
  listId: string;
  store: CekarStore;
  receipts: CekarReceipt[];
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    onError(null);
    setUploading(true);
    try {
      const path = await uploadReceipt(file, householdId, listId);
      const res = await addReceiptAction(listId, store.id, path);
      if (res.error) onError(res.error);
    } catch {
      onError("Slike računa ni bilo mogoče naložiti.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      {receipts.length > 0 && (
        <button
          type="button"
          aria-label={`Računi za ${store.name} (${receipts.length})`}
          title="Računi"
          onClick={() => setViewing(true)}
          className={clsx(BTN, "text-emerald-700 dark:text-emerald-400")}
        >
          <IconReceipt />
          {receipts.length > 1 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-600 px-0.5 text-[9px] font-semibold leading-none text-white">
              {receipts.length}
            </span>
          )}
        </button>
      )}
      <button
        type="button"
        aria-label={`Slikaj račun za ${store.name}`}
        title="Slikaj račun"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={clsx(BTN, uploading && "animate-pulse")}
      >
        <IconCamera />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <ReceiptsDialog
        open={viewing}
        onClose={() => setViewing(false)}
        storeName={store.name}
        receipts={receipts}
      />
    </>
  );
}
