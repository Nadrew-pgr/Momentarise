"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Inbox as InboxIcon, Plus } from "lucide-react";
import type { CaptureType } from "@momentarise/shared";
import {
  useApplyCapture,
  useCreateCapture,
  usePreviewCapture,
  useProcessCapture,
} from "@/hooks/use-inbox";
import { useCreateItem, useItems } from "@/hooks/use-item";
import { useInbox } from "@/hooks/use-inbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const captureModes: Array<{ value: CaptureType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "voice", label: "Voice" },
  { value: "photo", label: "Photo" },
  { value: "link", label: "Link" },
];

export default function InboxPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [newCaptureText, setNewCaptureText] = useState("");
  const [captureMode, setCaptureMode] = useState<CaptureType>("text");
  const [processingCaptureId, setProcessingCaptureId] = useState<string | null>(null);
  const [processingTitle, setProcessingTitle] = useState("");
  const [previewByCaptureId, setPreviewByCaptureId] = useState<
    Record<string, { suggested_title: string; suggested_kind: string; reason: string }>
  >({});

  const { data: inboxData, isLoading: inboxLoading } = useInbox();
  const { data: itemsData, isLoading: itemsLoading } = useItems();
  const createCapture = useCreateCapture();
  const createItem = useCreateItem();
  const previewCapture = usePreviewCapture();
  const applyCapture = useApplyCapture();
  const processCapture = useProcessCapture();

  const captures = inboxData?.captures ?? [];
  const items = itemsData?.items ?? [];

  const handleCreate = useCallback(() => {
    const text = newCaptureText.trim();
    if (captureMode === "text") {
      createItem.mutate(
        {
          title: text || `Note ${new Date().toLocaleString()}`,
          kind: "note",
          status: "draft",
          metadata: { source: "web_plus", capture_mode: captureMode },
          blocks: [],
        },
        {
          onSuccess: (item) => {
            setNewCaptureText("");
            router.push(`/inbox/items/${item.id}`);
          },
        }
      );
      return;
    }

    createCapture.mutate(
      {
        raw_content: text,
        source: "manual",
        capture_type: captureMode,
        status: "captured",
        metadata: { source: "web_plus", capture_mode: captureMode },
      },
      {
        onSuccess: () => setNewCaptureText(""),
      }
    );
  }, [captureMode, createCapture, createItem, newCaptureText, router]);

  const handleStartProcess = useCallback((captureId: string) => {
    setProcessingCaptureId(captureId);
    setProcessingTitle("");
  }, []);

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

  const isCreating =
    createCapture.isPending || createItem.isPending || applyCapture.isPending;
  const createLabel =
    captureMode === "text" ? t("pages.inbox.createNote") : t("pages.inbox.add");

  let recentItemsContent: ReactNode;
  if (itemsLoading) {
    recentItemsContent = <p className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</p>;
  } else if (items.length === 0) {
    recentItemsContent = <p className="text-muted-foreground text-sm">{t("pages.inbox.emptyItems")}</p>;
  } else {
    recentItemsContent = (
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <Button
            key={item.id}
            variant="outline"
            className="h-auto justify-between px-3 py-2"
            onClick={() => router.push(`/inbox/items/${item.id}`)}
          >
            <span className="truncate text-left text-sm">{item.title}</span>
            <span className="text-muted-foreground ml-4 text-xs">
              {new Date(item.updated_at).toLocaleString()}
            </span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 gap-6">
      <aside className="flex w-80 shrink-0 flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("pages.inbox.title")}</h2>

        <div className="grid grid-cols-2 gap-2">
          {captureModes.map((mode) => (
            <Button
              key={mode.value}
              type="button"
              variant={captureMode === mode.value ? "default" : "outline"}
              size="sm"
              onClick={() => setCaptureMode(mode.value)}
            >
              {mode.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder={t("pages.inbox.addPlaceholder")}
            value={newCaptureText}
            onChange={(e) => setNewCaptureText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1"
          />
          <Button
            type="button"
            size="icon"
            onClick={handleCreate}
            disabled={isCreating}
            aria-label={createLabel}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pr-1">
          <div className="flex flex-col gap-2">
            {inboxLoading ? (
              <p className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</p>
            ) : captures.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("pages.inbox.emptyList")}</p>
            ) : (
              captures.map((capture) => {
                const preview = previewByCaptureId[capture.id];
                return (
                  <Card key={capture.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-xs uppercase">
                          {capture.capture_type}
                        </span>
                        <span className="text-muted-foreground text-xs">{capture.status}</span>
                      </div>
                      <p className="line-clamp-2 text-sm">
                        {capture.raw_content || t("pages.inbox.emptyCapture")}
                      </p>
                      {preview ? (
                        <div className="mt-2 rounded border border-border bg-muted/40 p-2">
                          <p className="text-xs font-medium">
                            {preview.suggested_title} ({preview.suggested_kind})
                          </p>
                          <p className="text-muted-foreground text-xs">{preview.reason}</p>
                        </div>
                      ) : null}

                      {processingCaptureId === capture.id ? (
                        <div className="mt-2 flex flex-col gap-2">
                          <Label htmlFor={`title-${capture.id}`} className="text-xs">
                            {t("pages.inbox.processTitle")}
                          </Label>
                          <Input
                            id={`title-${capture.id}`}
                            value={processingTitle}
                            onChange={(e) => setProcessingTitle(e.target.value)}
                            placeholder={t("pages.item.title")}
                            className="h-8 text-sm"
                          />
                          <div className="flex gap-2">
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
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(capture.id)}
                            disabled={previewCapture.isPending}
                          >
                            {t("pages.inbox.preview")}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApply(capture.id)}
                            disabled={applyCapture.isPending}
                          >
                            {t("pages.inbox.apply")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartProcess(capture.id)}
                          >
                            {t("pages.inbox.process")}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-semibold">{t("pages.inbox.recentItems")}</h3>
            {recentItemsContent}
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 items-center justify-center rounded-lg border border-dashed border-border px-8 py-10 text-center">
        <div className="flex max-w-md flex-col items-center gap-3">
          <InboxIcon className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground text-sm">{t("pages.item.noItemSelected")}</p>
        </div>
      </main>
    </div>
  );
}
