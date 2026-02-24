import { useQuery } from "@tanstack/react-query";
import type { TimelineResponse } from "@momentarise/shared";
import { timelineResponseSchema } from "@momentarise/shared";
import { apiFetch } from "@/lib/api";

function todayYYYYMMDD(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useTimeline(date?: string) {
  const queryDate = date ?? todayYYYYMMDD();
  return useQuery<TimelineResponse>({
    queryKey: ["timeline", queryDate],
    queryFn: async () => {
      const res = await apiFetch(
        `/api/v1/timeline?date=${encodeURIComponent(queryDate)}`
      );
      if (!res.ok) throw new Error("Failed to fetch timeline");
      const data = await res.json();
      return timelineResponseSchema.parse(data) as TimelineResponse;
    },
  });
}
