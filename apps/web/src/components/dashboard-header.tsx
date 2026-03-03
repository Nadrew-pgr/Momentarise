"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ProjectHeader } from "./project-header";
import { SeriesHeader } from "./series-header";

const pathToLabelKey: Record<string, string> = {
  today: "nav.today",
  inbox: "nav.inbox",
  sync: "nav.sync",
  timeline: "nav.timeline",
  calendar: "nav.calendar",
  me: "nav.me",
};

export function DashboardHeader() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "today";
  const labelKey = pathToLabelKey[segment] ?? "nav.today";
  const pageLabel = t(labelKey);
  const isSyncPage = segment === "sync";

  function triggerNewSyncChat() {
    window.dispatchEvent(new Event("sync-chat:new-chat"));
  }

  function openSyncActions() {
    window.dispatchEvent(new Event("sync-chat:open-actions"));
  }

  if (pathname.startsWith("/projects/")) {
    return <ProjectHeader />;
  }
  if (pathname.startsWith("/series/")) {
    return <SeriesHeader />;
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink asChild>
              <Link href="/today">{t("common.appName")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {isSyncPage ? (
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={triggerNewSyncChat}>
            {t("pages.sync.newChat")}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={openSyncActions}
            aria-label={t("pages.sync.actions.open")}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </header>
  );
}
