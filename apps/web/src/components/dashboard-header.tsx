"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { EllipsisVertical, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCaptureDetail } from "@/hooks/use-inbox";
import { useItem } from "@/hooks/use-item";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const { t, i18n } = useTranslation();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "today";
  const labelKey = pathToLabelKey[segment] ?? "nav.today";
  const pageLabel = t(labelKey);
  const isSyncPage = segment === "sync";
  const captureMatch = pathname.match(/^\/inbox\/captures\/([^/]+)(?:\/note)?$/);
  const itemMatch = pathname.match(/^\/inbox\/items\/([^/]+)$/);
  const captureId = captureMatch?.[1] ?? null;
  const itemId = itemMatch?.[1] ?? null;
  const [syncConversationMeta, setSyncConversationMeta] = useState<{
    runId: string | null;
    title: string | null;
  }>({ runId: null, title: null });
  const isDeepInboxRoute = Boolean(captureId || itemId);
  const captureDetail = useCaptureDetail(captureId);
  const itemDetail = useItem(itemId);
  const captureFallback = (captureType: string | null | undefined, createdAt: string | null | undefined) => {
    if (!createdAt) {
      return t("pages.inbox.captureFallbackTitle", { type: captureType ?? "capture" });
    }
    const date = new Date(createdAt);
    const locale = i18n.language || "en-US";
    const datePart = date.toLocaleDateString(locale);
    const timePart = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    return t("pages.inbox.captureFallbackTimestamped", {
      type: captureType ?? "capture",
      date: datePart,
      time: timePart,
      defaultValue: `${captureType ?? "capture"} - ${datePart} ${timePart}`,
    });
  };

  const currentLabel = (() => {
    if (captureId) {
      if (captureDetail.isLoading) return "Loading...";
      const capture = captureDetail.data?.capture;
      if (capture?.title && capture.title.trim()) return capture.title.trim();
      return captureFallback(capture?.capture_type, capture?.created_at);
    }
    if (itemId) {
      if (itemDetail.isLoading) return "Loading...";
      if (itemDetail.data?.title && itemDetail.data.title.trim()) return itemDetail.data.title.trim();
      return t("pages.inbox.noteFallbackTitle", { defaultValue: "Note" });
    }
    return pageLabel;
  })();
  const syncConversationTitle =
    syncConversationMeta.title?.trim() || t("pages.sync.header.newConversation");

  useEffect(() => {
    if (!isSyncPage) return;
    const handleConversationMeta = (event: Event) => {
      const detail = (event as CustomEvent<{ runId?: string | null; title?: string | null }>).detail;
      setSyncConversationMeta({
        runId: detail?.runId ?? null,
        title: detail?.title ?? null,
      });
    };

    window.addEventListener("sync-chat:conversation-meta", handleConversationMeta as EventListener);
    return () => {
      window.removeEventListener("sync-chat:conversation-meta", handleConversationMeta as EventListener);
    };
  }, [isSyncPage]);

  function triggerNewSyncChat() {
    window.dispatchEvent(new Event("sync-chat:new-chat"));
  }

  function openSyncHistory() {
    window.dispatchEvent(new Event("sync-chat:open-history"));
  }

  function renameSyncChat() {
    window.dispatchEvent(new Event("sync-chat:rename-current"));
  }

  function deleteSyncChat() {
    window.dispatchEvent(new Event("sync-chat:delete-current"));
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
          {isDeepInboxRoute ? (
            <>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link href="/today">{t("common.appName")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/inbox">{t("nav.inbox")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-[24rem] truncate">{currentLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : isSyncPage ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/today">{t("common.appName")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/sync">{t("nav.sync")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-[24rem] truncate">{syncConversationTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link href="/today">{t("common.appName")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      {isSyncPage ? (
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label={t("pages.sync.menu.openHistory")}
            onClick={openSyncHistory}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8"
                aria-label={t("pages.sync.menu.title")}
              >
                <EllipsisVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={triggerNewSyncChat}>
                {t("pages.sync.menu.newChat")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!syncConversationMeta.runId}
                onClick={renameSyncChat}
              >
                {t("pages.sync.menu.renameCurrent")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!syncConversationMeta.runId}
                onClick={deleteSyncChat}
                className="text-destructive focus:text-destructive"
              >
                {t("pages.sync.menu.deleteCurrent")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div id="dashboard-header-slot" className="flex flex-1 items-center ml-4" />
      )}
    </header>
  );
}
