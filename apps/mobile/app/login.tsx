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
import { loginSchema } from "@momentarise/shared";
import { login } from "@/lib/auth";
import { useAuthStore } from "@/lib/store";
import { GoogleIcon, AppleIcon, GitHubIcon } from "@/components/icons/BrandIcons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text as UiText } from "@/components/ui/text";

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(t("auth.invalidCredentials"));
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      setAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.invalidCredentials"));
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
              <UiText className="text-3xl font-bold text-foreground">{t("common.appName")}</UiText>
              <UiText className="mt-2 text-muted-foreground">{t("auth.loginDescription")}</UiText>
            </View>

            <View className="gap-4">
              <View>
                <UiText className="mb-1 text-sm font-medium text-foreground">
                  {t("auth.email")}
                </UiText>
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
                <UiText className="mb-1 text-sm font-medium text-foreground">
                  {t("auth.password")}
                </UiText>
                <Input
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  editable={!loading}
                />
              </View>

              {error ? (
                <UiText className="text-center text-sm text-destructive">{error}</UiText>
              ) : null}

              <Button onPress={handleSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <UiText>{t("auth.submit")}</UiText>
                )}
              </Button>

              <View className="my-4 flex-row items-center">
                <View className="flex-1 border-t border-border" />
                <UiText className="mx-4 text-sm text-muted-foreground">
                  {t("auth.continueWith")}
                </UiText>
                <View className="flex-1 border-t border-border" />
              </View>

              {(
                [
                  { key: "Google", icon: <GoogleIcon size={18} /> },
                  { key: "Apple", icon: <AppleIcon size={18} color="#a3a3a3" /> },
                  { key: "GitHub", icon: <GitHubIcon size={18} color="#a3a3a3" /> },
                ] as const
              ).map(({ key, icon }) => (
                <TouchableOpacity
                  key={key}
                  className="flex-row items-center justify-center gap-3 rounded-lg border border-input py-3 opacity-50"
                  disabled
                >
                  {icon}
                  <UiText className="text-sm text-muted-foreground">
                    {t(`auth.continueWith${key}`)}
                  </UiText>
                </TouchableOpacity>
              ))}

              <View className="mt-4 flex-row justify-center">
                <UiText className="text-sm text-muted-foreground">
                  {t("auth.noAccount")}{" "}
                </UiText>
                <TouchableOpacity onPress={() => router.push("/signup")}>
                  <UiText className="text-sm font-medium text-foreground underline">
                    {t("auth.signUp")}
                  </UiText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
