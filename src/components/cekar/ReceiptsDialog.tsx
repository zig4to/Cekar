"use client";

import { useEffect, useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import { IconTrash } from "@/components/ui/icons";
import { deleteReceiptAction } from "@/actions/cekar";
import { receiptUrls } from "@/lib/cekar/receipts";
import type { CekarReceipt } from "@/lib/types/database.types";

// Ogled slik računov ene trgovine na seznamu. Bucket je zaseben, zato ob
// odprtju dobimo začasne povezave; klik na sliko jo odpre v polni velikosti.
export default function ReceiptsDialog({
  open,
  onClose,
  storeName,
  receipts,
}: {
  open: boolean;
  onClose: () => void;
  storeName: string;
  receipts: CekarReceipt[];
}) {
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const paths = receipts.map((r) => r.path).join("|");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    receiptUrls(paths ? paths.split("|") : []).then((m) => {
      if (!cancelled) setUrls(m);
    });
    return () => {
      cancelled = true;
    };
  }, [open, paths]);

  const remove = (receipt: CekarReceipt) => {
    if (!window.confirm("Izbrišem ta račun?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteReceiptAction(receipt.id);
      if (res.error) setError(res.error);
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Računi · ${storeName}`}>
      <div className="space-y-3">
        {receipts.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Ni shranjenih računov.</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {receipts.map((r) => {
            const url = urls.get(r.path);
            return (
              <figure
                key={r.id}
                className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700"
              >
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- začasna povezava iz Storage */}
                    <img src={url} alt="Račun" className="h-40 w-full bg-gray-50 object-cover dark:bg-gray-800" />
                  </a>
                ) : (
                  <div className="h-40 animate-pulse bg-gray-100 dark:bg-gray-800" />
                )}
                <figcaption className="flex items-center justify-between gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(r.created_at).toLocaleString("sl-SI", {
                    day: "numeric",
                    month: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  <button
                    type="button"
                    aria-label="Izbriši račun"
                    disabled={pending}
                    onClick={() => remove(r)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                  >
                    <IconTrash />
                  </button>
                </figcaption>
              </figure>
            );
          })}
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}
