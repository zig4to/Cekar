import { createClient } from "@/lib/supabase/server";
import { getSpentByPeriod, monthKey, weekKey } from "@/lib/data/cekar";
import Stats from "@/components/cekar/Stats";

export default async function StatsPage() {
  const supabase = await createClient();
  const { months, weeks } = await getSpentByPeriod(supabase);
  const now = new Date();
  return (
    <Stats
      months={months}
      weeks={weeks}
      currentMonth={monthKey(now)}
      currentWeek={weekKey(now)}
    />
  );
}
