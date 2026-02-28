"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Bot, CalendarDays, Camera, FileText, Link2, Mic, Plus, X } from "lucide-react";
import type { CaptureType } from "@momentarise/shared";
import { useCreateCapture } from "@/hooks/use-inbox";
import { useCreateItem } from "@/hooks/use-item";
import { Button } from "@/components/ui/button";

function fallbackCaptureContent(type: CaptureType): string {
  if (type === "voice") return "Voice capture";
  if (type === "photo") return "Photo capture";
  if (type === "link") return "Link capture";
  return "Quick capture";
}

export function CaptureFab() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [fabOpen, setFabOpen] = useState(false);
  const [fabProximity, setFabProximity] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  const createCapture = useCreateCapture();
  const createItem = useCreateItem();

  const isHidden = pathname?.startsWith("/sync");
  const isBusy = createCapture.isPending || createItem.isPending;

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const button = fabRef.current;
      if (!button) {
        setFabProximity(0);
        return;
      }
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
      const maxDistance = 220;
      const next = Math.max(0, Math.min(1, (maxDistance - distance) / maxDistance));
      setFabProximity(next);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    if (!fabOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFabOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fabOpen]);

  const createQuickCapture = useCallback(
    (captureType: CaptureType, channel?: string) => {
      createCapture.mutate(
        {
          raw_content: fallbackCaptureContent(captureType),
          source: "manual",
          capture_type: captureType,
          status: "captured",
          metadata: { source: "web_fab", channel: channel ?? captureType },
        },
        {
          onSuccess: () => {
            setFabOpen(false);
          },
        }
      );
    },
    [createCapture]
  );

  const createQuickNote = useCallback(() => {
    const title = `${t("pages.inbox.noteFallbackTitle")} ${new Date().toLocaleString()}`;
    createItem.mutate(
      {
        title,
        kind: "note",
        status: "draft",
        metadata: { source: "web_fab", channel: "note" },
        blocks: [],
      },
      {
        onSuccess: (item) => {
          setFabOpen(false);
          router.push(`/inbox/items/${item.id}`);
        },
      }
    );
  }, [createItem, router, t]);

  const handleChooseFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      createCapture.mutate(
        {
          raw_content: `File: ${file.name}`,
          source: "manual",
          capture_type: "text",
          status: "captured",
          metadata: {
            source: "web_fab",
            channel: "file",
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
          },
        },
        {
          onSuccess: () => {
            setFabOpen(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
          },
        }
      );
    },
    [createCapture]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const fabActions = useMemo(
    () => {
      const fr = (i18n.language || "").toLowerCase().startsWith("fr");
      return [
        { key: "note", icon: <FileText className="h-4 w-4" />, label: fr ? "Note" : "Note" },
        { key: "voice", icon: <Mic className="h-4 w-4" />, label: fr ? "Parler" : "Voice" },
        { key: "photo", icon: <Camera className="h-4 w-4" />, label: fr ? "Scan" : "Scan" },
        { key: "file", icon: <FileText className="h-4 w-4" />, label: fr ? "Fichier" : "File" },
        { key: "link", icon: <Link2 className="h-4 w-4" />, label: fr ? "Lien" : "Link" },
        { key: "event", icon: <CalendarDays className="h-4 w-4" />, label: fr ? "Événement" : "Event" },
        { key: "sync", icon: <Bot className="h-4 w-4" />, label: "Sync" },
      ];
    },
    [i18n.language]
  );

  const handleFabAction = useCallback(
    (key: string) => {
      if (key === "note") {
        createQuickNote();
        return;
      }
      if (key === "voice") {
        createQuickCapture("voice");
        return;
      }
      if (key === "photo") {
        createQuickCapture("photo");
        return;
      }
      if (key === "file") {
        openFilePicker();
        return;
      }
      if (key === "link") {
        createQuickCapture("link");
        return;
      }
      if (key === "event") {
        setFabOpen(false);
        router.push("/calendar");
        return;
      }
      if (key === "sync") {
        setFabOpen(false);
        router.push("/sync");
      }
    },
    [createQuickCapture, createQuickNote, openFilePicker, router]
  );

  if (isHidden) return null;

  return (
    <>
      {fabOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-background/10"
          aria-label={t("common.cancel")}
          onClick={() => setFabOpen(false)}
        />
      ) : null}

      <div className="pointer-events-none fixed bottom-8 right-8 z-40 h-[280px] w-[280px]">
        {fabActions.map((entry, index) => {
          const angleDeg = -90 + (index * 360) / fabActions.length;
          const angleRad = (angleDeg * Math.PI) / 180;
          const radius = 96;
          const center = 140;
          const itemSize = 64;
          const x = center + Math.cos(angleRad) * radius - itemSize / 2;
          const y = center + Math.sin(angleRad) * radius - itemSize / 2;
          return (
            <div
              key={entry.key}
              className={`absolute flex h-16 w-16 flex-col items-center justify-start gap-1 transition-all ${
                fabOpen ? "pointer-events-auto" : "pointer-events-none"
              }`}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: `scale(${fabOpen ? 1 : 0.7})`,
                opacity: fabOpen ? 1 : 0,
                transitionDuration: "260ms",
                transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
                transitionDelay: `${index * 24}ms`,
              }}
            >
              <button
                type="button"
                aria-label={entry.label}
                title={entry.label}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-background/95 shadow-md backdrop-blur"
                onClick={() => handleFabAction(entry.key)}
                disabled={isBusy}
              >
                {entry.icon}
              </button>
              <span className="rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium leading-none text-foreground/90 shadow-sm">
                {entry.label}
              </span>
            </div>
          );
        })}
      </div>

      <Button
        ref={fabRef}
        type="button"
        size="icon"
        className="fixed bottom-8 right-8 z-50 h-14 w-14 rounded-full text-primary-foreground backdrop-blur transition-all duration-300"
        style={{
          backgroundColor: fabOpen
            ? "hsl(var(--primary) / 0.95)"
            : `rgba(15, 23, 42, ${0.78 + fabProximity * 0.2})`,
          boxShadow: fabOpen
            ? "0 12px 30px hsl(var(--primary) / 0.38)"
            : `0 12px 30px rgba(15, 23, 42, ${0.24 + fabProximity * 0.24})`,
          transform: fabOpen ? "translate(-112px, -112px) scale(1.03)" : "translate(0px, 0px) scale(1)",
        }}
        onClick={() => setFabOpen((prev) => !prev)}
        aria-label={fabOpen ? t("common.cancel") : t("pages.inbox.add")}
        aria-expanded={fabOpen}
      >
        {fabOpen ? <X className="h-5 w-5" /> : <Plus className="h-6 w-6" />}
      </Button>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleChooseFile} />
    </>
  );
}
