"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Block } from "@blocknote/core";
import type { ProseMirrorNode } from "@momentarise/shared";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BlockEditor } from "@/components/block-editor";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import {
  useDeleteItem,
  useItem,
  useItemLinks,
  useRestoreItem,
  useUpdateItem,
} from "@/hooks/use-item";
import { Button } from "@/components/ui/button";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function InboxItemDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const itemId = typeof params.id === "string" ? params.id : null;

  const { data: item, isLoading } = useItem(itemId);
  const { data: linksData } = useItemLinks(itemId);
  const updateItem = useUpdateItem(itemId);
  const deleteItem = useDeleteItem(itemId);
  const restoreItem = useRestoreItem(itemId);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showUndoDelete, setShowUndoDelete] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, [cancelDebounce]);

  const handleBlocksChange = useCallback(
    (blocks: Block[]) => {
      setSaveState("saving");
      debouncedSave(blocks as unknown as ProseMirrorNode[]);
    },
    [debouncedSave]
  );

  const saveLabel = useMemo(() => {
    if (saveState === "saving") return t("pages.item.saving");
    if (saveState === "saved") return t("pages.item.saved");
    if (saveState === "error") return t("pages.item.saveError");
    return null;
  }, [saveState, t]);

  const handleDelete = useCallback(() => {
    deleteItem.mutate(undefined, {
      onSuccess: () => {
        setShowUndoDelete(true);
        if (undoTimerRef.current) {
          clearTimeout(undoTimerRef.current);
        }
        undoTimerRef.current = setTimeout(() => {
          setShowUndoDelete(false);
        }, 7000);
      },
    });
  }, [deleteItem]);

  const handleUndoDelete = useCallback(() => {
    restoreItem.mutate(undefined, {
      onSuccess: () => {
        setShowUndoDelete(false);
      },
    });
  }, [restoreItem]);

  if (!itemId) {
    return <p className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</p>;
  }

  if (isLoading || !item) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/inbox">{t("pages.item.backToInbox")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href="/inbox" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("pages.item.backToInbox")}
            </Link>
          </Button>
          <h2 className="truncate text-base font-semibold">{item.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {saveLabel ? (
            <span className="text-muted-foreground text-xs font-medium">{saveLabel}</span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={deleteItem.isPending}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            {t("pages.item.delete")}
          </Button>
        </div>
      </div>

      {showUndoDelete ? (
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
          <span className="text-sm">{t("pages.item.deleted")}</span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleUndoDelete}
            disabled={restoreItem.isPending}
          >
            {t("pages.item.undoDelete")}
          </Button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-visible px-4 py-4">
        <div className="grid h-full min-h-[calc(100vh-16rem)] w-full grid-cols-1 gap-4 overflow-visible lg:grid-cols-[1fr_320px]">
          <div className="h-full overflow-visible bg-background">
            <BlockEditor
              key={item.id}
              editorKey={item.id}
              value={item.blocks}
              onChange={handleBlocksChange}
              editable
              className="h-full"
            />
          </div>
          <aside className="rounded-lg border border-border bg-card p-3">
            <h3 className="mb-2 text-sm font-semibold">{t("pages.item.linkedTo")}</h3>
            {linksData == null || linksData.links.length === 0 ? (
              <p className="text-muted-foreground text-xs">{t("pages.item.emptyLinks")}</p>
            ) : (
              <ul className="space-y-2">
                {linksData.links.map((link) => (
                  <li key={link.id} className="rounded border border-border bg-background px-2 py-1.5">
                    <p className="text-xs font-medium">
                      {link.relation_type} {link.to_entity_type}:{link.to_entity_id}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
