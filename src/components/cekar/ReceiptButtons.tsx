"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconCamera,
  IconFile,
  IconImage,
  IconPaperclip,
  IconReceipt,
  IconX,
} from "@/components/ui/icons";
import ReceiptsDialog from "@/components/cekar/ReceiptsDialog";
import { addReceiptAction } from "@/actions/cekar";
import { uploadReceipt } from "@/lib/cekar/receipts";
import clsx from "@/lib/utils/clsx";
import type { CekarReceipt, CekarStore } from "@/lib/types/database.types";

const BTN =
  "relative rounded p-1.5 text-gray-500 hover:bg-white/70 hover:text-gray-800 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100";

// Vir računa: kamera (capture → na telefonu zadnja kamera), galerija (slike
// brez capture) ali datoteka (slika ali PDF).
const SOURCES = [
  { key: "camera", label: "Kamera", hint: "Slikaj račun", Icon: IconCamera, accept: "image/*", capture: true },
  { key: "gallery", label: "Galerija", hint: "Izberi sliko", Icon: IconImage, accept: "image/*", capture: false },
  {
    key: "file",
    label: "Datoteka",
    hint: "Slika ali PDF",
    Icon: IconFile,
    accept: "image/*,application/pdf",
    capture: false,
  },
] as const;

// V glavi trgovine: sponka (dodaj račun → celozaslonska izbira kamera /
// galerija / datoteka, shrani za to trgovino na tem seznamu) in, ko račun že
// obstaja, ikona računa s številom za ogled.
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
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [choosing, setChoosing] = useState(false);

  const onFile = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    if (!file) return;
    onError(null);
    setUploading(true);
    try {
      const path = await uploadReceipt(file, householdId, listId);
      const res = await addReceiptAction(listId, store.id, path);
      if (res.error) onError(res.error);
    } catch {
      onError("Računa ni bilo mogoče naložiti.");
    } finally {
      setUploading(false);
      input.value = "";
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
        aria-label={`Dodaj račun za ${store.name}`}
        title="Dodaj račun"
        disabled={uploading}
        onClick={() => setChoosing(true)}
        className={clsx(BTN, uploading && "animate-pulse")}
      >
        <IconPaperclip />
      </button>
      {SOURCES.map((s) => (
        <input
          key={s.key}
          ref={(el) => {
            inputs.current[s.key] = el;
          }}
          type="file"
          accept={s.accept}
          capture={s.capture ? "environment" : undefined}
          className="hidden"
          onChange={(e) => onFile(e.currentTarget)}
        />
      ))}
      <SourcePicker
        open={choosing}
        storeName={store.name}
        onClose={() => setChoosing(false)}
        onPick={(key) => {
          setChoosing(false);
          inputs.current[key]?.click();
        }}
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

// Celozaslonska izbira vira računa (velike tipke za palec).
function SourcePicker({
  open,
  storeName,
  onClose,
  onPick,
}: {
  open: boolean;
  storeName: string;
  onClose: () => void;
  onPick: (key: (typeof SOURCES)[number]["key"]) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">Dodaj račun · {storeName}</h2>
        <button
          type="button"
          aria-label="Zapri"
          onClick={onClose}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <IconX className="h-5 w-5" />
        </button>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 p-4">
        {SOURCES.map(({ key, label, hint, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onPick(key)}
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-5 text-left hover:border-emerald-400 hover:bg-emerald-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40"
          >
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <Icon className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold">{label}</span>
              <span className="block text-sm text-gray-500 dark:text-gray-400">{hint}</span>
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={onClose}
          className="mt-2 rounded-xl py-3 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Prekliči
        </button>
      </div>
    </div>,
    document.body
  );
}
