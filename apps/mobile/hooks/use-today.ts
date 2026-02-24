import { useQuery } from "@tanstack/react-query";
import type { TodayResponse } from "@momentarise/shared";
import { todayResponseSchema } from "@momentarise/shared";
import { apiFetch } from "@/lib/api";

export function useToday() {
  return useQuery<TodayResponse>({
    queryKey: ["today"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/today");
      if (!res.ok) throw new Error("Failed to fetch today");
      const data = await res.json();
      return todayResponseSchema.parse(data) as TodayResponse;
    },
  });
}
