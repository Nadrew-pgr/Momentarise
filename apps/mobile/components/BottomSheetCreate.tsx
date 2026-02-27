import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Bot, Camera, FileText, Link2, Mic } from "lucide-react-native";
import type { CaptureType } from "@momentarise/shared";
import { useCreateCapture } from "@/hooks/use-inbox";
import { useCreateItem } from "@/hooks/use-item";
import { useCreateSheet } from "@/lib/store";

function CaptureOption({
  label,
  subtitle,
  icon,
  onPress,
  translucent,
  disabled,
}: {
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress?: () => void;
  translucent?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-xl border px-3 py-3 ${
        translucent ? "border-border/60 bg-card/60" : "border-border bg-card"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-background">
          {icon}
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">{label}</Text>
          <Text className="text-xs text-muted-foreground">{subtitle}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function BottomSheetCreate() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isOpen, openNonce, close } = useCreateSheet();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%"], []);
  const createCapture = useCreateCapture();
  const createItem = useCreateItem();
  const [actionError, setActionError] = useState<string | null>(null);
  const isBusy = createCapture.isPending || createItem.isPending;

  useEffect(() => {
    if (isOpen) {
      setActionError(null);
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen, openNonce]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) close();
    },
    [close]
  );

  const openNoteCapture = useCallback(() => {
    setActionError(null);
    createItem.mutate(
      {
        title: t("create.defaultNoteTitle"),
        kind: "note",
        status: "draft",
        metadata: { source: "mobile_plus", channel: "note" },
        blocks: [],
      },
      {
        onSuccess: (item) => {
          close();
          router.push(`/items/${item.id}`);
        },
        onError: (error) => {
          setActionError(
            error instanceof Error ? error.message : t("create.error")
          );
        },
      }
    );
  }, [close, createItem, router, t]);

  const openCapture = useCallback(
    (captureType: CaptureType) => {
      setActionError(null);
      createCapture.mutate(
        {
          raw_content: "",
          source: "manual",
          capture_type: captureType,
          status: "captured",
          metadata: { source: "mobile_plus", channel: captureType },
        },
        {
          onSuccess: () => {
            close();
            router.push("/inbox");
          },
          onError: (error) => {
            setActionError(
              error instanceof Error ? error.message : t("create.error")
            );
          },
        }
      );
    },
    [close, createCapture, router, t]
  );

  const openSync = useCallback(() => {
    close();
    router.push("/sync");
  }, [close, router]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: "#ffffffee" }}
      handleIndicatorStyle={{ backgroundColor: "#a3a3a3" }}
    >
      <BottomSheetView className="flex-1 px-4 pb-4 pt-2">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">{t("create.title")}</Text>
          <Pressable onPress={close} className="rounded border border-input px-2 py-1">
            <Text className="text-xs text-muted-foreground">{t("pages.inbox.cancel")}</Text>
          </Pressable>
          {isBusy ? (
            <Text className="text-xs text-muted-foreground">{t("create.working")}</Text>
          ) : null}
        </View>
        {actionError ? (
          <View className="mb-3 rounded-lg border border-destructive bg-destructive/10 px-3 py-2">
            <Text className="text-xs text-destructive">{actionError}</Text>
          </View>
        ) : null}

        <View className="gap-2">
          <CaptureOption
            label={t("create.options.note.title")}
            subtitle={t("create.options.note.subtitle")}
            icon={<FileText size={18} color="#171717" />}
            onPress={openNoteCapture}
            disabled={isBusy}
          />
          <CaptureOption
            label={t("create.options.voice.title")}
            subtitle={t("create.options.voice.subtitle")}
            icon={<Mic size={18} color="#171717" />}
            onPress={() => openCapture("voice")}
            translucent
            disabled={isBusy}
          />
          <CaptureOption
            label={t("create.options.photo.title")}
            subtitle={t("create.options.photo.subtitle")}
            icon={<Camera size={18} color="#171717" />}
            onPress={() => openCapture("photo")}
            translucent
            disabled={isBusy}
          />
          <CaptureOption
            label={t("create.options.link.title")}
            subtitle={t("create.options.link.subtitle")}
            icon={<Link2 size={18} color="#171717" />}
            onPress={() => openCapture("link")}
            translucent
            disabled={isBusy}
          />
          <CaptureOption
            label={t("create.options.sync.title")}
            subtitle={t("create.options.sync.subtitle")}
            icon={<Bot size={18} color="#171717" />}
            onPress={openSync}
            translucent
            disabled={isBusy}
          />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
