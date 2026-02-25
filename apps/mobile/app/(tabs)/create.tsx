import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCreateCapture } from "@/hooks/use-inbox";

export default function CreateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const createCapture = useCreateCapture();
  const [rawContent, setRawContent] = useState("");

  const handleCreate = () => {
    const text = rawContent.trim();
    if (!text) return;
    createCapture.mutate(
      { raw_content: text },
      {
        onSuccess: () => {
          setRawContent("");
          router.replace("/(tabs)/inbox");
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        className="flex-1"
      >
        <Pressable className="flex-1 p-4" onPress={Keyboard.dismiss}>
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-foreground">{t("create.title")}</Text>
            <Pressable
              onPress={() => router.replace("/(tabs)/inbox")}
              className="rounded border border-input px-3 py-1.5"
            >
              <Text className="text-xs text-muted-foreground">{t("pages.inbox.cancel")}</Text>
            </Pressable>
          </View>
          <Text className="mt-1 text-sm text-muted-foreground">
            {t("create.placeholder")}
          </Text>

          <View className="mt-4 flex-1 rounded-lg border border-input bg-card p-3">
            <TextInput
              multiline
              value={rawContent}
              onChangeText={setRawContent}
              placeholder={t("pages.inbox.addPlaceholder")}
              placeholderTextColor="#71717a"
              className="flex-1 text-foreground"
              textAlignVertical="top"
            />
          </View>

          <Pressable
            onPress={handleCreate}
            disabled={!rawContent.trim() || createCapture.isPending}
            className="mt-4 items-center rounded-lg bg-primary px-4 py-3"
          >
            <Text className="font-medium text-primary-foreground">
              {t("pages.inbox.add")}
            </Text>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
