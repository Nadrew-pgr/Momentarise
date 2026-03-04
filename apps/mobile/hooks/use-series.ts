import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    type SeriesOut,
    type SeriesCreateRequest,
    seriesCreateRequestSchema,
    seriesOutSchema
} from "@momentarise/shared";
import { z } from "zod";
import { apiFetch, readApiError } from "@/lib/api";

export function useSeries() {
    return useQuery<SeriesOut[]>({
        queryKey: ["series"],
        queryFn: async () => {
            const res = await apiFetch("/api/v1/series");
            if (!res.ok) {
                throw new Error(await readApiError(res, "Failed to fetch series"));
            }
            const data = await res.json();
            return z.array(seriesOutSchema).parse(data) as SeriesOut[];
        },
    });
}

export function useCreateSeries() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: SeriesCreateRequest) => {
            const body = seriesCreateRequestSchema.parse(payload);
            const res = await apiFetch("/api/v1/series", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                throw new Error(await readApiError(res, "Failed to create series"));
            }
            const data = await res.json();
            return seriesOutSchema.parse(data) as SeriesOut;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["series"] });
        },
    });
}
