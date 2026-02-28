import { useState } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { signupSchema } from "@momentarise/shared";
import { signup } from "@/lib/auth";
import { useAuthStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Text as UiText } from "@/components/ui/text";

export default function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed = signupSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(t("auth.invalidCredentials"));
      return;
    }
    setLoading(true);
    try {
      await signup(email.trim().toLowerCase(), password);
      setAuthenticated(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already exists")) {
        setError(t("auth.emailExists"));
      } else {
        setError(msg || t("auth.invalidCredentials"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 72 : 0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="mx-auto w-full max-w-md gap-6">
            <View className="items-center">
              <UiText className="text-3xl font-bold text-foreground">{t("auth.signUpTitle")}</UiText>
              <UiText className="mt-2 text-muted-foreground">{t("auth.signUpDescription")}</UiText>
            </View>

            <Card className="rounded-2xl border border-border bg-card">
              <CardContent className="gap-4 p-5">
              <View>
                <UiText className="mb-1 text-sm font-medium text-foreground">{t("auth.email")}</UiText>
                <Input
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!loading}
                />
              </View>

              <View>
                <UiText className="mb-1 text-sm font-medium text-foreground">{t("auth.password")}</UiText>
                <Input
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="new-password"
                  editable={!loading}
                />
              </View>

              {error ? (
                <UiText className="text-center text-sm text-destructive">{error}</UiText>
              ) : null}

              <Button
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="white" /> : <UiText>{t("auth.signUpSubmit")}</UiText>}
              </Button>

              <View className="mt-4 flex-row justify-center">
                <UiText className="text-sm text-muted-foreground">{t("auth.hasAccount")} </UiText>
                <TouchableOpacity onPress={() => router.back()}>
                  <UiText className="text-sm font-medium text-foreground underline">
                    {t("auth.signIn")}
                  </UiText>
                </TouchableOpacity>
              </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
