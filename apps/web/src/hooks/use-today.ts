"use client";

import { useQuery } from "@tanstack/react-query";
import type { TodayResponse } from "@momentarise/shared";
import { todayResponseSchema } from "@momentarise/shared";

export function useToday() {
  return useQuery<TodayResponse>({
    queryKey: ["today"],
    queryFn: async () => {
      const res = await fetch("/api/today");
      if (!res.ok) throw new Error("Failed to fetch today");
      const data = await res.json();
      return todayResponseSchema.parse(data) as TodayResponse;
    },
  });
}
