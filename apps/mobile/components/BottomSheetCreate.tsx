import { useCallback, useMemo, useRef, useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { FileText, Camera, Mic, Link2 } from "lucide-react-native";
import { useCreateSheet } from "@/lib/store";

function CaptureOption({
  label,
  subtitle,
  disabled,
  icon,
  onPress,
}: {
  label: string;
  subtitle: string;
  disabled?: boolean;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-xl border px-3 py-3 ${disabled ? "border-border/50 bg-card/40 opacity-60" : "border-border bg-card"}`}
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
  const { isOpen, close } = useCreateSheet();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["48%"], []);

  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) close();
    },
    [close]
  );

  const openNoteCapture = useCallback(() => {
    close();
    router.push("/(tabs)/create");
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
        </View>

        <View className="gap-2">
          <CaptureOption
            label={t("create.options.note.title")}
            subtitle={t("create.options.note.subtitle")}
            icon={<FileText size={18} color="#171717" />}
            onPress={openNoteCapture}
          />
          <CaptureOption
            label={t("create.options.photo.title")}
            subtitle={t("create.options.photo.subtitle")}
            icon={<Camera size={18} color="#71717a" />}
            disabled
          />
          <CaptureOption
            label={t("create.options.voice.title")}
            subtitle={t("create.options.voice.subtitle")}
            icon={<Mic size={18} color="#71717a" />}
            disabled
          />
          <CaptureOption
            label={t("create.options.link.title")}
            subtitle={t("create.options.link.subtitle")}
            icon={<Link2 size={18} color="#71717a" />}
            disabled
          />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

