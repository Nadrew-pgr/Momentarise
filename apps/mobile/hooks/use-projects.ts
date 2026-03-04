import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    type ProjectOut,
    type ProjectCreateRequest,
    projectCreateRequestSchema,
    projectOutSchema
} from "@momentarise/shared";
import { z } from "zod";
import { apiFetch, readApiError } from "@/lib/api";

export function useProjects() {
    return useQuery<ProjectOut[]>({
        queryKey: ["projects"],
        queryFn: async () => {
            const res = await apiFetch("/api/v1/projects");
            if (!res.ok) {
                throw new Error(await readApiError(res, "Failed to fetch projects"));
            }
            const data = await res.json();
            return z.array(projectOutSchema).parse(data) as ProjectOut[];
        },
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: ProjectCreateRequest) => {
            const body = projectCreateRequestSchema.parse(payload);
            const res = await apiFetch("/api/v1/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                throw new Error(await readApiError(res, "Failed to create project"));
            }
            const data = await res.json();
            return projectOutSchema.parse(data) as ProjectOut;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
        },
    });
}
