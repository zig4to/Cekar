import { createClient } from "@/lib/supabase/client";
import { RECEIPT_BUCKET } from "@/lib/cekar/receipt-bucket";

const MAX_SIDE = 1800; // dovolj za branje računa, ~300–600 kB

// crypto.randomUUID obstaja le na varnem izvoru (https/localhost), ne pa prek
// http://<IP> v domačem omrežju — getRandomValues je na voljo povsod.
function randomId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Slika s kamere je pogosto 3–8 MB: pomanjšamo jo na MAX_SIDE in shranimo kot
// JPEG. Če brskalnik slike ne zna dekodirati (npr. HEIC), naložimo izvirnik.
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

// Naloži sliko računa in vrne pot v bucketu (za addReceiptAction).
export async function uploadReceipt(
  file: File,
  householdId: string,
  listId: string
): Promise<string> {
  const blob = await shrink(file);
  const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "jpg");
  const path = `${householdId}/${listId}/${randomId()}.${ext.toLowerCase()}`;
  const { error } = await createClient()
    .storage.from(RECEIPT_BUCKET)
    .upload(path, blob, { contentType: blob.type || file.type, upsert: false });
  if (error) throw error;
  return path;
}

// Začasne povezave za ogled (bucket je zaseben).
export async function receiptUrls(paths: string[]): Promise<Map<string, string>> {
  if (!paths.length) return new Map();
  const { data } = await createClient()
    .storage.from(RECEIPT_BUCKET)
    .createSignedUrls(paths, 60 * 60);
  const urls = new Map<string, string>();
  for (const d of data ?? []) if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl);
  return urls;
}
