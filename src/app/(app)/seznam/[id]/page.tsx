import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getListDetail } from "@/lib/data/cekar";
import ListView from "@/components/cekar/ListView";

// Članstvo preveri layout (nečlan vidi Onboarding), RLS pa seznam drugega
// gospodinjstva skrije — zato tu samo en krog poizvedb.
export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const detail = await getListDetail(supabase, id);
  if (!detail) notFound();
  return <ListView detail={detail} />;
}
