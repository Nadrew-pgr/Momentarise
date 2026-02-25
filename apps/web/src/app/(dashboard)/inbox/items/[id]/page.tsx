"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Block } from "@blocknote/core";
import type { ProseMirrorNode } from "@momentarise/shared";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BlockEditor } from "@/components/block-editor";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useItem, useUpdateItem } from "@/hooks/use-item";
import { Button } from "@/components/ui/button";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function InboxItemDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const itemId = typeof params.id === "string" ? params.id : null;

  const { data: item, isLoading } = useItem(itemId);
  const updateItem = useUpdateItem(itemId);
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

  if (!itemId) {
    return <p className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</p>;
  }

  if (isLoading || !item) {
    return <p className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</p>;
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
        {saveLabel ? (
          <span className="text-muted-foreground text-xs font-medium">{saveLabel}</span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 overflow-visible px-4 py-4">
        <div className="h-full min-h-[calc(100vh-16rem)] w-full overflow-visible bg-background">
          <BlockEditor
            key={item.id}
            editorKey={item.id}
            value={item.blocks}
            onChange={handleBlocksChange}
            editable
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
