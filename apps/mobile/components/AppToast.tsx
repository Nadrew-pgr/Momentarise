import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppToast } from "@/lib/store";

export function AppToast() {
  const { t } = useTranslation();
  const {
    visible,
    message,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
    hide,
  } = useAppToast();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      hide();
    }, 5000);
    return () => clearTimeout(timer);
  }, [hide, visible]);

  if (!visible) return null;

  return (
    <View className="pointer-events-box-none absolute inset-x-0 bottom-24 z-50 px-4">
      <View className="rounded-xl border border-border bg-card/95 px-3 py-3 shadow-md">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-sm text-foreground">{message}</Text>
          <View className="flex-row items-center gap-2">
            {actionLabel && onAction ? (
              <Pressable
                onPress={() => {
                  onAction();
                  hide();
                }}
                className="rounded border border-input px-2.5 py-1.5"
              >
                <Text className="text-xs font-medium text-foreground">{actionLabel}</Text>
              </Pressable>
            ) : null}
            {secondaryActionLabel && onSecondaryAction ? (
              <Pressable
                onPress={() => {
                  onSecondaryAction();
                  hide();
                }}
                className="rounded border border-input px-2.5 py-1.5"
              >
                <Text className="text-xs font-medium text-foreground">{secondaryActionLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={hide} className="rounded border border-input px-2.5 py-1.5">
              <Text className="text-xs text-muted-foreground">{t("common.ok")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
