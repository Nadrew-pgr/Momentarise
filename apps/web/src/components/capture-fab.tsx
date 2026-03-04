"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Bot, CalendarDays, Camera, FileImage, FileText, Link2, Loader2, Mic, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateCapture, useUploadCapture } from "@/hooks/use-inbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEV = typeof process !== "undefined" && process.env.NODE_ENV === "development";
function devLog(event: string, payload?: Record<string, unknown>) {
  if (DEV) {
    console.log("[capture_fab]", event, payload ?? "");
  }
}

export function CaptureFab() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [fabOpen, setFabOpen] = useState(false);
  const [fabProximity, setFabProximity] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);

  const createCapture = useCreateCapture();
  const uploadCapture = useUploadCapture();

  const isHidden = pathname?.startsWith("/sync");
  const isBusy = createCapture.isPending || uploadCapture.isPending || isRecording;

  const cleanupRecordingStream = useCallback(() => {
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
  }, []);

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

  useEffect(() => {
    if (!fabOpen && isRecording) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    }
  }, [fabOpen, isRecording]);

  useEffect(() => {
    return () => {
      cleanupRecordingStream();
    };
  }, [cleanupRecordingStream]);

  const createQuickNote = useCallback(() => {
    devLog("action_clicked", { key: "note" });
    setPendingActionKey("note");
    const title = `${t("pages.inbox.noteFallbackTitle")} ${new Date().toLocaleString()}`;
    createCapture.mutate(
      {
        raw_content: title,
        source: "note",
        capture_type: "text",
        status: "ready",
        metadata: { source: "web_fab", channel: "note", intent: "note" },
      },
      {
        onSuccess: (created) => {
          setPendingActionKey(null);
          setFabOpen(false);
          router.push(`/inbox/captures/${created.id}`);
        },
        onError: (error) => {
          setPendingActionKey(null);
          toast.error(error instanceof Error ? error.message : "Unable to create note");
        },
      }
    );
  }, [createCapture, router, t]);

  const handleChooseFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      devLog("upload_started", { channel: "file", file_name: file.name });
      uploadCapture.mutate(
        {
          file,
          captureType: "file",
          source: "manual",
          metadata: {
            source: "web_fab",
            channel: "file",
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
          },
        },
        {
          onSuccess: (created) => {
            setFabOpen(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            router.push(`/inbox/captures/${created.id}`);
          },
          onError: (error) => {
            devLog("upload_failed", { channel: "file", error: String(error) });
            toast.error(error instanceof Error ? error.message : "Unable to upload file");
          },
        }
      );
    },
    [router, uploadCapture]
  );

  const handleChoosePhoto = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      devLog("upload_started", { channel: "camera", file_name: file.name });
      uploadCapture.mutate(
        {
          file,
          captureType: "photo",
          source: "manual",
          metadata: {
            source: "web_fab",
            channel: "camera",
            intent: "scan_candidate",
            photo_mode: "document_candidate",
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
          },
        },
        {
          onSuccess: (created) => {
            setFabOpen(false);
            if (photoInputRef.current) photoInputRef.current.value = "";
            router.push(`/inbox/captures/${created.id}`);
          },
          onError: (error) => {
            devLog("upload_failed", { channel: "camera", error: String(error) });
            toast.error(error instanceof Error ? error.message : "Unable to upload photo");
          },
        }
      );
    },
    [router, uploadCapture]
  );

  const handleChooseGallery = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      devLog("upload_started", { channel: "gallery", file_name: file.name });
      uploadCapture.mutate(
        {
          file,
          captureType: "photo",
          source: "manual",
          metadata: {
            source: "web_fab",
            channel: "gallery",
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
          },
        },
        {
          onSuccess: (created) => {
            setFabOpen(false);
            if (galleryInputRef.current) galleryInputRef.current.value = "";
            router.push(`/inbox/captures/${created.id}`);
          },
          onError: (error) => {
            devLog("upload_failed", { channel: "gallery", error: String(error) });
            toast.error(error instanceof Error ? error.message : "Unable to upload photo");
          },
        }
      );
    },
    [router, uploadCapture]
  );

  const handleChooseAudio = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      devLog("upload_started", { channel: "voice_audio_file", file_name: file.name });
      uploadCapture.mutate(
        {
          file,
          captureType: "voice",
          source: "manual",
          metadata: {
            source: "web_fab",
            channel: "voice_audio_file",
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
          },
        },
        {
          onSuccess: (created) => {
            setFabOpen(false);
            if (audioInputRef.current) audioInputRef.current.value = "";
            router.push(`/inbox/captures/${created.id}`);
          },
          onError: (error) => {
            devLog("upload_failed", { channel: "voice_audio_file", error: String(error) });
            toast.error(error instanceof Error ? error.message : "Unable to upload voice");
          },
        }
      );
    },
    [router, uploadCapture]
  );

  const openFilePicker = useCallback(() => {
    devLog("picker_opened", { key: "file" });
    fileInputRef.current?.click();
  }, []);

  const openPhotoPicker = useCallback(() => {
    devLog("picker_opened", { key: "photo" });
    photoInputRef.current?.click();
  }, []);

  const openGalleryPicker = useCallback(() => {
    devLog("picker_opened", { key: "gallery" });
    galleryInputRef.current?.click();
  }, []);

  const openAudioPicker = useCallback(() => {
    devLog("picker_opened", { key: "audio" });
    audioInputRef.current?.click();
  }, []);

  const stopVoiceRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const uploadRecordedVoice = useCallback(
    (blob: Blob, mimeType: string) => {
      devLog("upload_started", { channel: "voice_media_recorder" });
      const extension = mimeType.includes("ogg")
        ? "ogg"
        : mimeType.includes("mp4")
          ? "m4a"
          : "webm";
      const fileName = `voice-${Date.now()}.${extension}`;
      const file = new File([blob], fileName, { type: mimeType || "audio/webm" });

      uploadCapture.mutate(
        {
          file,
          captureType: "voice",
          source: "manual",
          metadata: {
            source: "web_fab",
            channel: "voice_media_recorder",
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
          },
        },
        {
          onSuccess: (created) => {
            setFabOpen(false);
            router.push(`/inbox/captures/${created.id}`);
          },
          onError: (error) => {
            devLog("upload_failed", { channel: "voice_media_recorder", error: String(error) });
            toast.error(error instanceof Error ? error.message : "Unable to upload voice");
          },
        }
      );
    },
    [router, uploadCapture]
  );

  const startVoiceRecording = useCallback(async () => {
    const supportsRecording =
      typeof navigator !== "undefined" &&
      typeof MediaRecorder !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia);
    if (!supportsRecording) {
      openAudioPicker();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const chunks = recordingChunksRef.current;
        recordingChunksRef.current = [];
        mediaRecorderRef.current = null;
        setIsRecording(false);
        cleanupRecordingStream();
        if (!chunks.length) return;
        const resolvedMimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type: resolvedMimeType });
        if (blob.size > 0) {
          uploadRecordedVoice(blob, resolvedMimeType);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      cleanupRecordingStream();
      openAudioPicker();
    }
  }, [cleanupRecordingStream, openAudioPicker, uploadRecordedVoice]);

  const openLinkDialog = useCallback(() => {
    setLinkUrlInput("");
    setLinkDialogOpen(true);
  }, []);

  const submitLinkCapture = useCallback(() => {
    let value = linkUrlInput.trim();
    if (!value) return;
    if (!value.includes("://")) {
      value = `https://${value}`;
    }
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      toast.error(t("pages.inbox.linkUrlInvalid"));
      return;
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      toast.error(t("pages.inbox.linkUrlInvalid"));
      return;
    }
    devLog("action_clicked", { key: "link", url: url.toString() });
    setPendingActionKey("link");
    createCapture.mutate(
      {
        raw_content: url.toString(),
        source: "manual",
        capture_type: "link",
        status: "captured",
        metadata: { source: "web_fab", channel: "link" },
      },
      {
        onSuccess: () => {
          setPendingActionKey(null);
          setLinkDialogOpen(false);
          setLinkUrlInput("");
          setFabOpen(false);
          router.push("/inbox");
        },
        onError: (error) => {
          setPendingActionKey(null);
          toast.error(error instanceof Error ? error.message : "Unable to create link capture");
        },
      }
    );
  }, [createCapture, linkUrlInput, router, t]);

  const promptLinkCapture = useCallback(() => {
    openLinkDialog();
  }, [openLinkDialog]);

  const fabActions = useMemo(
    () => {
      const fr = (i18n.language || "").toLowerCase().startsWith("fr");
      return [
        { key: "note", icon: <FileText className="h-4 w-4" />, label: fr ? "Note" : "Note" },
        { key: "voice", icon: <Mic className="h-4 w-4" />, label: isRecording ? (fr ? "Stop" : "Stop") : fr ? "Parler" : "Voice" },
        { key: "photo", icon: <Camera className="h-4 w-4" />, label: fr ? "Caméra" : "Camera" },
        { key: "gallery", icon: <FileImage className="h-4 w-4" />, label: fr ? "Galerie" : "Gallery" },
        { key: "file", icon: <FileText className="h-4 w-4" />, label: fr ? "Fichier" : "File" },
        { key: "link", icon: <Link2 className="h-4 w-4" />, label: fr ? "Lien" : "Link" },
        { key: "event", icon: <CalendarDays className="h-4 w-4" />, label: fr ? "Événement" : "Event" },
        { key: "sync", icon: <Bot className="h-4 w-4" />, label: "Sync" },
      ];
    },
    [i18n.language, isRecording]
  );

  const handleFabAction = useCallback(
    (key: string) => {
      if (key !== "link") devLog("action_clicked", { key });
      if (key === "note") {
        createQuickNote();
        return;
      }
      if (key === "voice") {
        if (isRecording) {
          stopVoiceRecording();
        } else {
          void startVoiceRecording();
        }
        return;
      }
      if (key === "photo") {
        openPhotoPicker();
        return;
      }
      if (key === "gallery") {
        openGalleryPicker();
        return;
      }
      if (key === "file") {
        openFilePicker();
        return;
      }
      if (key === "link") {
        promptLinkCapture();
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
    [
      createQuickNote,
      openGalleryPicker,
      isRecording,
      openFilePicker,
      openPhotoPicker,
      promptLinkCapture,
      router,
      startVoiceRecording,
      stopVoiceRecording,
    ]
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
              className={`absolute flex flex-col items-center justify-start transition-all ${fabOpen ? "pointer-events-auto" : "pointer-events-none"
                }`}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${itemSize}px`,
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
                className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-full border border-border/80 bg-background/95 shadow-md backdrop-blur transition-colors hover:bg-muted/50 disabled:opacity-60"
                onClick={() => handleFabAction(entry.key)}
                disabled={isBusy}
              >
                {pendingActionKey === entry.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  entry.icon
                )}
                <span className="rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium leading-none text-foreground/90 shadow-sm">
                  {entry.label}
                </span>
              </button>
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
      <input
        ref={photoInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleChoosePhoto}
      />
      <input
        ref={galleryInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleChooseGallery}
      />
      <input
        ref={audioInputRef}
        type="file"
        className="hidden"
        accept="audio/*"
        onChange={handleChooseAudio}
      />

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("pages.inbox.quickCreateLink")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="link-url">{t("pages.inbox.linkUrlPlaceholder")}</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://…"
                value={linkUrlInput}
                onChange={(e) => setLinkUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitLinkCapture();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLinkDialogOpen(false);
                setLinkUrlInput("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={submitLinkCapture} disabled={!linkUrlInput.trim() || createCapture.isPending}>
              {createCapture.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("pages.inbox.linkSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
