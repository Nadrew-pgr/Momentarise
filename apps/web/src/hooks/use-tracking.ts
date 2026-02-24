"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/bff-client";

export function useTracking() {
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetchWithAuth(`/api/events/${eventId}/start`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to start tracking");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetchWithAuth(`/api/events/${eventId}/stop`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to stop tracking");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });

  return {
    startTracking: startMutation.mutateAsync,
    stopTracking: stopMutation.mutateAsync,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  };
}
