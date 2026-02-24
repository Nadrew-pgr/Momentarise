"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/bff-client";

export interface MeResponse {
  user: { id: string; email: string };
  active_workspace: { id: string; name: string; role: string } | null;
}

export function useMe() {
  return useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/auth/me");
      return res.json();
    },
  });
}
