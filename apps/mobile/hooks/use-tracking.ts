import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function useTracking() {
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiFetch(`/api/v1/events/${eventId}/start`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to start tracking");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiFetch(`/api/v1/events/${eventId}/stop`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to stop tracking");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  return {
    startTracking: startMutation.mutateAsync,
    stopTracking: stopMutation.mutateAsync,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  };
}
