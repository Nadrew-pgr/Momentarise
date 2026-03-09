"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { Block } from "@blocknote/core";
import type { ProseMirrorNode } from "@momentarise/shared";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Cloud,
  EllipsisVertical,
  Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BlockEditor } from "@/components/block-editor";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useCaptureDetail, useDeleteCapture, useUpdateCapture } from "@/hooks/use-inbox";
import { useDeleteItemById, useItem, useUpdateItem } from "@/hooks/use-item";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SaveState = "idle" | "saving" | "saved" | "error";

function fallbackTimestampedTitle(captureType: string, createdAt: string, locale: string): string {
  const date = new Date(createdAt);
  const datePart = date.toLocaleDateString(locale || "en-US");
  const timePart = date.toLocaleTimeString(locale || "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${captureType} - ${datePart} ${timePart}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildFavoriteMetadata(currentMetadata: Record<string, unknown> | undefined, nextFavorite: boolean) {
  const base = isRecord(currentMetadata) ? currentMetadata : {};
  const currentNote = isRecord(base.note) ? base.note : {};
  return {
    ...base,
    note: {
      ...currentNote,
      favorite: nextFavorite,
    },
  };
}

function formatEditedAt(value: string | null | undefined, locale: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InboxCaptureNoteEditorPage() {
  const { t, i18n } = useTranslation();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const captureId = typeof params.id === "string" ? params.id : null;
  const itemIdHintRaw = searchParams.get("item_id");
  const itemIdHint = typeof itemIdHintRaw === "string" && itemIdHintRaw.trim().length > 0 ? itemIdHintRaw : null;

  const {
    data: captureData,
    isLoading: isCaptureLoading,
    isError: isCaptureError,
    error: captureError,
    isFetching: isCaptureFetching,
    refetch: refetchCapture,
  } = useCaptureDetail(captureId);
  const capture = captureData?.capture ?? null;
  const itemId = capture?.item_id ?? itemIdHint ?? null;

  const {
    data: item,
    isLoading: isItemLoading,
    isError: isItemError,
    error: itemError,
    isFetching: isItemFetching,
    refetch: refetchItem,
  } = useItem(itemId);
  const updateItem = useUpdateItem(itemId);
  const updateCapture = useUpdateCapture();
  const deleteCapture = useDeleteCapture();
  const deleteItemById = useDeleteItemById();

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const { debounced: debouncedSave, cancel: cancelDebounce } = useDebouncedCallback(
    (blocks: ProseMirrorNode[]) => {
      if (!itemId) return;
      updateItem.mutate(
        { blocks },
        {
          onSuccess: () => setSaveState("saved"),
          onError: () => setSaveState("error"),
        }
      );
    },
    700
  );

  useEffect(() => {
    return () => {
      cancelDebounce();
    };
  }, [cancelDebounce]);

  useEffect(() => {
    if (saveState !== "saved") return;
    const timer = setTimeout(() => setSaveState("idle"), 1600);
    return () => clearTimeout(timer);
  }, [saveState]);

  const handleBlocksChange = useCallback(
    (blocks: Block[]) => {
      setSaveState("saving");
      debouncedSave(blocks as unknown as ProseMirrorNode[]);
    },
    [debouncedSave]
  );

  const noteTitle =
    capture?.title?.trim() ||
    item?.title?.trim() ||
    (capture
      ? fallbackTimestampedTitle(capture.capture_type, capture.created_at, i18n.language || "en-US")
      : t("pages.inbox.noteFallbackTitle"));

  const editedLabel = useMemo(() => {
    const formatted = formatEditedAt(item?.updated_at, i18n.language || "en-US");
    if (!formatted) return null;
    return t("pages.item.noteHeader.edited", { date: formatted });
  }, [i18n.language, item?.updated_at, t]);

  const isFavorite = useMemo(() => {
    const metadata = item?.metadata;
    if (!isRecord(metadata)) return false;
    const note = metadata.note;
    if (!isRecord(note)) return false;
    return note.favorite === true;
  }, [item?.metadata]);

  const handleToggleFavorite = useCallback(async () => {
    if (!item || !itemId) return;
    setSaveState("saving");
    try {
      await updateItem.mutateAsync({
        metadata: buildFavoriteMetadata(item.metadata, !isFavorite),
      });
      setSaveState("saved");
    } catch (error) {
      console.error(error);
      setSaveState("error");
      toast.error(t("pages.item.noteMenu.favoriteError"));
    }
  }, [isFavorite, item, itemId, t, updateItem]);

  const handleRename = useCallback(async () => {
    const proposedTitle = window.prompt(t("pages.item.noteMenu.renamePromptTitle"), noteTitle);
    if (proposedTitle == null) return;
    const nextTitle = proposedTitle.trim();
    if (!nextTitle) {
      toast.error(t("pages.item.noteMenu.renameEmpty"));
      return;
    }

    const operations: Promise<unknown>[] = [];
    if (captureId) {
      operations.push(
        updateCapture.mutateAsync({
          captureId,
          payload: { title: nextTitle },
        })
      );
    }
    if (itemId) {
      operations.push(updateItem.mutateAsync({ title: nextTitle }));
    }
    if (operations.length === 0) return;

    setSaveState("saving");
    const results = await Promise.allSettled(operations);
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length === 0) {
      setSaveState("saved");
      toast.success(t("pages.item.noteMenu.renameSuccess"));
      void refetchCapture();
      if (itemId) void refetchItem();
      return;
    }

    setSaveState("error");
    toast.error(
      failed.length < results.length
        ? t("pages.item.noteMenu.renamePartialError")
        : t("pages.item.noteMenu.renameError")
    );
  }, [captureId, itemId, noteTitle, refetchCapture, refetchItem, t, updateCapture, updateItem]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm(t("pages.item.noteMenu.deleteConfirmBody"))) return;
    if (!captureId && !itemId) return;

    setSaveState("saving");
    const operations: Promise<unknown>[] = [];
    if (captureId) {
      operations.push(deleteCapture.mutateAsync({ captureId }));
    }
    if (itemId) {
      operations.push(deleteItemById.mutateAsync({ itemId }));
    }

    const results = await Promise.allSettled(operations);
    const succeeded = results.filter((result) => result.status === "fulfilled").length;
    if (succeeded === results.length) {
      setSaveState("saved");
      toast.success(t("pages.item.noteMenu.deleteSuccess"));
      window.location.assign("/inbox");
      return;
    }
    if (succeeded > 0) {
      setSaveState("error");
      toast.error(t("pages.item.noteMenu.deletePartialError"));
      window.location.assign("/inbox");
      return;
    }
    setSaveState("error");
    toast.error(t("pages.item.noteMenu.deleteError"));
  }, [captureId, deleteCapture, deleteItemById, itemId, t]);

  const handleCopyLink = useCallback(async () => {
    const path = capture
      ? `/inbox/captures/${capture.id}/note${itemId ? `?item_id=${encodeURIComponent(itemId)}` : ""}`
      : "/inbox";
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast.success(t("pages.item.noteMenu.copyLinkSuccess"));
    } catch (error) {
      console.error(error);
      toast.error(t("pages.item.noteMenu.copyLinkError"));
    }
  }, [capture, itemId, t]);

  const saveStateIcon = useMemo(() => {
    if (saveState === "idle") return null;
    if (saveState === "error") {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (saveState === "saved") {
      return (
        <div className="flex items-center">
          <Cloud className="h-4 w-4 text-emerald-600" />
          <Check className="-ml-1 h-3 w-3 text-emerald-600" />
        </div>
      );
    }
    return <Cloud className="h-4 w-4 text-muted-foreground" />;
  }, [saveState]);

  if (!captureId) {
    return <p className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</p>;
  }

  if ((itemId && isItemLoading && !item) || (!itemId && isCaptureLoading)) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground text-sm">{t("pages.item.loading")}</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/inbox">{t("pages.item.backToInbox")}</Link>
        </Button>
      </div>
    );
  }

  if ((isCaptureError || !capture) && !item) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">
          {captureError instanceof Error ? captureError.message : t("pages.inbox.loadError")}
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void refetchCapture();
            }}
            disabled={isCaptureFetching}
          >
            {t("common.retry")}
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/inbox">{t("pages.item.backToInbox")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!itemId || isItemError || !item) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">
          {itemError instanceof Error
            ? itemError.message
            : t("pages.item.loadError")}
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (itemId) {
                void refetchItem();
              } else {
                void refetchCapture();
              }
            }}
            disabled={isItemFetching}
          >
            {t("common.retry")}
          </Button>
          {capture ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/inbox/captures/${capture.id}`}>{t("pages.inbox.openCapture")}</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href="/inbox">{t("pages.item.backToInbox")}</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild size="icon" variant="ghost" aria-label={t("pages.item.noteHeader.openCapture")}>
            <Link href={capture ? `/inbox/captures/${capture.id}` : "/inbox"}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{noteTitle}</h2>
            {editedLabel ? <p className="truncate text-xs text-muted-foreground">{editedLabel}</p> : null}
          </div>
        </div>
        <div className="ml-2 flex items-center gap-1">
          {saveStateIcon ? <span className="inline-flex h-8 w-8 items-center justify-center">{saveStateIcon}</span> : null}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => {
              void handleToggleFavorite();
            }}
            aria-label={isFavorite ? t("pages.item.noteMenu.unfavorite") : t("pages.item.noteMenu.favorite")}
          >
            <Star className={`h-4 w-4 ${isFavorite ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t("pages.item.noteMenu.title")}>
                <EllipsisVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t("pages.item.noteMenu.title")}</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={capture ? `/inbox/captures/${capture.id}` : "/inbox"}>
                  {t("pages.item.noteMenu.openSourceCapture")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { void handleRename(); }}>
                {t("pages.item.noteMenu.rename")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { void handleCopyLink(); }}>
                {t("pages.item.noteMenu.copyLink")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void handleDelete();
                }}
                className="text-destructive focus:text-destructive"
              >
                {t("pages.item.noteMenu.delete")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>{t("pages.item.noteMenu.duplicate")}</DropdownMenuItem>
              <DropdownMenuItem disabled>{t("pages.item.noteMenu.moveTo")}</DropdownMenuItem>
              <DropdownMenuItem disabled>{t("pages.item.noteMenu.versionHistory")}</DropdownMenuItem>
              <DropdownMenuItem disabled>{t("pages.item.noteMenu.notifications")}</DropdownMenuItem>
              <DropdownMenuItem disabled>{t("pages.item.noteMenu.analytics")}</DropdownMenuItem>
              <DropdownMenuItem disabled>{t("pages.item.noteMenu.importExport")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-visible px-4 py-4">
        <div className="h-full min-h-[calc(100vh-14rem)] w-full overflow-visible bg-background">
          <BlockEditor
            key={item.id}
            editorKey={`${item.id}-capture-note`}
            value={item.blocks}
            onChange={handleBlocksChange}
            editable
            enableAI
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
