"use client"

import { usePathname } from "next/navigation"
import { useProjects } from "@/hooks/use-projects"

import { NavActions } from "@/components/nav-actions"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function ProjectHeader() {
    const pathname = usePathname()
    const projectId = pathname.split("/projects/")[1]?.split("/")[0]

    const { data: projects = [] } = useProjects()
    const project = projects.find(p => p.id === projectId)

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 transition-colors">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                />
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbPage className="line-clamp-1 font-medium text-foreground">
                                {project ? project.title : "Loading Project..."}
                            </BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            <div className="ml-auto flex items-center gap-2">
                <NavActions />
            </div>
        </header>
    )
}
