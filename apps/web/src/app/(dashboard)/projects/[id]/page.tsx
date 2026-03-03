"use client";

import { useParams } from "next/navigation";
import { useProjects } from "@/hooks/use-projects";

export default function ProjectPage() {
    const params = useParams();
    const projectId = params.id as string;
    const { data: projects = [] } = useProjects();
    const project = projects.find(p => p.id === projectId);

    return (
        <div className="flex flex-1 flex-col gap-4 py-8 lg:px-8 max-w-5xl mx-auto w-full">
            <div className="mx-auto h-24 w-full rounded-xl bg-muted/50 flex flex-col items-center justify-center text-muted-foreground italic">
                {project ? `Project "${project.title}" Template` : "Loading Project..."}
            </div>
            <div className="mx-auto h-[100vh] min-h-[500px] w-full rounded-xl bg-muted/50" />
        </div>
    );
}
