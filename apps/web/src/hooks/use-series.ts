import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/bff-client";
import {
    SeriesOut,
    SeriesCreateRequest,
    SeriesUpdateRequest
} from "@momentarise/shared";

export const seriesKeys = {
    all: ["series"] as const,
    byProject: (projectId: string | null) => ["series", { projectId }] as const,
};

export function useSeries(projectId?: string | null) {
    return useQuery({
        queryKey: projectId !== undefined ? seriesKeys.byProject(projectId) : seriesKeys.all,
        queryFn: async () => {
            let url = "/api/v1/series";
            if (projectId) {
                url += `?project_id=${projectId}`;
            }
            const response = await fetchWithAuth(url);
            if (!response.ok) throw new Error("Failed to fetch series");
            return response.json() as Promise<SeriesOut[]>;
        },
    });
}

export function useCreateSeries() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: SeriesCreateRequest) => {
            const response = await fetchWithAuth("/api/v1/series", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error("Failed to create series");
            return response.json() as Promise<SeriesOut>;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: seriesKeys.all });
            if (data.project_id) {
                queryClient.invalidateQueries({ queryKey: seriesKeys.byProject(data.project_id) });
            }
        },
    });
}

export function useUpdateSeries() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: SeriesUpdateRequest }) => {
            const response = await fetchWithAuth(`/api/v1/series/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error("Failed to update series");
            return response.json() as Promise<SeriesOut>;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: seriesKeys.all });
            if (data.project_id) {
                queryClient.invalidateQueries({ queryKey: seriesKeys.byProject(data.project_id) });
            }
        },
    });
}

export function useDeleteSeries() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetchWithAuth(`/api/v1/series/${id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Failed to delete series");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: seriesKeys.all });
            // We don't have the DTO on delete to precisely invalidate byProject,
            // so we let the generic 'all' invalidation sweep it up (or reset if needed)
        },
    });
}
