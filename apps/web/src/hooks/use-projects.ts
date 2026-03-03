import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/bff-client";
import {
    ProjectOut,
    ProjectCreateRequest,
    ProjectUpdateRequest
} from "@momentarise/shared";

export const projectsKeys = {
    all: ["projects"] as const,
};

export function useProjects() {
    return useQuery({
        queryKey: projectsKeys.all,
        queryFn: async () => {
            const response = await fetchWithAuth("/api/v1/projects");
            if (!response.ok) throw new Error("Failed to fetch projects");
            return response.json() as Promise<ProjectOut[]>;
        },
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: ProjectCreateRequest) => {
            const response = await fetchWithAuth("/api/v1/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error("Failed to create project");
            return response.json() as Promise<ProjectOut>;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectsKeys.all });
        },
    });
}

export function useUpdateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: ProjectUpdateRequest }) => {
            const response = await fetchWithAuth(`/api/v1/projects/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error("Failed to update project");
            return response.json() as Promise<ProjectOut>;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectsKeys.all });
        },
    });
}

export function useDeleteProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetchWithAuth(`/api/v1/projects/${id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Failed to delete project");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectsKeys.all });
        },
    });
}
