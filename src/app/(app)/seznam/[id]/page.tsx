import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getListDetail, getMembership } from "@/lib/data/cekar";
import ListView from "@/components/cekar/ListView";

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  const membership = user ? await getMembership(supabase, user.id) : null;
  if (!membership) return null;

  const detail = await getListDetail(supabase, membership.household.id, id);
  if (!detail) notFound();
  return <ListView detail={detail} />;
}
