"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Camera,
  FileText,
  Inbox as InboxIcon,
  Link2,
  Mic,
  Search,
  Trash2,
  WandSparkles,
} from "lucide-react";
import type { CaptureType } from "@momentarise/shared";
import {
  useApplyCapture,
  useDeleteCapture,
  useInbox,
  usePreviewCapture,
  useProcessCapture,
  useRestoreCapture,
} from "@/hooks/use-inbox";
import {
  useDeleteItemById,
  useItems,
  useRestoreItemById,
} from "@/hooks/use-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FilterKey = "all" | "notes" | "voice" | "photo" | "file" | "link";
type SectionKey = "today" | "yesterday" | "earlier";

type FeedEntry =
  | {
      type: "capture";
      id: string;
      at: Date;
      title: string;
      subtitle: string;
      kindLabel: string;
      status: string;
      captureType: CaptureType;
      channel: string | null;
    }
  | {
      type: "item";
      id: string;
      at: Date;
      title: string;
      subtitle: string;
      kindLabel: string;
      itemKind: string;
    };

const captureFilters: Array<{ key: FilterKey; captureType?: CaptureType }> = [
  { key: "all" },
  { key: "notes", captureType: "text" },
  { key: "voice", captureType: "voice" },
  { key: "photo", captureType: "photo" },
  { key: "file" },
  { key: "link", captureType: "link" },
];

function firstLine(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.split("\n")[0]?.trim() ?? "";
}

function previewText(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return compact.length > 120 ? `${compact.slice(0, 120)}…` : compact;
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

function captureIcon(type: CaptureType): ReactNode {
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

export default function InboxPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [processingCaptureId, setProcessingCaptureId] = useState<string | null>(null);
  const [processingTitle, setProcessingTitle] = useState("");
  const [previewByCaptureId, setPreviewByCaptureId] = useState<
    Record<string, { suggested_title: string; suggested_kind: string; reason: string }>
  >({});

  const { data: inboxData, isLoading: inboxLoading } = useInbox();
  const { data: itemsData, isLoading: itemsLoading } = useItems();
  const previewCapture = usePreviewCapture();
  const applyCapture = useApplyCapture();
  const processCapture = useProcessCapture();
  const deleteCapture = useDeleteCapture();
  const restoreCapture = useRestoreCapture();
  const deleteItemById = useDeleteItemById();
  const restoreItemById = useRestoreItemById();

  const captures = inboxData?.captures;
  const items = itemsData?.items;

  const sectionLabel = useCallback(
    (key: SectionKey) => {
      if (key === "today") return t("pages.inbox.sectionToday");
      if (key === "yesterday") return t("pages.inbox.sectionYesterday");
      return t("pages.inbox.sectionEarlier");
    },
    [t]
  );

  const formatTime = useCallback(
    (date: Date) =>
      new Intl.DateTimeFormat(i18n.language || "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date),
    [i18n.language]
  );

  const feed = useMemo(() => {
    const query = search.trim().toLowerCase();
    const allEntries: FeedEntry[] = [];
    const captureList = captures ?? [];
    const itemList = items ?? [];

    for (const capture of captureList) {
      const title =
        firstLine(capture.raw_content) ||
        t("pages.inbox.captureFallbackTitle", { type: capture.capture_type });
      const subtitle = previewText(capture.raw_content) || t("pages.inbox.emptyCapture");
      const entry: FeedEntry = {
        type: "capture",
        id: capture.id,
        at: new Date(capture.created_at),
        title,
        subtitle,
        kindLabel: t("pages.inbox.kindCapture"),
        status: capture.status,
        captureType: capture.capture_type,
        channel:
          capture.metadata && typeof capture.metadata.channel === "string"
            ? capture.metadata.channel
            : null,
      };
      allEntries.push(entry);
    }

    for (const item of itemList) {
      const entry: FeedEntry = {
        type: "item",
        id: item.id,
        at: new Date(item.updated_at),
        title: item.title,
        subtitle: item.kind,
        kindLabel: t("pages.inbox.kindItem"),
        itemKind: item.kind,
      };
      allEntries.push(entry);
    }

    const filtered = allEntries.filter((entry) => {
      if (activeFilter === "notes") {
        if (entry.type === "item") return entry.itemKind === "note";
        return entry.captureType === "text" || entry.channel === "note";
      }
      if (activeFilter === "file") {
        if (entry.type !== "capture") return false;
        return entry.channel === "file";
      }
      if (activeFilter !== "all") {
        if (entry.type !== "capture") return false;
        if (entry.captureType !== activeFilter) return false;
      }
      if (!query) return true;
      return `${entry.title} ${entry.subtitle}`.toLowerCase().includes(query);
    });

    filtered.sort((a, b) => b.at.getTime() - a.at.getTime());
    return filtered;
  }, [activeFilter, captures, items, search, t]);

  const grouped = useMemo(() => {
    const bySection: Record<SectionKey, FeedEntry[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    };
    for (const entry of feed) {
      bySection[resolveSectionKey(entry.at)].push(entry);
    }
    return bySection;
  }, [feed]);

  const handlePreview = useCallback(
    (captureId: string) => {
      previewCapture.mutate(
        { captureId },
        {
          onSuccess: (preview) => {
            setPreviewByCaptureId((prev) => ({
              ...prev,
              [captureId]: {
                suggested_title: preview.suggested_title,
                suggested_kind: preview.suggested_kind,
                reason: preview.reason,
              },
            }));
          },
        }
      );
    },
    [previewCapture]
  );

  const handleApply = useCallback(
    (captureId: string) => {
      const preview = previewByCaptureId[captureId];
      applyCapture.mutate(
        {
          captureId,
          payload: preview
            ? { title: preview.suggested_title, kind: preview.suggested_kind as never }
            : undefined,
        },
        {
          onSuccess: (res) => {
            router.push(`/inbox/items/${res.item_id}`);
          },
        }
      );
    },
    [applyCapture, previewByCaptureId, router]
  );

  const handleSubmitProcess = useCallback(() => {
    if (!processingCaptureId || !processingTitle.trim()) return;
    processCapture.mutate(
      { captureId: processingCaptureId, title: processingTitle.trim() },
      {
        onSuccess: (res) => {
          setProcessingCaptureId(null);
          setProcessingTitle("");
          router.push(`/inbox/items/${res.item_id}`);
        },
      }
    );
  }, [processCapture, processingCaptureId, processingTitle, router]);

  const isLoading = inboxLoading || itemsLoading;
  const isBusy =
    applyCapture.isPending ||
    processCapture.isPending ||
    deleteCapture.isPending ||
    deleteItemById.isPending ||
    restoreCapture.isPending ||
    restoreItemById.isPending;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <header className="-mx-4 sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 pb-4 pt-2 backdrop-blur">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("pages.inbox.title")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t("pages.inbox.subtitle")}</p>
          </div>
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

        <div className="flex gap-2 overflow-x-auto pb-1">
          {captureFilters.map((filter) => (
            <Button
              key={filter.key}
              type="button"
              size="sm"
              variant={activeFilter === filter.key ? "default" : "outline"}
              className="shrink-0 rounded-full px-4"
              onClick={() => setActiveFilter(filter.key)}
            >
              {t(`pages.inbox.filter.${filter.key}`)}
            </Button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-28 pt-4">
        {isLoading ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <p className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</p>
          </div>
        ) : feed.length === 0 ? (
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
                    {sectionLabel(section)}
                  </h2>
                  <div className="space-y-3">
                    {entries.map((entry) => {
                      if (entry.type === "capture") {
                        const preview = previewByCaptureId[entry.id];
                        return (
                          <article
                            key={`capture-${entry.id}`}
                            className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm"
                          >
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="mt-0.5 rounded-full border border-border bg-background p-2">
                                  {captureIcon(entry.captureType)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">{entry.title}</p>
                                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                                    {entry.subtitle}
                                  </p>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-muted-foreground text-xs">{formatTime(entry.at)}</p>
                                <p className="text-muted-foreground mt-1 text-[11px] uppercase">
                                  {entry.status}
                                </p>
                              </div>
                            </div>

                            {preview ? (
                              <div className="mb-3 rounded-lg border border-border bg-background/70 p-2">
                                <p className="text-xs font-medium">
                                  {preview.suggested_title} ({preview.suggested_kind})
                                </p>
                                <p className="text-muted-foreground text-xs">{preview.reason}</p>
                              </div>
                            ) : null}

                            {processingCaptureId === entry.id ? (
                              <div className="flex flex-wrap items-end gap-2">
                                <div className="min-w-[220px] flex-1">
                                  <Label htmlFor={`process-title-${entry.id}`} className="mb-1 block text-xs">
                                    {t("pages.inbox.processTitle")}
                                  </Label>
                                  <Input
                                    id={`process-title-${entry.id}`}
                                    value={processingTitle}
                                    onChange={(event) => setProcessingTitle(event.target.value)}
                                    placeholder={t("pages.item.title")}
                                    className="h-9"
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  onClick={handleSubmitProcess}
                                  disabled={!processingTitle.trim() || processCapture.isPending}
                                >
                                  {t("pages.inbox.processSubmit")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setProcessingCaptureId(null);
                                    setProcessingTitle("");
                                  }}
                                >
                                  {t("pages.inbox.cancel")}
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePreview(entry.id)}
                                  disabled={isBusy}
                                >
                                  {t("pages.inbox.preview")}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleApply(entry.id)}
                                  disabled={isBusy}
                                >
                                  {t("pages.inbox.apply")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setProcessingCaptureId(entry.id);
                                    setProcessingTitle(preview?.suggested_title ?? entry.title);
                                  }}
                                  disabled={isBusy}
                                >
                                  <WandSparkles className="mr-1 h-3.5 w-3.5" />
                                  {t("pages.inbox.process")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    deleteCapture.mutate(
                                      { captureId: entry.id },
                                      {
                                        onSuccess: () => {
                                          toast(t("pages.item.deleted"), {
                                            action: {
                                              label: t("pages.item.undoDelete"),
                                              onClick: () =>
                                                restoreCapture.mutate({ captureId: entry.id }),
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
                              </div>
                            )}
                          </article>
                        );
                      }

                      return (
                        <article
                          key={`item-${entry.id}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(`/inbox/items/${entry.id}`)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(`/inbox/items/${entry.id}`);
                            }
                          }}
                          className="cursor-pointer rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm transition hover:border-primary/30"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{entry.title}</p>
                              <p className="text-muted-foreground mt-1 text-xs uppercase">
                                {entry.subtitle}
                              </p>
                            </div>
                            <p className="text-muted-foreground shrink-0 text-xs">{formatTime(entry.at)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteItemById.mutate(
                                  { itemId: entry.id },
                                  {
                                    onSuccess: () => {
                                      toast(t("pages.item.deleted"), {
                                        action: {
                                          label: t("pages.item.undoDelete"),
                                          onClick: () =>
                                            restoreItemById.mutate({ itemId: entry.id }),
                                        },
                                      });
                                    },
                                  }
                                );
                              }}
                              disabled={isBusy}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {t("pages.item.delete")}
                            </Button>
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
