import { IconCamera } from "@/components/ui/icons";

// Opozorilo pod kartico Aktualno (ListsHome in HomePreview — enaka višina,
// da stran ob nalaganju ne skoči).
export default function ReceiptReminder() {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
      <IconCamera className="h-4 w-4 flex-shrink-0" />
      Prosimo, če slikate račune.
    </li>
  );
}
