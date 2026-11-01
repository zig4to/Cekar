import { ListSkeleton } from "@/components/cekar/ListPreview";

// Brez tega bi se ob kliku pokazal predogled domače strani ((app)/loading.tsx).
export default function Loading() {
  return <ListSkeleton />;
}
