"use client"

import { ChevronRight, MoreHorizontal, Plus } from "lucide-react"
import Link from "next/link"

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavWorkspaces({
    workspaces,
}: {
    workspaces: {
        name: string
        emoji: string | React.ReactNode
        pages: {
            name: string
            url: string
            emoji: string | React.ReactNode
        }[]
    }[]
}) {
    return (
        <SidebarGroup>
            <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
            <SidebarMenu>
                {workspaces.map((workspace) => (
                    <Collapsible key={workspace.name}>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <Link href="#">
                                    <span>{workspace.emoji}</span>
                                    <span>{workspace.name}</span>
                                </Link>
                            </SidebarMenuButton>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuAction
                                    className="left-2 bg-sidebar-accent text-sidebar-accent-foreground data-[state=open]:rotate-90"
                                    showOnHover
                                >
                                    <ChevronRight />
                                </SidebarMenuAction>
                            </CollapsibleTrigger>
                            <SidebarMenuAction showOnHover>
                                <Plus />
                            </SidebarMenuAction>
                            <CollapsibleContent>
                                <SidebarMenuSub>
                                    {workspace.pages.map((page) => (
                                        <SidebarMenuSubItem key={page.name}>
                                            <SidebarMenuSubButton asChild>
                                                <Link href={page.url}>
                                                    <span>{page.emoji}</span>
                                                    <span>{page.name}</span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                            </CollapsibleContent>
                        </SidebarMenuItem>
                    </Collapsible>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    )
}
