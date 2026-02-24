"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Inbox as InboxIcon, Plus } from "lucide-react";
import { useInbox, useCreateCapture, useProcessCapture } from "@/hooks/use-inbox";
import { useItem, useUpdateItem } from "@/hooks/use-item";
import { BlockEditor } from "@/components/block-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Block } from "@blocknote/core";

export default function InboxPage() {
  const { t } = useTranslation();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [newCaptureText, setNewCaptureText] = useState("");
  const [processingCaptureId, setProcessingCaptureId] = useState<string | null>(null);
  const [processingTitle, setProcessingTitle] = useState("");

  const { data: inboxData, isLoading: inboxLoading } = useInbox();
  const createCapture = useCreateCapture();
  const processCapture = useProcessCapture();
  const { data: itemData, isLoading: itemLoading } = useItem(selectedItemId);
  const updateItem = useUpdateItem(selectedItemId);

  const captures = inboxData?.captures ?? [];

  const handleAddCapture = useCallback(() => {
    const text = newCaptureText.trim();
    if (!text) return;
    createCapture.mutate(
      { raw_content: text },
      {
        onSuccess: () => setNewCaptureText(""),
      }
    );
  }, [newCaptureText, createCapture]);

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
          setSelectedItemId(res.item_id);
          setProcessingCaptureId(null);
          setProcessingTitle("");
        },
      }
    );
  }, [processingCaptureId, processingTitle, processCapture]);

  const handleBlocksChange = useCallback(
    (blocks: Block[]) => {
      if (!selectedItemId) return;
      updateItem.mutate({ blocks: blocks as unknown as Record<string, unknown>[] });
    },
    [selectedItemId, updateItem]
  );

  return (
    <div className="flex h-full flex-1 gap-6">
      {/* Column 2: Inbox list */}
      <aside className="flex w-80 shrink-0 flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("pages.inbox.title")}</h2>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={t("pages.inbox.addPlaceholder")}
            value={newCaptureText}
            onChange={(e) => setNewCaptureText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCapture()}
            className="flex-1"
          />
          <Button
            type="button"
            size="icon"
            onClick={handleAddCapture}
            disabled={!newCaptureText.trim() || createCapture.isPending}
            aria-label={t("pages.inbox.add")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-1 flex-col gap-2 overflow-auto">
          {inboxLoading ? (
            <p className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</p>
          ) : captures.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("pages.inbox.emptyList")}</p>
          ) : (
            captures.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <p className="line-clamp-2 text-sm">{c.raw_content}</p>
                  {processingCaptureId === c.id ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <Label htmlFor={`title-${c.id}`} className="text-xs">
                        {t("pages.inbox.processTitle")}
                      </Label>
                      <Input
                        id={`title-${c.id}`}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 text-xs"
                      onClick={() => handleStartProcess(c.id)}
                    >
                      {t("pages.inbox.process")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </aside>

      {/* Column 3: Item detail */}
      <main className="min-w-0 flex-1">
        {!selectedItemId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
            <InboxIcon className="text-muted-foreground h-12 w-12" />
            <p className="text-muted-foreground max-w-sm">{t("pages.item.noItemSelected")}</p>
          </div>
        ) : itemLoading || !itemData ? (
          <p className="text-muted-foreground py-8 text-sm">{t("pages.inbox.placeholder")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-2">
                <h3 className="text-base font-medium">{itemData.title}</h3>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="min-h-[200px] rounded-md border border-input bg-background">
                  <BlockEditor
                    key={selectedItemId}
                    editorKey={selectedItemId}
                    value={itemData.blocks}
                    onChange={handleBlocksChange}
                    editable={!updateItem.isPending}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
