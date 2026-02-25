"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Inbox as InboxIcon, Plus } from "lucide-react";
import { useCreateCapture, useInbox, useProcessCapture } from "@/hooks/use-inbox";
import { useItems } from "@/hooks/use-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InboxPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [newCaptureText, setNewCaptureText] = useState("");
  const [processingCaptureId, setProcessingCaptureId] = useState<string | null>(null);
  const [processingTitle, setProcessingTitle] = useState("");

  const { data: inboxData, isLoading: inboxLoading } = useInbox();
  const { data: itemsData, isLoading: itemsLoading } = useItems();
  const createCapture = useCreateCapture();
  const processCapture = useProcessCapture();

  const captures = inboxData?.captures ?? [];
  const items = itemsData?.items ?? [];

  const handleAddCapture = useCallback(() => {
    const text = newCaptureText.trim();
    if (!text) return;
    createCapture.mutate(
      { raw_content: text },
      {
        onSuccess: () => setNewCaptureText(""),
      }
    );
  }, [createCapture, newCaptureText]);

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

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pr-1">
          <div className="flex flex-col gap-2">
            {inboxLoading ? (
              <p className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</p>
            ) : captures.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("pages.inbox.emptyList")}</p>
            ) : (
              captures.map((capture) => (
                <Card key={capture.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <p className="line-clamp-2 text-sm">{capture.raw_content}</p>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-8 text-xs"
                        onClick={() => handleStartProcess(capture.id)}
                      >
                        {t("pages.inbox.process")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
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
