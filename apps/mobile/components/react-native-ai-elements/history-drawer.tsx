import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { EllipsisVertical, X, Clock3 } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { SyncRunSummary } from "@momentarise/shared";
import { AnchoredMenu, type AnchoredMenuAnchor } from "@/components/ui/anchored-menu";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRun: (runId: string) => void;
  onOpenRun?: (run: SyncRunSummary) => void;
  onRenameRun?: (run: SyncRunSummary) => void;
  onDeleteRun?: (run: SyncRunSummary) => void;
  currentRunId: string | null;
  runs: SyncRunSummary[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function runTitle(run: SyncRunSummary): string {
  if (run.title && run.title.trim()) return run.title;
  if (run.last_message_preview && run.last_message_preview.trim()) return run.last_message_preview;
  return run.id.slice(0, 8);
}

export function HistoryDrawer({
  isOpen,
  onClose,
  onSelectRun,
  onOpenRun,
  onRenameRun,
  onDeleteRun,
  currentRunId,
  runs = [],
  isLoading = false,
  errorMessage = null,
  onRetry,
}: HistoryDrawerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerWidth = useMemo(() => Math.min(width * 0.88, 420), [width]);
  const translateX = useSharedValue(drawerWidth);
  const [mounted, setMounted] = useState(isOpen);
  const [runMenuAnchor, setRunMenuAnchor] = useState<AnchoredMenuAnchor | null>(null);
  const [runMenuTarget, setRunMenuTarget] = useState<SyncRunSummary | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      return;
    }
    setRunMenuTarget(null);
    setRunMenuAnchor(null);
  }, [isOpen]);

  useEffect(() => {
    translateX.value = withTiming(
      isOpen ? 0 : drawerWidth,
      {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished && !isOpen) {
          runOnJS(setMounted)(false);
        }
      }
    );
  }, [drawerWidth, isOpen, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - translateX.value / drawerWidth,
  }));

  const openRunMenu = useCallback((run: SyncRunSummary, event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    setRunMenuTarget(run);
    setRunMenuAnchor({
      x: pageX - 20,
      y: pageY - 20,
      width: 40,
      height: 40,
    });
  }, []);

  const closeRunMenu = useCallback(() => {
    setRunMenuTarget(null);
    setRunMenuAnchor(null);
  }, []);

  const runMenuItems = useMemo(() => {
    if (!runMenuTarget) return [];
    return [
      {
        key: "open",
        label: t("pages.sync.menu.openConversation"),
        onPress: () => {
          if (onOpenRun) onOpenRun(runMenuTarget);
          else onSelectRun(runMenuTarget.id);
          onClose();
        },
      },
      {
        key: "rename",
        label: t("pages.sync.menu.rename"),
        onPress: () => onRenameRun?.(runMenuTarget),
      },
      {
        key: "delete",
        label: t("pages.sync.menu.delete"),
        destructive: true,
        onPress: () => onDeleteRun?.(runMenuTarget),
      },
    ];
  }, [onClose, onDeleteRun, onOpenRun, onRenameRun, onSelectRun, runMenuTarget, t]);

  if (!mounted) return null;

  return (
    <View className="absolute inset-0 z-50" pointerEvents="box-none" style={{ elevation: 50 }}>
      <Animated.View
        pointerEvents={isOpen ? "auto" : "none"}
        style={[{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }, backdropStyle]}
      >
        <View className="absolute inset-0 bg-black/45" />
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View
        pointerEvents={isOpen ? "auto" : "none"}
        style={[
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: drawerWidth,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
          animatedStyle,
        ]}
      >
        <View className="flex-1 border-l border-border bg-background">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
            <Text className="text-lg font-semibold text-foreground">{t("pages.sync.history.title")}</Text>
            <TouchableOpacity onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full">
              <X size={18} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-3">
            {isLoading ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="small" />
              </View>
            ) : errorMessage ? (
              <View className="mx-1 mt-3 rounded-xl border border-destructive/25 bg-destructive/5 p-3">
                <Text className="text-sm text-destructive">{errorMessage}</Text>
                {onRetry ? (
                  <TouchableOpacity
                    onPress={onRetry}
                    className="mt-3 self-start rounded-md border border-input px-3 py-1.5"
                  >
                    <Text className="text-sm text-foreground">{t("common.retry")}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : runs.length === 0 ? (
              <Text className="p-4 text-center text-muted-foreground">{t("pages.sync.history.empty")}</Text>
            ) : (
              <View className="gap-3 pb-8 pt-3">
                {runs.map((run) => (
                  <View
                    key={run.id}
                    className={`w-full rounded-2xl border p-3 ${
                      run.id === currentRunId
                        ? "border-primary/35 bg-primary/5"
                        : "border-border/70 bg-card/30"
                    }`}
                  >
                    <TouchableOpacity
                      className="pr-10"
                      onPress={() => {
                        onSelectRun(run.id);
                        onClose();
                      }}
                    >
                      <Text className="text-[14px] font-medium text-foreground" numberOfLines={1}>
                        {runTitle(run)}
                      </Text>

                      {run.last_message_preview ? (
                        <Text className="mt-1 text-[12px] text-muted-foreground" numberOfLines={2}>
                          {run.last_message_preview}
                        </Text>
                      ) : null}

                      <View className="mt-2 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-1">
                          <Clock3 size={12} className="text-muted-foreground" />
                          <Text className="text-[11px] text-muted-foreground">{formatTime(run.updated_at)}</Text>
                        </View>
                        <Text className="text-[11px] text-muted-foreground">{run.selected_model ?? "-"}</Text>
                      </View>
                    </TouchableOpacity>

                    <View className="absolute right-2 top-2 h-9 w-9 items-center justify-center">
                      <TouchableOpacity
                        className="h-9 w-9 items-center justify-center rounded-full"
                        accessibilityRole="button"
                        accessibilityLabel={t("pages.sync.menu.runActionsTitle")}
                        onPress={(event) => openRunMenu(run, event)}
                      >
                        <EllipsisVertical size={16} className="text-muted-foreground" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Animated.View>

      <AnchoredMenu
        visible={Boolean(runMenuTarget)}
        anchor={runMenuAnchor}
        onClose={closeRunMenu}
        title={t("pages.sync.menu.runActionsTitle")}
        items={runMenuItems}
      />
    </View>
  );
}
