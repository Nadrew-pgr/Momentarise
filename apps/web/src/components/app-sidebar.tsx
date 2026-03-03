"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Bot,
  Calendar,
  CalendarDays,
  ChevronsUpDown,
  Inbox,
  LayoutDashboard,
  Settings2,
} from "lucide-react";

import { useMe } from "@/hooks/use-me";
import { useProjects } from "@/hooks/use-projects";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { NavMain } from "@/components/nav-main";
import { NavFavorites } from "@/components/nav-favorites";
import { NavWorkspaces } from "@/components/nav-workspaces";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";

function WorkspaceSwitcher() {
  const { t } = useTranslation();
  const { data } = useMe();
  const workspace = data?.active_workspace;
  const name = workspace?.name ?? t("workspace.switcher");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <LayoutDashboard className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {t("workspace.switcher")}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                {t("workspace.switcher")}
              </DropdownMenuLabel>
              {workspace && (
                <DropdownMenuItem className="gap-2 p-2" disabled>
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <LayoutDashboard className="size-3.5 shrink-0" />
                  </div>
                  {workspace.name}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" disabled>
              <span className="text-muted-foreground text-sm">
                {t("workspace.addWorkspace")}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { t } = useTranslation();

  const { data: meData } = useMe();
  const { data: projects = [] } = useProjects();

  const user = meData?.user;

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  const navMainParams = useMemo(() => [
    { title: t("nav.today"), url: "/today", icon: LayoutDashboard, isActive: pathname === "/today" },
    { title: t("nav.inbox"), url: "/inbox", icon: Inbox, isActive: pathname === "/inbox" },
    { title: t("nav.sync"), url: "/sync", icon: Bot, isActive: pathname === "/sync" },
    { title: t("nav.timeline"), url: "/timeline", icon: Calendar, isActive: pathname === "/timeline" },
    { title: t("nav.calendar"), url: "/calendar", icon: CalendarDays, isActive: pathname === "/calendar" },
  ], [t, pathname]);

  const navSecondaryParams = useMemo(() => [
    { title: "Settings", url: "/settings", icon: Settings2 },
  ], []);

  const workspaceData = useMemo(() => {
    if (!meData?.active_workspace) return [];

    return [
      {
        name: meData.active_workspace.name,
        emoji: "💼", // default pending dynamic icons
        pages: projects.map(p => ({
          name: p.title,
          url: `/projects/${p.id}`,
          emoji: (
            <div className="flex items-center justify-center w-4 h-4 mr-1">
              <div className={`w-2 h-2 rounded-full bg-${p.color}-500`} />
            </div>
          )
        }))
      }
    ]
  }, [projects, meData?.active_workspace]);

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher />
        <NavMain items={navMainParams} />
      </SidebarHeader>
      <SidebarContent>
        <NavFavorites favorites={[]} />
        <NavWorkspaces workspaces={workspaceData} />
        <NavSecondary items={navSecondaryParams} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: user?.email ? user.email.split('@')[0]! : "User",
          email: user?.email || "",
          initials: user?.email ? user.email.slice(0, 2).toUpperCase() : "?",
          avatar: undefined // could pass an avatar later
        }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
