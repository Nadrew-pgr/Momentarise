"use client";

import { useQuery } from "@tanstack/react-query";

export interface MeResponse {
  user: { id: string; email: string };
  active_workspace: { id: string; name: string; role: string } | null;
}

export function useMe() {
  return useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });
}
