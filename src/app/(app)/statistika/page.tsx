import { createClient } from "@/lib/supabase/server";
import { getSpentByMonth, monthKey } from "@/lib/data/cekar";
import Stats from "@/components/cekar/Stats";

export default async function StatsPage() {
  const supabase = await createClient();
  const months = await getSpentByMonth(supabase);
  return <Stats months={months} current={monthKey(new Date())} />;
}
