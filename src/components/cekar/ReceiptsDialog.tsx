"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { IconFile, IconTrash, IconX } from "@/components/ui/icons";
import { deleteReceiptAction } from "@/actions/cekar";
import { receiptUrls } from "@/lib/cekar/receipts";
import type { CekarReceipt } from "@/lib/types/database.types";

// Celozaslonski ogled računov ene trgovine na seznamu. Bucket je zaseben, zato
// ob odprtju dobimo začasne povezave; klik na sliko jo odpre v polni velikosti.
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    // pod celozaslonskim pogledom se stran ne premika
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  // Celozaslonski pregled: računi čez celo širino eden pod drugim (drsenje),
  // klik na sliko jo odpre v izvirni velikosti v novem zavihku.
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">
          Računi · {storeName}
          {receipts.length > 1 && (
            <span className="ml-2 text-sm font-normal text-white/60">{receipts.length}</span>
          )}
        </h2>
        <button
          type="button"
          aria-label="Zapri"
          onClick={onClose}
          className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <IconX className="h-6 w-6" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 p-3">
          {receipts.length === 0 && (
            <p className="py-10 text-center text-sm text-white/60">Ni shranjenih računov.</p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {receipts.map((r) => {
            const url = urls.get(r.path);
            return (
              <figure key={r.id} className="space-y-2">
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer" className="block">
                    {r.path.toLowerCase().endsWith(".pdf") ? (
                      <span className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-lg bg-white/5 text-white/70">
                        <IconFile className="h-14 w-14" />
                        <span className="text-sm font-semibold">PDF · odpri</span>
                      </span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- začasna povezava iz Storage
                      <img
                        src={url}
                        alt="Račun"
                        className="mx-auto max-h-[calc(100dvh-8rem)] w-full rounded-lg object-contain"
                      />
                    )}
                  </a>
                ) : (
                  <div className="h-[60dvh] animate-pulse rounded-lg bg-white/5" />
                )}
                <figcaption className="flex items-center justify-between gap-2 text-sm text-white/60">
                  {new Date(r.created_at).toLocaleString("sl-SI", {
                    day: "numeric",
                    month: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(r)}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-white/60 hover:bg-red-500/20 hover:text-red-300"
                  >
                    <IconTrash /> Izbriši
                  </button>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
