import { useQuery } from "@tanstack/react-query";
import type { MeResponse } from "@momentarise/shared";
import { meResponseSchema } from "@momentarise/shared";
import { apiFetch, readApiError } from "@/lib/api";

export function useMe() {
  return useQuery<MeResponse>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/auth/me");
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to fetch profile"));
      }
      const data = await res.json();
      return meResponseSchema.parse(data) as MeResponse;
    },
  });
}
