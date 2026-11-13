import { IconCamera } from "@/components/ui/icons";

// Opozorilo pod kartico Aktualno (ListsHome in HomePreview — enaka višina,
// da stran ob nalaganju ne skoči).
export default function ReceiptReminder() {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-sm text-pink-800 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-300">
      <IconCamera className="h-4 w-4 flex-shrink-0" />
      Prosimo, če slikate račune.
    </li>
  );
}
