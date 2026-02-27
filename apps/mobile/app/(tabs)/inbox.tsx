import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  useApplyCapture,
  useCreateCapture,
  useInbox,
  usePreviewCapture,
  useProcessCapture,
} from "@/hooks/use-inbox";
import { useItems } from "@/hooks/use-item";

export default function InboxScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [newCaptureText, setNewCaptureText] = useState("");
  const [processingCaptureId, setProcessingCaptureId] = useState<string | null>(null);
  const [processingTitle, setProcessingTitle] = useState("");

  const { data: inboxData, isLoading } = useInbox();
  const { data: itemsData, isLoading: itemsLoading } = useItems();
  const createCapture = useCreateCapture();
  const processCapture = useProcessCapture();
  const previewCapture = usePreviewCapture();
  const applyCapture = useApplyCapture();
  const [previewByCaptureId, setPreviewByCaptureId] = useState<
    Record<string, { suggested_title: string; suggested_kind: string; reason: string }>
  >({});

  const captures = inboxData?.captures ?? [];
  const items = itemsData?.items ?? [];

  const handleAddCapture = useCallback(() => {
    const text = newCaptureText.trim();
    if (!text) return;
    createCapture.mutate(
      {
        raw_content: text,
        capture_type: "text",
        status: "captured",
        source: "manual",
        metadata: { source: "mobile_inbox_text" },
      },
      { onSuccess: () => setNewCaptureText("") }
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
          router.push(`/items/${res.item_id}`);
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
            router.push(`/items/${res.item_id}`);
          },
        }
      );
    },
    [applyCapture, previewByCaptureId, router]
  );

  const listFooter = useMemo(() => {
    return (
      <View className="mt-4 border-t border-border pt-4">
        <Text className="mb-2 text-sm font-semibold text-foreground">
          {t("pages.inbox.recentItems")}
        </Text>
        {itemsLoading ? (
          <Text className="text-muted-foreground text-sm">{t("pages.inbox.placeholder")}</Text>
        ) : items.length === 0 ? (
          <Text className="text-muted-foreground text-sm">{t("pages.inbox.emptyItems")}</Text>
        ) : (
          <View className="gap-2">
            {items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/items/${item.id}`)}
                className="rounded-lg border border-border bg-card px-3 py-2"
              >
                <Text className="text-foreground text-sm font-medium" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className="text-muted-foreground mt-0.5 text-xs">
                  {new Date(item.updated_at).toLocaleString()}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  }, [items, itemsLoading, router, t]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        className="flex-1"
      >
        <Pressable className="flex-1" onPress={Keyboard.dismiss}>
          <View className="flex-1 gap-4 p-4">
            <Text className="text-xl font-bold text-foreground">{t("pages.inbox.title")}</Text>

            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                placeholder={t("pages.inbox.addPlaceholder")}
                placeholderTextColor="#71717a"
                value={newCaptureText}
                onChangeText={setNewCaptureText}
                onSubmitEditing={handleAddCapture}
              />
              <Pressable
                onPress={handleAddCapture}
                disabled={!newCaptureText.trim() || createCapture.isPending}
                className="justify-center rounded-lg bg-primary px-4"
              >
                <Text className="font-medium text-primary-foreground">{t("pages.inbox.add")}</Text>
              </Pressable>
            </View>

            <FlatList
              data={captures}
              keyExtractor={(capture) => capture.id}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text className="py-8 text-center text-sm text-muted-foreground">
                  {t("pages.inbox.emptyList")}
                </Text>
              }
              ListFooterComponent={listFooter}
              renderItem={({ item: capture }) => (
                <View className="mb-3 rounded-lg border border-border bg-card p-3">
                  <View className="mb-1 flex-row items-center justify-between">
                    <Text className="text-xs uppercase text-muted-foreground">{capture.capture_type}</Text>
                    <Text className="text-xs text-muted-foreground">{capture.status}</Text>
                  </View>
                  <Text className="text-sm text-foreground" numberOfLines={3}>
                    {capture.raw_content || t("pages.inbox.emptyCapture")}
                  </Text>
                  {previewByCaptureId[capture.id] ? (
                    <View className="mt-2 rounded border border-border bg-background p-2">
                      <Text className="text-xs font-medium text-foreground">
                        {previewByCaptureId[capture.id].suggested_title} (
                        {previewByCaptureId[capture.id].suggested_kind})
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {previewByCaptureId[capture.id].reason}
                      </Text>
                    </View>
                  ) : null}
                  {processingCaptureId === capture.id ? (
                    <View className="mt-2 gap-2">
                      <TextInput
                        className="rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                        placeholder={t("pages.inbox.processTitle")}
                        placeholderTextColor="#71717a"
                        value={processingTitle}
                        onChangeText={setProcessingTitle}
                      />
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={handleSubmitProcess}
                          disabled={!processingTitle.trim() || processCapture.isPending}
                          className="rounded bg-primary px-3 py-1.5"
                        >
                          <Text className="text-sm font-medium text-primary-foreground">
                            {t("pages.inbox.processSubmit")}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setProcessingCaptureId(null);
                            setProcessingTitle("");
                          }}
                          className="rounded border border-input px-3 py-1.5"
                        >
                          <Text className="text-sm text-muted-foreground">{t("pages.inbox.cancel")}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View className="mt-2 flex-row flex-wrap gap-2">
                      <Pressable
                        onPress={() => handlePreview(capture.id)}
                        className="rounded border border-input px-2.5 py-1.5"
                      >
                        <Text className="text-xs font-medium text-foreground">
                          {t("pages.inbox.preview")}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleApply(capture.id)}
                        className="rounded bg-primary px-2.5 py-1.5"
                      >
                        <Text className="text-xs font-medium text-primary-foreground">
                          {t("pages.inbox.apply")}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleStartProcess(capture.id)}
                        className="rounded border border-input px-2.5 py-1.5"
                      >
                        <Text className="text-xs font-medium text-foreground">
                          {t("pages.inbox.process")}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            />
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
