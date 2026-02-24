"use client";

import { useQuery } from "@tanstack/react-query";
import type { TimelineResponse } from "@momentarise/shared";
import { timelineResponseSchema } from "@momentarise/shared";
import { fetchWithAuth } from "@/lib/bff-client";

function todayYYYYMMDD(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function useTimeline(date?: string) {
  const queryDate = date ?? todayYYYYMMDD();
  return useQuery<TimelineResponse>({
    queryKey: ["timeline", queryDate],
    queryFn: async () => {
      const res = await fetchWithAuth(
        `/api/timeline?date=${encodeURIComponent(queryDate)}`
      );
      if (!res.ok) throw new Error("Failed to fetch timeline");
      const data = await res.json();
      return timelineResponseSchema.parse(data) as TimelineResponse;
    },
  });
}
