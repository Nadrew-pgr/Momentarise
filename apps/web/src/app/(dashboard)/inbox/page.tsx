"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Camera,
  FileText,
  Inbox as InboxIcon,
  Link2,
  Mic,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import type { CaptureActionSuggestion, CaptureType } from "@momentarise/shared";
import {
  useDeleteCapture,
  useInbox,
  useReprocessCapture,
  useRestoreCapture,
} from "@/hooks/use-inbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TypeFilterKey = "all" | "voice" | "photo" | "file" | "link";
type SortKey = "newest" | "oldest" | "a2z" | "z2a";
type SectionKey = "today" | "yesterday" | "earlier";
type ViewMode = "active" | "archived";

function captureIcon(type: CaptureType) {
  switch (type) {
    case "voice":
      return <Mic className="h-4 w-4" />;
    case "photo":
      return <Camera className="h-4 w-4" />;
    case "link":
      return <Link2 className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function firstLine(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.split("\n")[0]?.trim() ?? "";
}

function previewText(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
}

function resolveSectionKey(at: Date): SectionKey {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (at >= today) return "today";
  if (at >= yesterday) return "yesterday";
  return "earlier";
}

function relativeTime(now: Date, date: Date, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale || "en-US", { numeric: "auto" });
  const deltaMs = date.getTime() - now.getTime();
  const absSeconds = Math.abs(deltaMs) / 1000;
  if (absSeconds < 60) return rtf.format(Math.round(deltaMs / 1000), "second");
  const absMinutes = absSeconds / 60;
  if (absMinutes < 60) return rtf.format(Math.round(deltaMs / 60000), "minute");
  const absHours = absMinutes / 60;
  if (absHours < 24) return rtf.format(Math.round(deltaMs / 3600000), "hour");
  return rtf.format(Math.round(deltaMs / 86400000), "day");
}

export default function InboxPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilterKey>("all");
  const [sortOrder, setSortOrder] = useState<SortKey>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [showDeleted, setShowDeleted] = useState(false);

  const { data: inboxData, isLoading, isError, error, refetch } = useInbox({
    includeArchived: viewMode === "archived" || showDeleted,
  });
  const reprocessCapture = useReprocessCapture();
  const deleteCapture = useDeleteCapture();
  const restoreCapture = useRestoreCapture();

  const captures = inboxData?.captures;

  const filteredCaptures = useMemo(() => {
    const source = captures ?? [];
    const query = search.trim().toLowerCase();
    const list = source.filter((capture) => {
      if (viewMode === "archived") {
        if (!capture.archived) return false;
      } else {
        if (capture.archived && !(showDeleted && capture.archived_reason === "deleted")) return false;
      }
      if (typeFilter !== "all" && capture.capture_type !== typeFilter) return false;

      if (!query) return true;
      const haystack = `${capture.raw_content} ${(capture.primary_action?.label ?? "").toString()}`;
      return haystack.toLowerCase().includes(query);
    });
    const cmp = (a: (typeof list)[0], b: (typeof list)[0]) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (sortOrder === "newest") return tb - ta;
      if (sortOrder === "oldest") return ta - tb;
      const titleA = firstLine(a.raw_content).toLowerCase();
      const titleB = firstLine(b.raw_content).toLowerCase();
      if (sortOrder === "a2z") return titleA.localeCompare(titleB);
      return titleB.localeCompare(titleA);
    };
    list.sort(cmp);
    return list;
  }, [captures, search, typeFilter, sortOrder, viewMode, showDeleted]);

  const grouped = useMemo(() => {
    const bySection: Record<SectionKey, typeof filteredCaptures> = {
      today: [],
      yesterday: [],
      earlier: [],
    };
    for (const capture of filteredCaptures) {
      bySection[resolveSectionKey(new Date(capture.created_at))].push(capture);
    }
    return bySection;
  }, [filteredCaptures]);

  const handleCtaClick = useCallback(
    (captureId: string, action: CaptureActionSuggestion) => {
      router.push(`/inbox/captures/${captureId}?action_key=${encodeURIComponent(action.key)}`);
    },
    [router]
  );

  const isBusy =
    reprocessCapture.isPending || deleteCapture.isPending || restoreCapture.isPending;
  const inboxErrorMessage =
    error instanceof Error ? error.message : t("pages.inbox.loadError");

  const now = new Date();

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <header className="-mx-4 sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 pb-4 pt-2 backdrop-blur">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">{t("pages.inbox.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("pages.inbox.subtitle")}</p>
        </div>

        <div className="relative mb-3">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("pages.inbox.searchPlaceholder")}
            className="h-11 rounded-xl pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-1">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "active" ? "default" : "outline"}
            className="shrink-0 rounded-full px-4"
            onClick={() => setViewMode("active")}
          >
            {t("pages.inbox.viewActive")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "archived" ? "default" : "outline"}
            className="shrink-0 rounded-full px-4"
            onClick={() => setViewMode("archived")}
          >
            {t("pages.inbox.viewArchived")}
          </Button>
          {(["all", "voice", "photo", "file", "link"] as TypeFilterKey[]).map((filter) => (
            <Button
              key={filter}
              type="button"
              size="sm"
              variant={typeFilter === filter ? "default" : "outline"}
              className="shrink-0 rounded-full px-4"
              onClick={() => setTypeFilter(filter)}
            >
              {t(`pages.inbox.filter.${filter}`)}
            </Button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="outline" className="shrink-0 rounded-full px-3">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <span className="text-muted-foreground px-2 py-1.5 text-xs font-medium">Sort</span>
              <DropdownMenuItem onClick={() => setSortOrder("newest")}>
                {t("pages.inbox.sortNewest")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("oldest")}>
                {t("pages.inbox.sortOldest")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("a2z")}>
                {t("pages.inbox.sortA2Z")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("z2a")}>
                {t("pages.inbox.sortZ2A")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleted((v) => !v)}>
                {showDeleted ? t("pages.inbox.hideDeleted") : t("pages.inbox.showDeleted")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-28 pt-4">
        {isLoading ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <p className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</p>
          </div>
        ) : isError ? (
          <div className="mx-auto flex w-full max-w-xl flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium">{t("pages.inbox.loadError")}</p>
            <p className="text-muted-foreground text-xs">{inboxErrorMessage}</p>
            <div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                disabled={isBusy}
              >
                {t("common.retry")}
              </Button>
            </div>
          </div>
        ) : filteredCaptures.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-center">
            <InboxIcon className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">{t("pages.inbox.emptyList")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(["today", "yesterday", "earlier"] as SectionKey[]).map((section) => {
              const entries = grouped[section];
              if (!entries.length) return null;
              return (
                <section key={section} className="space-y-3">
                  <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                    {t(`pages.inbox.section${section[0].toUpperCase()}${section.slice(1)}`)}
                  </h2>
                  <div className="space-y-3">
                    {entries.map((capture) => {
                      const title =
                        firstLine(capture.raw_content) ||
                        t("pages.inbox.captureFallbackTitle", { type: capture.capture_type });
                      const subtitle =
                        previewText(capture.raw_content) || t("pages.inbox.emptyCapture");
                      const suggestions = capture.suggested_actions.slice(0, 3);
                      const createdAt = new Date(capture.created_at);
                      const canActOnCapture = !capture.archived && viewMode === "active";
                      return (
                        <article
                          key={capture.id}
                          className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="mt-0.5 rounded-full border border-border bg-background p-2">
                                {captureIcon(capture.capture_type)}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/inbox/captures/${capture.id}`}
                                  className="truncate text-sm font-semibold hover:underline"
                                >
                                  {title}
                                </Link>
                                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                                  {subtitle}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-1">
                                  {capture.badges.map((badge) => (
                                    <Badge
                                      key={`${capture.id}-${badge.key}`}
                                      variant={
                                        badge.tone === "default"
                                          ? "default"
                                          : badge.tone === "secondary"
                                            ? "secondary"
                                            : "outline"
                                      }
                                      className="inline-flex items-center leading-tight"
                                    >
                                      {badge.label}
                                    </Badge>
                                  ))}
                                  {capture.status === "applied" ? (
                                    <Badge variant="secondary" className="inline-flex items-center leading-tight">
                                      {t("pages.inbox.badgeApplied")}
                                    </Badge>
                                  ) : null}
                                  {capture.archived_reason === "deleted" ? (
                                    <Badge variant="outline" className="inline-flex items-center leading-tight">
                                      {t("pages.inbox.badgeDeleted")}
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            <p className="text-muted-foreground shrink-0 text-xs">
                              {relativeTime(now, createdAt, i18n.language || "en-US")}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/inbox/captures/${capture.id}`)}
                              disabled={isBusy}
                            >
                              {t("pages.inbox.openCapture")}
                            </Button>
                            {canActOnCapture
                              ? suggestions.map((action) => (
                                <Button
                                  key={action.key}
                                  size="sm"
                                  variant={action.is_primary ? "default" : "outline"}
                                  onClick={() => handleCtaClick(capture.id, action)}
                                  disabled={isBusy}
                                >
                                  {action.label}
                                </Button>
                              ))
                              : null}

                            {canActOnCapture && capture.status === "failed" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reprocessCapture.mutate({ captureId: capture.id })}
                                disabled={isBusy}
                              >
                                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                                {t("pages.inbox.reprocess")}
                              </Button>
                            ) : null}

                            {canActOnCapture ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  deleteCapture.mutate(
                                    { captureId: capture.id },
                                    {
                                      onSuccess: () => {
                                        toast(t("pages.item.deleted"), {
                                          action: {
                                            label: t("pages.item.undoDelete"),
                                            onClick: () =>
                                              restoreCapture.mutate({ captureId: capture.id }),
                                          },
                                        });
                                      },
                                    }
                                  )
                                }
                                disabled={isBusy}
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                {t("pages.item.delete")}
                              </Button>
                            ) : null}
                            {viewMode === "archived" && capture.archived_reason === "deleted" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => restoreCapture.mutate({ captureId: capture.id })}
                                disabled={isBusy}
                              >
                                {t("pages.item.undoDelete")}
                              </Button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
