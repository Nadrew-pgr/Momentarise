"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useCreateCapture, useUploadCapture } from "@/hooks/use-inbox";
import { useAppToast, useEventSheet } from "@/lib/store";

export type PickedAsset = {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
};

function defaultDraftEvent() {
  const start = new Date();
  const minutes = Math.ceil(start.getMinutes() / 15) * 15;
  start.setMinutes(minutes, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    description: "",
    location: "",
    start,
    end,
    allDay: false,
    color: "sky" as const,
  };
}

function isPermissionGranted(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (obj.granted === true) return true;
  if (obj.status === "granted") return true;
  return false;
}

export function useCreateActions(onClose: () => void) {
  const { t } = useTranslation();
  const router = useRouter();
  const openEventSheet = useEventSheet((s) => s.open);
  const createCapture = useCreateCapture();
  const uploadCapture = useUploadCapture();
  const showToast = useAppToast((s) => s.show);
  const [isRecording, setIsRecording] = useState(false);
  const voiceStopRef = useRef<null | (() => Promise<string | null>)>(null);

  const isBusy = createCapture.isPending || uploadCapture.isPending;

  const setUserError = useCallback(
    (message: string) => {
      showToast({ message });
    },
    [showToast]
  );

  const uploadSelectedAsset = useCallback(
    (asset: PickedAsset, captureType: "voice" | "photo" | "file", channel: string) => {
      const isCameraPhoto = captureType === "photo" && channel === "camera";
      uploadCapture.mutate(
        {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType ?? "application/octet-stream",
          captureType,
          source: "manual",
          metadata: {
            source: "mobile_fab",
            channel,
            file_name: asset.name,
            file_size: asset.size,
            mime_type: asset.mimeType,
            ...(isCameraPhoto
              ? {
                intent: "scan_candidate",
                photo_mode: "document_candidate",
              }
              : {}),
          },
        },
        {
          onSuccess: (created) => {
            onClose();
            router.push(`/inbox/${created.id}`);
          },
          onError: (error) => {
            setUserError(error instanceof Error ? error.message : t("create.error"));
          },
        }
      );
    },
    [onClose, router, setUserError, t, uploadCapture]
  );

  const pickDocument = useCallback(async (mimeType: string): Promise<PickedAsset | null> => {
    const moduleName = "expo-document-picker";
    const DocumentPicker = (await import(moduleName)) as {
      getDocumentAsync?: (options?: Record<string, unknown>) => Promise<unknown>;
    };
    if (typeof DocumentPicker.getDocumentAsync !== "function") {
      throw new Error("Document picker unavailable");
    }
    const result = (await DocumentPicker.getDocumentAsync({
      type: mimeType,
      multiple: false,
      copyToCacheDirectory: true,
    })) as {
      canceled?: boolean;
      assets?: Array<Record<string, unknown>>;
    };
    if (result?.canceled || !Array.isArray(result?.assets) || !result.assets.length) {
      return null;
    }
    const first = result.assets[0];
    const uri = typeof first.uri === "string" ? first.uri : null;
    if (!uri) return null;
    const name =
      typeof first.name === "string" && first.name.trim().length
        ? first.name
        : `capture-${Date.now()}`;
    return {
      uri,
      name,
      mimeType: typeof first.mimeType === "string" ? first.mimeType : undefined,
      size: typeof first.size === "number" ? first.size : undefined,
    };
  }, []);

  const stopVoiceCapture = useCallback(async () => {
    const stopper = voiceStopRef.current;
    voiceStopRef.current = null;
    setIsRecording(false);
    if (!stopper) return;
    try {
      const uri = await stopper();
      if (!uri) {
        setUserError("Voice recording completed but no audio file was returned.");
        return;
      }
      uploadSelectedAsset(
        { uri, name: `voice-${Date.now()}.m4a`, mimeType: "audio/m4a" },
        "voice",
        "voice_recording"
      );
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t("create.error"));
    }
  }, [setUserError, t, uploadSelectedAsset]);

  const openNoteCapture = useCallback(() => {
    createCapture.mutate(
      {
        raw_content: t("create.defaultNoteTitle"),
        source: "note",
        capture_type: "text",
        status: "ready",
        metadata: { source: "mobile_fab", channel: "note", intent: "note" },
      },
      {
        onSuccess: (created) => {
          onClose();
          router.push(`/inbox/${created.id}`);
        },
        onError: (error) => {
          setUserError(error instanceof Error ? error.message : t("create.error"));
        },
      }
    );
  }, [createCapture, onClose, router, setUserError, t]);

  const openSync = useCallback(() => {
    onClose();
    router.push("/sync");
  }, [onClose, router]);

  const openEvent = useCallback(() => {
    onClose();
    openEventSheet(defaultDraftEvent());
    router.push("/(tabs)/timeline");
  }, [onClose, openEventSheet, router]);

  const openFileCapture = useCallback(async () => {
    try {
      const picked = await pickDocument("*/*");
      if (!picked) return;
      uploadSelectedAsset(picked, "file", "file_picker");
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t("create.error"));
    }
  }, [pickDocument, setUserError, t, uploadSelectedAsset]);

  const openPhotoCapture = useCallback(async () => {
    try {
      const moduleName = "expo-image-picker";
      const ImagePicker = (await import(moduleName)) as {
        requestCameraPermissionsAsync?: () => Promise<unknown>;
        launchCameraAsync?: (options?: Record<string, unknown>) => Promise<unknown>;
      };
      if (typeof ImagePicker.requestCameraPermissionsAsync === "function") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!isPermissionGranted(permission)) {
          setUserError("Camera permission is required to capture a photo.");
          return;
        }
      }
      if (typeof ImagePicker.launchCameraAsync !== "function") {
        throw new Error("Camera capture unavailable");
      }
      const result = (await ImagePicker.launchCameraAsync({ quality: 0.9 })) as {
        canceled?: boolean;
        assets?: Array<Record<string, unknown>>;
      };
      if (result?.canceled || !Array.isArray(result?.assets) || !result.assets.length) return;
      const first = result.assets[0];
      const uri = typeof first.uri === "string" ? first.uri : null;
      if (!uri) {
        setUserError("Invalid image capture.");
        return;
      }
      uploadSelectedAsset(
        {
          uri,
          name:
            typeof first.fileName === "string" && first.fileName.length
              ? first.fileName
              : `photo-${Date.now()}.jpg`,
          mimeType: typeof first.mimeType === "string" ? first.mimeType : "image/jpeg",
          size: typeof first.fileSize === "number" ? first.fileSize : undefined,
        },
        "photo",
        "camera"
      );
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t("create.error"));
    }
  }, [setUserError, t, uploadSelectedAsset]);

  const openPhotoLibraryCapture = useCallback(async () => {
    try {
      const moduleName = "expo-image-picker";
      const ImagePicker = (await import(moduleName)) as {
        requestMediaLibraryPermissionsAsync?: () => Promise<unknown>;
        launchImageLibraryAsync?: (options?: Record<string, unknown>) => Promise<unknown>;
      };
      if (typeof ImagePicker.requestMediaLibraryPermissionsAsync === "function") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!isPermissionGranted(permission)) {
          setUserError("Media library permission is required to pick a photo.");
          return;
        }
      }
      if (typeof ImagePicker.launchImageLibraryAsync !== "function") {
        throw new Error("Gallery picker unavailable");
      }
      const result = (await ImagePicker.launchImageLibraryAsync({ quality: 0.9 })) as {
        canceled?: boolean;
        assets?: Array<Record<string, unknown>>;
      };
      if (result?.canceled || !Array.isArray(result?.assets) || !result.assets.length) return;
      const first = result.assets[0];
      const uri = typeof first.uri === "string" ? first.uri : null;
      if (!uri) {
        setUserError("Invalid gallery image selection.");
        return;
      }
      uploadSelectedAsset(
        {
          uri,
          name:
            typeof first.fileName === "string" && first.fileName.length
              ? first.fileName
              : `gallery-${Date.now()}.jpg`,
          mimeType: typeof first.mimeType === "string" ? first.mimeType : "image/jpeg",
          size: typeof first.fileSize === "number" ? first.fileSize : undefined,
        },
        "photo",
        "gallery"
      );
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t("create.error"));
    }
  }, [setUserError, t, uploadSelectedAsset]);

  const openVoiceFileFallback = useCallback(async () => {
    try {
      const picked = await pickDocument("audio/*");
      if (!picked) return;
      uploadSelectedAsset(picked, "voice", "voice_file_fallback");
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t("create.error"));
    }
  }, [pickDocument, setUserError, t, uploadSelectedAsset]);

  const startVoiceCapture = useCallback(async () => {
    const tryExpoAudio = async (): Promise<(() => Promise<string | null>)> => {
      const moduleName = "expo-audio";
      const audioModule = (await import(moduleName)) as Record<string, unknown>;
      const requestPermission =
        (audioModule.requestRecordingPermissionsAsync as (() => Promise<unknown>) | undefined) ??
        ((audioModule.AudioModule as Record<string, unknown> | undefined)
          ?.requestRecordingPermissionsAsync as (() => Promise<unknown>) | undefined);
      if (typeof requestPermission !== "function") {
        throw new Error("expo-audio permission API unavailable");
      }
      const permission = await requestPermission();
      if (!isPermissionGranted(permission)) throw new Error("Microphone permission denied");
      const setAudioMode =
        (audioModule.setAudioModeAsync as ((config: Record<string, unknown>) => Promise<void>) | undefined) ??
        ((audioModule.AudioModule as Record<string, unknown> | undefined)
          ?.setAudioModeAsync as ((config: Record<string, unknown>) => Promise<void>) | undefined);
      if (typeof setAudioMode === "function") {
        await setAudioMode({
          allowsRecording: true,
          playsInSilentMode: true,
          playsInSilentModeIOS: true,
        });
      }
      let recorder: Record<string, unknown> | null = null;
      const moduleCreate = audioModule.createAudioRecorder as
        | ((config?: Record<string, unknown>) => Promise<Record<string, unknown>>)
        | undefined;
      const audioModuleCreate = (audioModule.AudioModule as Record<string, unknown> | undefined)
        ?.createAudioRecorder as
        | ((config?: Record<string, unknown>) => Promise<Record<string, unknown>>)
        | undefined;
      if (typeof moduleCreate === "function") {
        recorder = await moduleCreate();
      } else if (typeof audioModuleCreate === "function") {
        recorder = await audioModuleCreate();
      } else {
        const AudioRecorderCtor = audioModule.AudioRecorder as
          | (new (...args: unknown[]) => Record<string, unknown>)
          | undefined;
        if (AudioRecorderCtor) recorder = new AudioRecorderCtor();
      }
      if (!recorder) throw new Error("expo-audio recorder unavailable");
      const prepare =
        (recorder.prepareToRecordAsync as (() => Promise<void>) | undefined) ??
        (recorder.prepareAsync as (() => Promise<void>) | undefined);
      if (typeof prepare === "function") await prepare.call(recorder);
      const start =
        (recorder.record as (() => Promise<void> | void) | undefined) ??
        (recorder.startAsync as (() => Promise<void>) | undefined) ??
        (recorder.start as (() => Promise<void> | void) | undefined);
      if (typeof start !== "function") throw new Error("expo-audio record API unavailable");
      await start.call(recorder);
      return async () => {
        const stop =
          (recorder?.stop as (() => Promise<void> | void) | undefined) ??
          (recorder?.stopAsync as (() => Promise<void>) | undefined) ??
          (recorder?.stopAndUnloadAsync as (() => Promise<void>) | undefined);
        if (typeof stop === "function") await stop.call(recorder);
        const uri =
          (recorder?.uri as string | undefined) ??
          (typeof recorder?.getURI === "function" ? (recorder.getURI as () => string | null)() : null);
        return typeof uri === "string" ? uri : null;
      };
    };

    const tryExpoAv = async (): Promise<(() => Promise<string | null>)> => {
      const moduleName = "expo-av";
      const avModule = (await import(moduleName)) as {
        Audio?: {
          requestPermissionsAsync?: () => Promise<unknown>;
          setAudioModeAsync?: (config: Record<string, unknown>) => Promise<void>;
          Recording?: new () => {
            prepareToRecordAsync: (options: Record<string, unknown>) => Promise<void>;
            startAsync: () => Promise<void>;
            stopAndUnloadAsync: () => Promise<void>;
            getURI: () => string | null;
          };
          RecordingOptionsPresets?: { HIGH_QUALITY?: Record<string, unknown> };
        };
      };
      const Audio = avModule.Audio;
      if (!Audio?.requestPermissionsAsync || !Audio.Recording) {
        throw new Error("expo-av recording API unavailable");
      }
      const permission = await Audio.requestPermissionsAsync();
      if (!isPermissionGranted(permission)) throw new Error("Microphone permission denied");
      if (Audio.setAudioModeAsync) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets?.HIGH_QUALITY ?? {});
      await recording.startAsync();
      return async () => {
        await recording.stopAndUnloadAsync();
        return recording.getURI();
      };
    };

    try {
      voiceStopRef.current = await tryExpoAudio();
      setIsRecording(true);
      return;
    } catch {
      // fallback
    }
    try {
      voiceStopRef.current = await tryExpoAv();
      setIsRecording(true);
    } catch {
      await openVoiceFileFallback();
    }
  }, [openVoiceFileFallback]);

  const handleVoiceCapture = useCallback(() => {
    if (isRecording) {
      void stopVoiceCapture();
      return;
    }
    void startVoiceCapture();
  }, [isRecording, startVoiceCapture, stopVoiceCapture]);

  const submitLinkCapture = useCallback(
    (linkValue: string) => {
      let value = linkValue.trim();
      if (!value) return;
      if (!value.includes("://")) value = `https://${value}`;
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        setUserError("Invalid URL format.");
        return;
      }
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setUserError("Only http(s) links are supported.");
        return;
      }
      createCapture.mutate(
        {
          raw_content: parsed.toString(),
          source: "manual",
          capture_type: "link",
          status: "captured",
          metadata: { source: "mobile_fab", channel: "link" },
        },
        {
          onSuccess: () => {
            onClose();
            router.push("/inbox");
          },
          onError: (error) => {
            setUserError(error instanceof Error ? error.message : t("create.error"));
          },
        }
      );
    },
    [createCapture, onClose, router, setUserError, t]
  );

  return {
    openNoteCapture,
    openSync,
    openEvent,
    openFileCapture,
    openPhotoCapture,
    openPhotoLibraryCapture,
    startVoiceCapture,
    stopVoiceCapture,
    handleVoiceCapture,
    submitLinkCapture,
    isBusy,
    isRecording,
  };
}
