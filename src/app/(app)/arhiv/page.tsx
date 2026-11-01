import { createClient } from "@/lib/supabase/server";
import { getArchivedLists } from "@/lib/data/cekar";
import ArchiveList from "@/components/cekar/ArchiveList";

// Arhiv nakupov: seznami, pri katerih je bil kliknjen "Nakup opravljen".
export default async function ArchivePage() {
  const supabase = await createClient();
  const lists = await getArchivedLists(supabase);
  return <ArchiveList lists={lists} />;
}
