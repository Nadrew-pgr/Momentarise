import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useInbox, useCreateCapture, useProcessCapture } from "@/hooks/use-inbox";
import { useItemDetailSheet } from "@/lib/store";

export default function InboxScreen() {
  const { t } = useTranslation();
  const [newCaptureText, setNewCaptureText] = useState("");
  const [processingCaptureId, setProcessingCaptureId] = useState<string | null>(null);
  const [processingTitle, setProcessingTitle] = useState("");

  const { data: inboxData, isLoading } = useInbox();
  const createCapture = useCreateCapture();
  const processCapture = useProcessCapture();
  const { open: openItemDetail } = useItemDetailSheet();

  const captures = inboxData?.captures ?? [];

  const handleAddCapture = useCallback(() => {
    const text = newCaptureText.trim();
    if (!text) return;
    createCapture.mutate(
      { raw_content: text },
      { onSuccess: () => setNewCaptureText("") }
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
          openItemDetail(res.item_id);
          setProcessingCaptureId(null);
          setProcessingTitle("");
        },
      }
    );
  }, [processingCaptureId, processingTitle, processCapture, openItemDetail]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
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
            className="rounded-lg bg-primary px-4 justify-center"
          >
            <Text className="text-primary-foreground font-medium">{t("pages.inbox.add")}</Text>
          </Pressable>
        </View>

        {captures.length === 0 ? (
          <Text className="text-muted-foreground py-8 text-center text-sm">
            {t("pages.inbox.emptyList")}
          </Text>
        ) : (
          <FlatList
            data={captures}
            keyExtractor={(c) => c.id}
            renderItem={({ item: c }) => (
              <View className="mb-3 rounded-lg border border-border bg-card p-3">
                <Text className="text-foreground text-sm" numberOfLines={3}>
                  {c.raw_content}
                </Text>
                {processingCaptureId === c.id ? (
                  <View className="mt-2 gap-2">
                    <TextInput
                      className="rounded border border-input bg-background px-2 py-1.5 text-foreground text-sm"
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
                        <Text className="text-primary-foreground text-sm font-medium">
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
                        <Text className="text-muted-foreground text-sm">{t("pages.inbox.cancel")}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleStartProcess(c.id)}
                    className="mt-2"
                  >
                    <Text className="text-primary text-sm font-medium">
                      {t("pages.inbox.process")}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
