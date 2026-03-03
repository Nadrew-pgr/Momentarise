"use client"

import { usePathname } from "next/navigation"
import { useSeries } from "@/hooks/use-series"

import { NavActions } from "@/components/nav-actions"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SeriesHeader() {
    const pathname = usePathname()
    const seriesId = pathname.split("/series/")[1]?.split("/")[0]

    const { data: allSeries = [] } = useSeries()
    const series = allSeries.find(s => s.id === seriesId)

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
                                {series ? series.title : "Loading Rhythm..."}
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
